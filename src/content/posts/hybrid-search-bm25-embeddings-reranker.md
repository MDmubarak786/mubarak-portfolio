---
title: "Hybrid search: BM25 plus embeddings plus a reranker, and how to measure it"
description: "Why keyword search still earns a place, how reciprocal rank fusion merges it with embeddings, what rerankers cost, and an eval harness to run on your own data."
date: 2026-10-10T01:37:00Z
tags: ["hybrid search", "BM25", "reranking"]
pillar: building
sources:
  - title: "Thakur et al.: BEIR benchmark (arXiv abstract)"
    url: "https://arxiv.org/abs/2104.08663"
  - title: "Elastic Search Labs: Improving information retrieval in the Elastic Stack, hybrid retrieval"
    url: "https://www.elastic.co/search-labs/blog/improving-information-retrieval-elastic-stack-hybrid"
  - title: "Elasticsearch docs: reciprocal rank fusion (formula, rank_constant, retriever syntax)"
    url: "https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion"
  - title: "Cohere docs: Rerank overview (models, Python call, response shape)"
    url: "https://docs.cohere.com/docs/rerank-overview"
  - title: "Cohere pricing (search unit definition, Rerank Model Vault rates)"
    url: "https://cohere.com/pricing"
  - title: "Voyage AI: rerank-2.5 and rerank-2.5-lite (32K context, instruction following; vendor claims)"
    url: "https://blog.voyageai.com/2025/08/11/rerank-2-5/"
  - title: "rank_bm25 on GitHub (BM25Okapi usage, no preprocessing)"
    url: "https://github.com/dorianbrown/rank_bm25"
  - title: "Milvus docs: hybrid search (dense plus sparse, RRF ranker)"
    url: "https://milvus.io/docs/multi-vector-search.md"
draft: false
---

Embeddings alone miss the query that contains an exact product code, an error string or a person's name. Keyword search alone misses the paraphrase. Hybrid search runs both and fuses the lists, and a reranker then reads the shortlist properly. I have not run a benchmark for this post, so what follows is what vendors and papers report, plus a harness that produces the numbers on your data.

## Why does lexical search still matter?

The BEIR benchmark paper, which tested retrieval models zero-shot across heterogeneous datasets, said it in its abstract: "BM25 is a robust baseline", re-ranking and late-interaction models achieved the best average zero-shot results "however, at high computational costs", and dense and sparse retrieval models were cheaper but often trailed. That was 2021, and I found no 2026 source arguing for dropping lexical retrieval; the argument is for combining it.

The practical reasons are mundane. BM25 matches rare tokens exactly, needs no model and no GPU, and fails in ways you can explain. Embeddings match meaning, survive paraphrase and cross-language queries, and fail in ways you cannot easily inspect. The failures overlap less than the successes do, and that is what fusion exploits.

## What does fusion buy you?

Elastic's Search Labs post is the clearest measurement I found, with caveats. Fusing BM25 with ELSER (Elastic's learned sparse model, not a dense embedding) using reciprocal rank fusion raised average NDCG@10 on BEIR by 1.4% over ELSER alone and by 18% over BM25 alone. It was "better or similar" to BM25 alone on every test dataset. The authors argue the two retrievers are complementary: combining them helps when relevant documents are more likely to be retrieved by both than irrelevant ones, and they report overlap measurements supporting that. This is a vendor measuring its own stack, with a sparse model, so treat the size of the gain as a hypothesis for your corpus.

The constants are less sacred than they look. Elastic's post says the original RRF paper suggests k = 60, and the Elasticsearch docs default `rank_constant` to 60. Elastic's own experiment found k = 20 with the top 1,000 per retriever best for its setup, and put the gap between best and worst parameter combinations at about 5%. The docs' own phrase is that "RRF requires no tuning."

### How does reciprocal rank fusion work?

Each document scores 1 / (k + rank) in every list it appears in, with ranks starting at 1, and the scores add. A document missing from a list contributes nothing for it. No score normalisation is needed, which is why it is the default merge: BM25 scores and cosine similarities live on different scales.

A worked example with k = 60. Document A is first in BM25 and fifth by embedding: 1/61 + 1/65 = 0.01639 + 0.01538 = 0.03177. Document B is second in both: 2/62 = 0.03226. B wins. Document C is first in BM25 and absent from the dense top 50: 1/61 = 0.01639, less than half of either. RRF rewards agreement over a single strong vote, which is usually what you want and occasionally not (an exact SKU match you needed at rank one can be pushed down). If that bites, give the lexical list a weight, or run a rule-based exact-match check before fusion.

## Do I need a reranker?

A reranker takes the fused shortlist and scores each query-document pair jointly, which is more accurate than comparing two separately computed vectors and slower. BEIR's "high computational costs" is that trade. The usual shape is: retrieve 50 to 100 candidates cheaply, rerank, send the top five to ten to the model.

What exists in October 2026:

- **Cohere.** The Rerank overview lists `rerank-v4.0-pro` and `rerank-v4.0-fast`, plus `rerank-v3.5` and the 3.0 English and multilingual models, trained "for performance across 100+ languages". The Python call is `co.rerank(model=..., query=..., documents=..., top_n=...)` on a `cohere.ClientV2()` client; the response carries a list of `results`, each with an `index` into your input list and a `relevance_score`.
- **Voyage AI.** `rerank-2.5` and `rerank-2.5-lite` have a 32K-token context and accept natural-language instructions in the query. Voyage's launch post claims 7.94% and 7.16% accuracy gains over Cohere's older `rerank-v3.5` on its own 93-dataset suite. That is a vendor comparison against a previous-generation competitor, so it does not settle Cohere 4 versus Voyage 2.5.
- **Open weights.** 2026 roundups I found list Qwen3-Reranker and BGE-reranker-v2-m3 as the most-cited self-hostable options. Those were secondary sources, some from companies that host the models, and I did not verify their numbers. Check licences before shipping.

