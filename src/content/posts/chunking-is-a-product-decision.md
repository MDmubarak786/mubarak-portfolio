---
title: "Chunking is a product decision: sizes, overlap and the cost per query"
description: "Chunk size sets what the model reads, what you store and what each query costs. The evidence on size and overlap, a priced table, and a harness to test your own."
date: 2026-10-10T01:35:00Z
tags: ["RAG", "chunking", "embeddings"]
pillar: building
sources:
  - title: "OpenAI docs: embeddings guide (models, 8192-token input, dimensions)"
    url: "https://developers.openai.com/api/docs/guides/embeddings"
  - title: "Gemini API docs: embeddings (gemini-embedding-2, limits, output dimensionality)"
    url: "https://ai.google.dev/gemini-api/docs/embeddings"
  - title: "Gemini API pricing (gemini-embedding-2 standard and batch)"
    url: "https://ai.google.dev/gemini-api/docs/pricing"
  - title: "Chroma technical report: Evaluating Chunking Strategies for Retrieval (July 2024)"
    url: "https://www.trychroma.com/research/evaluating-chunking"
  - title: "Shaukat et al.: A Systematic Investigation of Document Chunking Strategies and Embedding Sensitivity (arXiv, March 2026)"
    url: "https://arxiv.org/abs/2603.06976"
  - title: "Claude docs: pricing (Sonnet 5.5 input rate)"
    url: "https://platform.claude.com/docs/en/about-claude/pricing"
draft: false
---

Most RAG tutorials pick a chunk size in one line of code and move on. That number decides how many vectors you store, how many tokens the model reads on every query, and whether the right sentence lands in the context at all. As of 10 October 2026 the embedding limits are loose enough that the API never forces your hand, which means chunking is a decision you make, not a constraint you obey.

## Do embedding limits tell me how big a chunk should be?

No. They only tell you the ceiling. OpenAI's embeddings guide lists `text-embedding-3-small` (1,536 dimensions) and `text-embedding-3-large` (3,072), both with an 8,192-token maximum input, and gives no chunking guidance beyond that limit. Google's guide lists `gemini-embedding-2` at 8,192 tokens and the older text-only `gemini-embedding-001` at 2,048, with output dimensions from 128 to 3,072 (default 3,072) through `output_dimensionality`. Its only advice on splitting concerns video: chunk it into overlapping segments.

Price is the other constraint that is not binding. OpenAI's page does not state a per-million rate; it gives pages per dollar at roughly 800 tokens a page, 62,500 for `text-embedding-3-small`, which works out to about $0.02 per million tokens (my derivation, not a figure from the page). Google's pricing page lists `gemini-embedding-2` at $0.20 per million input tokens, $0.10 on the Batch API. Embedding a ten-million-token corpus costs a few dollars either way.

So the ceiling is high and the embedding bill is small. What chunk size really controls is retrieval quality, index size and per-query prompt cost.

## What does the evidence say about size and overlap?

Two sources, with different methods and different ages.

Chroma's July 2024 technical report scored chunkers at the token level over five corpora (472 queries, about 328,000 tokens in total) with `text-embedding-3-large` and five chunks retrieved per query. Its findings:

- The OpenAI Assistants default of 800-token chunks with 400 overlap scored among the lowest on precision, precision-omega and IoU.
- Recall did not climb with chunk size. A recursive splitter at 200 tokens with no overlap scored recall 88.1 and precision 7.0; at 400 with no overlap, recall 89.5.
- Overlap was not a clean win. For `all-MiniLM-L6-v2` at 250 tokens, removing a 125-token overlap dropped recall from 82.4 to 77.1. On the metric that penalises redundancy (IoU), removing overlap helped.
- The best recall came from smarter splitting: a cluster-based semantic chunker at 400 tokens reached 91.3, an LLM chunker 91.9. The authors note the LLM chunker can take tens of minutes to run.

A March 2026 arXiv paper tested 36 segmentation methods across six domains and five embedding models. Its top method, paragraph-group chunking, reached a mean nDCG@5 of about 0.459, while simple fixed-size character chunking stayed below 0.244. Dynamic token sizing worked best for biology, physics and health; paragraph grouping worked best for legal and maths. Larger embedding models scored higher overall but still degraded with poor segmentation.

I would not compare numbers across the two: different metrics, corpora and models. The common thread is that structure-aware splitting beats blind fixed windows, the best setting depends on the domain, and a default taken from a library or a vendor's assistant product is a starting point only. Overlap helps small chunks and costs you duplicates; test it, do not assume it.

## What does chunk size cost per query?

Take a ten-million-token corpus, retrieve five chunks per query, and price the retrieved context at Sonnet 5.5's $2 per million input tokens. Storage assumes 1,536-dimension float32 vectors, 6,144 bytes each, before any index overhead. Embedding assumes $0.20 per million tokens.

| Chunk / overlap (tokens) | Chunks | Embedding cost | Raw vectors | Context per query | Sonnet 5.5 input per query |
|---|---|---|---|---|---|
| 100 / 0 | 100,000 | $2.00 | 614 MB | 500 | $0.0010 |
| 200 / 0 | 50,000 | $2.00 | 307 MB | 1,000 | $0.0020 |
| 200 / 50 | 66,667 | $2.67 | 410 MB | 1,000 | $0.0020 |
| 400 / 0 | 25,000 | $2.00 | 154 MB | 2,000 | $0.0040 |
| 800 / 0 | 12,500 | $2.00 | 77 MB | 4,000 | $0.0080 |
| 800 / 400 | 25,000 | $4.00 | 154 MB | 4,000 | $0.0080 |

