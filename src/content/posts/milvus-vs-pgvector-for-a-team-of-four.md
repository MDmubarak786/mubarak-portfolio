---
title: "Milvus vs pgvector for a team of four"
description: "Milvus or pgvector? Index types, filtering behaviour, the 2,000-dimension index limit and the operational footprint, read from both projects' own docs."
date: 2026-10-10T01:36:00Z
tags: ["Milvus", "pgvector", "vector database"]
pillar: building
sources:
  - title: "pgvector README (v0.8.7: index types, dimension limits, filtering, iterative scans)"
    url: "https://github.com/pgvector/pgvector"
  - title: "Milvus docs home (v3.0.x, install and quickstart links)"
    url: "https://milvus.io/docs"
  - title: "Milvus docs: index explained (index types, memory examples, filter-ratio guidance)"
    url: "https://milvus.io/docs/index-explained.md"
  - title: "Milvus docs: architecture overview (coordinator, workers, etcd, object storage, WAL)"
    url: "https://milvus.io/docs/architecture_overview.md"
  - title: "Milvus docs: run Milvus in Docker (standalone container, ports, files)"
    url: "https://milvus.io/docs/install_standalone-docker.md"
  - title: "Milvus docs: quickstart (MilvusClient, Milvus Lite, filtered search)"
    url: "https://milvus.io/docs/quickstart.md"
  - title: "Milvus docs: hybrid search (dense and sparse vectors, RRF ranker)"
    url: "https://milvus.io/docs/multi-vector-search.md"
draft: false
---

If you already run Postgres, adding pgvector is one extension. If you start with Milvus, you are adopting a second stateful system. For a team of four, that difference matters more than any benchmark chart. I have used Milvus (it is in my stack); for pgvector I am reporting what its README says, and for both I have read the docs current on 10 October 2026.

## What are the two things, structurally?

pgvector is a Postgres extension. The README's current release is 0.8.7, with two index types, HNSW and IVFFlat, and vector columns that live in ordinary tables next to your other data. Backup, replication and access control are whatever you already do for Postgres.

Milvus is a database of its own. The docs home lists v3.0.x as the latest line, ahead of v2.6.x, v2.5.x and v2.4.x. The architecture page describes stateless proxies, one active coordinator, and three kinds of worker (streaming, query and data nodes). It names three dependencies: etcd for metadata, object storage (MinIO, AWS S3 or Azure Blob) for index and log files, and a write-ahead log on Kafka, Pulsar or Woodpecker. The design is "fully disaggregated storage and compute."

You do not have to run that cluster to start. The Docker install page starts a single `milvus-standalone` container with embedded etcd and Woodpecker writing to the local filesystem; its ports are 19530 for the service, 2379 for etcd and 9091 for the web UI. The quickstart also shows Milvus Lite, a Python library inside `pymilvus` that stores data in a local file, and says all modes share one API. Check the docs for what Lite leaves out before treating it as a stand-in for a server.

## Which index types do I get?

pgvector gives you two. HNSW (defaults `m = 16`, `ef_construction = 64`, query-time `hnsw.ef_search = 40`) and IVFFlat (a `lists` build option, with `rows / 1000` recommended up to a million rows, and `ivfflat.probes` at query time, default 1).

Milvus's index page lists, for float vectors, FLAT, IVF_FLAT, IVF_SQ8, IVF_PQ, IVF_RABITQ, HNSW with SQ, PQ and PRQ variants, DISKANN, SCANN and several GPU indexes, plus a sparse inverted index. Its decision guide is blunt: if raw data fits in memory, use HNSW or IVF with refinement; if it lives on SSD, DiskANN is "optimal for latency-sensitive queries"; with limited RAM, IVF_PQ or IVF_SQ8 with mmap. Those are options you simply do not have inside Postgres.

## The dimension limit that catches people

pgvector stores `vector` columns up to 16,000 dimensions, but HNSW and IVFFlat index only up to 2,000. `halfvec` indexes up to 4,000, `bit` up to 64,000, and `sparsevec` up to 1,000 non-zero elements (HNSW only).

Now look at the embedding defaults. OpenAI's `text-embedding-3-large` and Google's `gemini-embedding-2` both default to 3,072 dimensions. A raw `vector(3072)` column will store but not index, so you either shorten the embedding (both vendors expose a parameter for it: `dimensions` on OpenAI, `output_dimensionality` on Gemini), or you use `halfvec`. Pick this before you embed a million documents, not after. I did not find an equivalent cliff on Milvus's index page, but check its docs for per-field limits.

## How does filtering behave?

This is where I would test first, because production queries are almost never "nearest neighbours of everything."

pgvector's README is explicit: "With approximate indexes, filtering is applied _after_ the index is scanned." At the default `ef_search` of 40, a condition matching 10% of rows returns about four rows on average. Three documented fixes:

- Iterative index scans (since 0.8.0): `SET hnsw.iterative_scan = relaxed_order;` keeps scanning until it has enough matches, bounded by `hnsw.max_scan_tuples` (default 20,000). `strict_order` guarantees distance order and `relaxed_order` trades a little ordering for recall.
- Partial indexes, `CREATE INDEX ... WHERE (category_id = 123)`, for a few hot filter values.
- Partitioning, `PARTITION BY LIST(category_id)`, when the filter is a tenant or category id.

Milvus filters in the search call, and its index guide keys its advice to the "filter ratio": graph-based indexes below 85%, IVF variants from 85 to 95%, FLAT above roughly 95%, with the caveat that these "are not always correct" and you should tune. The filter is part of the engine, but you still pick the index with the filter in mind.

For a multi-tenant product, the pgvector route is partition-per-tenant or partial indexes, which is workable for tens of tenants and awkward for thousands. I would test that shape before choosing.

## What does memory look like?

The Milvus index page works a 1M-vector, 128-dimension example: raw FP32 vectors are 512 MB; HNSW with graph degree 32 adds a 128 MB graph, 640 MB total; IVF_FLAT is 515 MB, IVF_SQ8 131 MB and IVF_PQ 11 MB without refinement. SQ8 is described as a 75% memory cut, PQ as 4 to 32x compression.

Scale that to a 1,536-dimension model. Raw FP32 is 1,000,000 × 1,536 × 4 bytes, about 6.1 GB, and the graph is still about 128 MB, so an in-memory HNSW index is roughly 6.3 GB per million vectors. That is my arithmetic from the page's numbers, not a measurement. It is the same order of memory you will want for any HNSW index, in Postgres or elsewhere, so size the box from the vector count before you pick a product.

## What about hybrid search?

Milvus has a documented path: `hybrid_search` runs several `AnnSearchRequest`s (for example a dense `FLOAT_VECTOR` field and a sparse `SPARSE_FLOAT_VECTOR` field holding BM25-style vectors) and merges them with an RRF ranker. pgvector has `sparsevec`, but the README describes no built-in fusion, so you would fuse in SQL or application code. The next post covers how to do that.

## What would I pick for four people?

Scale rules of thumb floating around are secondary and disagree: I saw pgvector's ceiling placed anywhere between a few million and 100 million vectors, and Milvus's sweet spot at 10 million, 50 million or "hundreds of millions". Treat all of them as noise and benchmark your own filters.

My default, as a design argument rather than an experience report: start on pgvector if you already run Postgres, your vectors fit comfortably in memory, and your filters are simple. Move to Milvus when you need an index the extension does not have (DiskANN, quantised HNSW, GPU), native dense and sparse fusion, or growth that makes a dedicated vector tier worth a second system's on-call load. The decision is mostly about operations: who restores etcd and object storage at 2 a.m.?

## Hands-on: the same query in both

pgvector, with the iterative scan from the README so a tenant filter does not starve the result:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  id        bigserial PRIMARY KEY,
  tenant_id int,
  body      text,
  embedding vector(1536)           -- 3072-dim models need halfvec or a shortened embedding
);

CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

SET hnsw.iterative_scan = relaxed_order;

SELECT id, body
FROM chunks
WHERE tenant_id = 42
ORDER BY embedding <=> $1          -- cosine distance
LIMIT 5;
```

Milvus, in the shape the quickstart uses (a local file for Milvus Lite; swap in `uri="http://localhost:19530"` plus a token for a server):

```python
from pymilvus import MilvusClient

client = MilvusClient("milvus_demo.db")
client.create_collection(collection_name="chunks", dimension=1536)

client.insert(collection_name="chunks", data=[
    {"id": 1, "vector": vec, "body": "...", "tenant_id": 42},   # extra keys are stored as fields
])

hits = client.search(
    collection_name="chunks",
    data=[query_vec],
    filter="tenant_id == 42",
    limit=5,
    output_fields=["body"],
)
```

Run both against a sample of your real data, with your real filter selectivity, and compare recall at five against a brute-force baseline before you compare latency.

## Takeaways

- pgvector is one extension on a database you already run; Milvus is a database with etcd, object storage and a write-ahead log behind it, though a single Docker container gets you started.
- Check the dimension limit: pgvector indexes `vector` up to 2,000 dimensions, while two major embedding APIs default to 3,072.
- Test filtered queries first. pgvector filters after the index scan unless you use iterative scans, partial indexes or partitions.
- Size memory from vectors times dimensions times four bytes, plus graph overhead, whichever database holds them.
- Ignore published vector-count thresholds; benchmark your own filters and recall.

Once the store is chosen, the next post covers what to put in front of it: BM25, embeddings and a reranker.