Cost is where the details bite. Cohere's pricing page defines a search unit as "one query with up to 100 documents to be ranked", and says documents longer than 500 tokens (counting the query) are split into chunks that each count as a separate document. The page does not list a per-search rate for the managed API; it lists dedicated-instance Model Vault rates ($5.00 an hour for a medium Rerank 4 Pro or Fast instance) instead. If I read the chunking rule correctly, a shortlist of 100 passages of 800 tokens would count as roughly two units, not one. That is an argument for chunks under 500 tokens, which the previous post on chunking arrived at from the other direction.

## What it means for people shipping products

Order the work by cost of regret. First, add BM25 beside your embeddings and fuse with RRF; it is a few lines and no new vendor. Second, measure. Third, add a reranker only if the measurement shows the right passage in your top 50 but not your top 5, because that is the gap a reranker closes. If the right passage is not in the top 50, no reranker can help; fix chunking or the first stage.

If you use a database that does it natively, use it. Elasticsearch has an `rrf` retriever that takes a standard query and a kNN retriever, with `rank_window_size` and `rank_constant`. Milvus documents `hybrid_search` over a dense `FLOAT_VECTOR` field and a sparse `SPARSE_FLOAT_VECTOR` field with an RRF ranker. In Postgres you would fuse in SQL or in application code.

## Hands-on: a harness for four systems

You need your documents and 50 to 100 queries with the ids of the documents that answer them. The harness scores BM25, dense, RRF and RRF plus rerank by recall@10 and mean reciprocal rank. BM25 comes from `rank_bm25`, whose README notes that it does no preprocessing, so you tokenise documents and queries identically. Pass in your own `embed` function (a list of strings to a list of vectors), such as the OpenAI or Gemini calls from the chunking post.

```python
import math
import re
from collections import defaultdict

import cohere
from rank_bm25 import BM25Okapi

co = cohere.ClientV2()

def tok(s):
    return re.findall(r"\w+", s.lower())

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))

class Corpus:
    def __init__(self, docs, embed):
        self.docs, self.embed = docs, embed
        self.bm25 = BM25Okapi([tok(d) for d in docs])
        self.vecs = embed(docs)

    def lexical(self, q, n=50):
        s = self.bm25.get_scores(tok(q))
        return sorted(range(len(self.docs)), key=lambda i: -s[i])[:n]

    def dense(self, q, n=50):
        qv = self.embed([q])[0]
        return sorted(range(len(self.docs)), key=lambda i: -cosine(self.vecs[i], qv))[:n]

def rrf(rankings, k=60, n=50):
    score = defaultdict(float)
    for ranking in rankings:
        for rank, doc in enumerate(ranking, start=1):
            score[doc] += 1.0 / (k + rank)
    return sorted(score, key=score.get, reverse=True)[:n]

def rerank(corpus, q, candidates, top_n=10):
    r = co.rerank(model="rerank-v4.0-pro", query=q,
                  documents=[corpus.docs[i] for i in candidates], top_n=top_n)
    return [candidates[x.index] for x in r.results]

def evaluate(systems, labelled, k=10):
    """labelled: list of (query, set_of_relevant_doc_ids)."""
    out = {}
    for name, fn in systems.items():
        hits = rr = 0.0
        for q, gold in labelled:
            ranked = fn(q)[:k]
            hits += len(gold & set(ranked)) / len(gold)
            rr += next((1 / (i + 1) for i, d in enumerate(ranked) if d in gold), 0.0)
        out[name] = (round(hits / len(labelled), 3), round(rr / len(labelled), 3))
    return out

c = Corpus(DOCS, embed=EMBED)
systems = {
    "bm25":       lambda q: c.lexical(q),
    "dense":      lambda q: c.dense(q),
    "rrf":        lambda q: rrf([c.lexical(q), c.dense(q)]),
    "rrf+rerank": lambda q: rerank(c, q, rrf([c.lexical(q), c.dense(q)])),
}
print(evaluate(systems, LABELLED))   # {system: (recall@10, MRR)}
```

`DOCS` is a list of passage strings, `EMBED` your embedding function and `LABELLED` your query and gold-id pairs. The reranker call uses the model name and parameters from Cohere's Rerank overview; swap in another vendor behind the same `rerank` function. The brute-force loops are fine for a few thousand documents and the pure-Python tokeniser is deliberately crude.

Read the four rows against each other. If `rrf` beats both single retrievers, keep it. If `rrf+rerank` lifts MRR but barely moves recall@10, the reranker is only reordering, which matters when you pass few passages to the model and less when you pass many. Then work out what the lift costs per query with the search-unit rule above before you commit.

Run it again whenever you change chunking or the embedding model, and add a query slice for identifiers and rare terms, because that is where BM25 earns its place.

## Takeaways

- BM25 is still a component of a good retrieval stack: cheap, exact on rare tokens, explainable, and a robust baseline in the BEIR paper.
- Fuse with reciprocal rank fusion; k = 60 is the documented default, and Elastic's own run found k = 20 best for its setup, with a spread of about 5% between settings.
- Elastic reports +18% NDCG@10 over BM25 and +1.4% over ELSER for fusion. That is a vendor's benchmark of a sparse model; test your own.
- Add a reranker only if the right passage is in your top 50 but not your top 5, and keep candidate passages under 500 tokens to avoid multiplied search units on Cohere.
- Measure four systems on 50 to 100 labelled queries before choosing; the harness above is the whole job.

The next piece in the series moves from retrieval to evaluation: the smallest eval harness a product team can run before building agents.