Two things stand out. The embedding column barely moves, even with 50% overlap, because overlap doubles a bill that was already a few dollars. The last column is the one that scales: at 10,000 queries a day the 800-token rows cost $80 a day in retrieved context against $20 for 200 tokens, and that is before output. Chunk size is a unit-economics lever on every request, which is why it is a product decision and not a preprocessing detail.

The table also shows why "just retrieve more" is not free. Halving the chunk size and doubling `k` leaves the prompt cost unchanged but changes what you retrieve: more distinct passages, less surrounding context in each.

## What this means for people shipping products

My rule is to start from the shape of the question, not the shape of the tokenizer. Reference lookups (policies, prices, FAQs) want small, self-contained chunks. Explanations and procedures want whole sections, because the answer is the section. If your content has headings, FAQ entries or product records, split on those first and only fall back to fixed windows inside a section that is too long.

Keep a parent pointer on every chunk (document id and section) so that you can expand a retrieved chunk to its section at answer time. That gives you small chunks for matching and large context for reading, and it makes the cost-per-query table above a tunable instead of a trade-off.

If your content is multilingual, run the harness below per language rather than assuming one size fits all. That is a design argument, not a result I measured.

## Hands-on: measure your own corpus

You need a text file and 50 to 100 questions, each with the character span of the passage that answers it. Chroma's report generated those with an LLM and required excerpts to match the source exactly; do the same, then check a sample by hand. The harness scores each configuration by the share of the gold span that appears in the top five chunks (recall) and the share of retrieved characters that were gold (precision). It uses `client.embeddings.create` from the OpenAI embeddings guide; check the docs for per-request input limits.

```python
import math
import re
from openai import OpenAI

client = OpenAI()
MODEL = "text-embedding-3-small"

def split(text, size, overlap):
    """Fixed windows over whitespace-separated words; returns (start_char, end_char) spans.
    Swap in your real tokenizer: words are only a rough proxy for tokens."""
    words = [(m.start(), m.end()) for m in re.finditer(r"\S+", text)]
    step = max(1, size - overlap)
    spans = []
    for i in range(0, len(words), step):
        window = words[i:i + size]
        spans.append((window[0][0], window[-1][1]))
        if i + size >= len(words):
            break
    return spans

def embed(texts, batch=256):
    out = []
    for i in range(0, len(texts), batch):
        r = client.embeddings.create(input=texts[i:i + batch], model=MODEL)
        out += [d.embedding for d in r.data]
    return out

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))

def covered(gold, spans):
    g0, g1 = gold
    hit = set()
    for s0, s1 in spans:
        hit.update(range(max(s0, g0), min(s1, g1)))
    return len(hit)

def run(text, queries, size, overlap, k=5):
    """queries: list of (question, (gold_start_char, gold_end_char))."""
    spans = split(text, size, overlap)
    chunk_vecs = embed([text[a:b] for a, b in spans])
    query_vecs = embed([q for q, _ in queries])
    recall, precision, retrieved = [], [], []
    for qv, (_, gold) in zip(query_vecs, queries):
        ranked = sorted(range(len(spans)), key=lambda j: -cosine(chunk_vecs[j], qv))[:k]
        got = [spans[j] for j in ranked]
        cov, total = covered(gold, got), sum(b - a for a, b in got)
        recall.append(cov / (gold[1] - gold[0]))
        precision.append(cov / total)
        retrieved.append(total)
    n = len(queries)
    return {"size": size, "overlap": overlap, "chunks": len(spans),
            "recall": sum(recall) / n, "precision": sum(precision) / n,
            "avg_retrieved_chars": sum(retrieved) / n}

for size, overlap in [(100, 0), (200, 0), (200, 50), (400, 0), (800, 0), (800, 400)]:
    print(run(TEXT, QUERIES, size, overlap))
```

`TEXT` is your corpus as one string and `QUERIES` is your list of question and gold-span pairs. The brute-force cosine loop is fine for a few thousand chunks; past that, use a vector index.

Read the output as a frontier, not a winner. For each configuration, convert `avg_retrieved_chars` to tokens with your own tokenizer and multiply by your model's input price to get the cost-per-query column from the table. Pick the cheapest configuration whose recall you can live with, and rerun after every change of embedding model, since the 2026 paper's finding is that segmentation and embedding quality interact.

## Takeaways

- Embedding limits (8,192 tokens on both vendors' current models) are a ceiling, not advice. Neither guide tells you what size to use.
- The published evidence agrees on direction, not on numbers: structure-aware splitting beats blind fixed windows, and a default like 800/400 can score worst.
- Overlap multiplies the embedding bill, which is small, and the duplicate content in results, which is not. Treat it as a hypothesis to test.
- Chunk size times `k` is your per-query prompt cost. Price it before you pick it.
- Build the 50-question harness before you build the pipeline. It takes an afternoon and answers the question for your corpus.

The next piece in this series, Milvus versus pgvector for a small team, covers where those vectors live once you have decided how many of them there are.
