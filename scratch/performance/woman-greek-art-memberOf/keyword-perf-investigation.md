# Keyword Search Pattern Performance Investigation

## Status: In Progress (started 2026-05-27)

## Context
Comparing Optic-based search engine performance against the former CTS implementation. Functional parity confirmed; investigating the performance gap.

## Critical Finding: prepare() was inflating Optic warm benchmarks
- All theory scripts A-L called `plan.prepare(1)` before `.result()`, adding ~140ms per warm run.
- Production code does NOT call `prepare()` — MarkLogic caches optimized plans automatically.
- **Corrected warm results**: Optic 32-37ms vs CTS 93-98ms — **Optic is 2.7× faster warm**.
- The warm-run gap is solved. **Cold-start (3,928ms vs 662ms = 5.8×) is the sole remaining problem.**
- New scripts omit `prepare()`. Existing theory scripts A-L are not being revised.

## Test Query
Three AND'd keyword terms ("woman", "greek", "art") in `item` scope. The production test also includes a `memberOf` criterion (different pattern) but it's excluded from isolated testing — not believed to account for much of the gap.

Scripts: `scratch/performance/woman-greek-art-memberOf/`

## Benchmark Results (MarkLogic 12.0.1, cache-cleared, quiet system)

**Note:** All Optic warm numbers below include ~140ms `prepare(1)` inflation (see finding above). Corrected warm is ~140ms lower for each.

| Approach | First run (cold) | Warm avg (with prepare) | Script |
|---|---|---|---|
| CTS baseline | 662-682ms | 93-98ms | cts-benchmark-no-memberOf.js |
| Optic baseline (fromSearch full query) | 3,928-4,297ms | 178-203ms (32-37 corrected) | baseline-optic-full.js |
| Optic where() only (no scoring) | 3,990ms | 128ms | theory-A |
| Optic non-semantic only (fromSearch) | 407ms | 136ms | theory-B |
| Optic capped 500 IRIs (fromSearch) | 3,464ms | 136ms | theory-C |
| Optic ≈ Theory B (semantic joins unused) | 403ms | 134ms | theory-D |
| Phase timing (single cold run) | 4,292ms total | — | theory-E |
| Split where+fromSearch (OR scoring) | 4,310ms | 282ms | theory-F |
| Split where+fromSearch (AND scoring) | 4,134ms | 202ms | theory-G |
| No dataType constraint | 4,070ms | — | theory-H |
| No dataType + no iri column | 3,923ms | — | theory-I |
| Late-bind dataType | 3,988ms | — | theory-J |
| Scope-specific dataType lexicon | 4,024ms | — | theory-K |
| fromSearch drives joinInner | 3,937ms | — | theory-L |

### Phase timing breakdown (Theory E, single cold run)
- IRI resolution: 134ms (woman=11,670, greek=2,456, art=34,987 — total 49,113)
- Plan build: 38ms
- Prepare: 3,818ms
- Execute: 302ms

### Warm-run analysis — RESOLVED
- With `prepare()` removed, Optic warm (32-37ms) beats CTS (93-98ms) by 2.7×.
- The earlier 86ms "Optic overhead" was almost entirely `prepare()` re-optimization.
- **No further warm-run optimization needed.**

### Cold-start gap: 5.8× — PRIMARY FOCUS
From Theory H-L firstRun data (best cold improvements vs 4,043ms baseline):
- Theory I (no iri, no dataType): 3,923ms (−120ms, 3%)
- Theory L (fromSearch drives): 3,937ms (−106ms)
- Theory J (late-bind): 3,988ms (−55ms)
- Theory K (scope-specific): 4,024ms (−19ms, noise)
- Theory H (no constraint): 4,070ms (+27ms, noise)
Plan structure changes barely dent cold-start — the 3.8s is dominated by optimizer processing 49K IRI literals.

## Key Findings
1. **Warm-run performance is solved.** Optic is faster than CTS warm (29-37ms vs 93-98ms).
2. **Cold-start gap (5.8×) is 97% plan optimization cost** processing 49K IRI literals in the CTS query embedded in the Optic plan AST. Not IRI resolution (131ms) — it's the optimizer traversing the plan.
3. **Theory M disproved**: Lazy Sequence vs Array makes no difference — `cts.tripleRangeQuery` eagerly materializes all values into the plan AST regardless.
4. **Theory D confirmed**: Removing tripleRangeQuery entirely → cold drops to 267ms (14× faster, actually faster than CTS 662ms). The semantic fromTriples joins were never wired in, so this is non-semantic only.
5. **Admin permissions**: ~100ms cold, ~5ms warm — negligible factor.
6. **Phase timing without prepare()**: Optimization cost shifts from explicit `prepare()` into implicit optimization inside `.result()`. Total cold unchanged (~4s). Plan cache makes subsequent warm calls fast.
7. **Cold is the real-world metric**: Diverse keyword queries each produce unique plans. Plan cache likely can't retain them all under production load.
8. **Most promising direction**: fromTriples architecture (Theory D style) that avoids embedding IRIs in the plan AST while preserving semantic recall via OR semantics.

## Candidate Optimizations (documented in lux-optic-primer.md)

| # | Idea | Applies to AND+scores? | Status |
|---|---|---|---|
| 1 | where() when scores not needed | No (scores needed) | Ready — path exists |
| 2 | Combine OR'd keywords into single pattern | No (AND'd keywords) | Idea |
| 3 | Remove/reduce redundant dataType constraint | **Yes** | Needs investigation |
| 4 | Reduce IRI payload | Non-starter | Closed |
| 5 | Remove unused `iri` column from fromLexicons | **Yes** | Idea |
| 6 | Analyze optimized plan (XML) for join strategies | **Yes** | Complete — plan analyzed |
| 7 | Use scope-specific dataType lexicons | **Yes** | Tested — no gain (Theory K) |
| 8 | op.param for non-CTS plan parameters | Partial | Idea — needs ML 12.1 for CTS params |
| 9 | Lazy IRI resolution (Sequence not Array) | **Yes** | Tested — no gain (Theory M) |
| 10 | fromTriples architecture (avoid IRIs in plan AST) | **Yes** | Most promising — needs Theory N |

## Actual Plan Analysis (WGA-actual-plan.xml, 2026-05-28)

### Optimizer's execution structure (reading bottom-up):

```
project(id, type, score)           — final column rename
  limit(20)
    project(id, type, score)
      bind(type←dataType, id←uri)
        order-by(score DESC)
          group(sort-group by uri)   — groupBy(['uri']) with sample(uri), sample(dataType), max(score)
            sort(uri ASC)            — pre-sort for sort-group
              scatter-join           ← TOP JOIN: lexicon side ⋈ fromSearch side
                ├── from-search      — CTS query (est 10,105 rows), produces fragmentId + score
                └── scatter-join     ← LEXICON CHAIN
                      ├── lexicon-index(dataType, frag)  — anyDataTypeName with filter: dataType IN ('DigitalObject','HumanMadeObject')
                      └── hash-join(frag=frag)
                            ├── lexicon-index(frag)      — iri reference (cast-to-IRI=true), fragment only
                            └── lexicon-index(uri, frag)  — iri reference (cast-to-IRI=false) + value
```

### Key observations from the plan:

1. **Join strategy**: The optimizer chose scatter-join for the top-level fromSearch ⋈ lexicon join, and scatter-join + hash-join for the lexicon chain. No bloom filters used.

2. **Cost breakdown** (estimated costs, not wall-clock):
   - from-search: cost=7,849 (est 10,105 rows, io-cost dominated by distributed)
   - dataType lexicon-index: cost=683 (est 52.36 rows after filter, io-cost includes 41.08 per-node)
   - iri lexicon-index (cast-to-IRI=true): cost=311 (est 52.36 rows)
   - uri+iri lexicon-index: cost=311 (est 52.36 rows, but cardinality 4.39e+07 = 43.9M unique values)
   - hash-join (iri⋈uri): cost=686
   - scatter-join (dataType⋈hash-join): cost=1,476
   - Top scatter-join: cost=25,585 — **dominates total plan cost**
   - Total plan: cost=39,009

3. **The `iri` column problem**: The optimizer SPLITS the iri reference into TWO lexicon-index scans:
   - One with `cast-to-IRI=true` producing only frag (used as the hash-join probe side)
   - One with `cast-to-IRI=false` producing uri+frag (the build side)
   - These are hash-joined on frag, THEN scatter-joined with the dataType lexicon
   - **The iri column is never projected into the output** — it's purely structural overhead.

4. **The dataType filter placement**: The optimizer pushes `op.in(dataType, [...])` down into a join-filter on the dataType lexicon-index. Good — it's not scanning all types. But it still scans the anyDataTypeName range index and joins it before the fromSearch results are available.

5. **Cardinality**: The uri+iri lexicon-index has cardinality 4.39e+07 (43.9M). Even though estimated output is 52.36 rows, the lexicon stores 43.9M values. The iri reference alone has ~43.9M entries. This is a massive scan even if most rows are filtered.

6. **from-search estimated count**: 10,105 matching fragments — this is the CTS query selectivity. The `cts.andQuery` of three `cts.orQuery(fieldWordQuery, tripleRangeQuery)` terms matches ~10K docs.

### Datatype constraint findings (2026-05-28):
User tested with the empty-groups query (single keyword "fish" with OR):
- With joinInner + dataType constraint on inner plan: 9.3s cold / 6.5s warm
- Without joinInner, dataType constraint as where() on outer: 1.35s cold / 165ms warm
- **7x cold improvement, 39x warm improvement** — dramatic

### New theory scripts created (2026-05-28):
- Theory H: Remove dataType constraint only (keep iri column)
- Theory I: Remove dataType constraint AND iri column
- Theory J: Late-bind dataType via second fromLexicons after filtering/scoring
- Theory K: Use scope-specific dataType lexicon (itemDataTypeName instead of anyDataTypeName)

### Notes on optimizer claims to verify:
- Optic supposedly doesn't tap lexicons that are specified but unused — Theory I tests this (removes iri column explicitly)
- Larger lexicons should perform comparably to smaller scope-specific ones — Theory K tests this

## Next Steps

### 1. Get actual cold+hot Optic plans (XML)
- Compare plan costs/structure between cold and hot execution
- Determine if optimizer costs correlate with wall-clock cold-start
- Check if plan metadata reveals where the 3.8s is spent (plan AST traversal vs CTS query analysis)

### 2. Theory N: fromTriples with semantic OR (wired in)
- Theory D proved the cold benefit of not embedding IRIs (267ms)
- Need a variant that preserves semantic recall: per keyword, OR of (fieldWordQuery matches) UNION (fromTriples semantic matches)
- Key design: `op.fromTriples(pattern).where(cts.fieldWordQuery('referenceName', term))` pushes keyword matching into the triple scan — optimizer resolves via indexes without pre-materializing IRIs

### 3. Lukewarm testing approach
- Diverse query rotation script: 20-50 different keyword queries in sequence
- Interleaved benchmarking: test query → N unrelated queries → test query again
- Selective cache clearing: `xdmp.programCacheClear()` only (skip tree caches for index-only queries)

## Files
- Theory scripts A-L + M in `scratch/performance/woman-greek-art-memberOf/`
- Benchmark templates: `scratch/performance/TEMPLATE-cts-benchmark.js`, `TEMPLATE-optic-benchmark.js`
- `docs/lux-optic-primer.md` — candidate optimizations section

## Preliminary Analysis of Real-World Performance Context

### Benchmark extremes vs reality
- Cold (cache-cleared): 4,104ms Optic vs 682ms CTS — worst case, rarely hit
- Hot (10th identical iteration): 179ms vs 93ms — best case, rarely this warm
- Serialized 5K test: 4,634ms Optic vs 810ms CTS — closest to real-world "lukewarm" caches

### System resource observations from 5K test suggest I/O and cache-efficiency problem, not compute
- CPU 85-95% idle — not CPU-bound
- Free memory drops 20GB → 7GB — caches filling but under eviction pressure
- Triple cache miss spikes (220 misses/sec) correlate with page-in spikes (53K pages/sec)
- Each keyword query's tripleRangeQuery with 49K IRIs hammers the triple cache; under serialized load, cache entries get evicted between diverse queries

### Implications for optimization focus
- The 43ms warm tripleRangeQuery overhead (179ms vs 136ms) likely balloons under real load as triple cache can't stay hot across diverse queries
- Cold prepare() cost (3,818ms) is more relevant than hot benchmarks suggest — each distinct query pattern may pay significant prepare penalty
- Customer threshold of <100ms tolerance is generous — even matching CTS serialized performance (810ms) would be a win
- The 4,634ms vs 810ms serialized gap (5.7x) aligns with the 6x cold-start gap measured in isolation
- Recommended focus: optimize for "lukewarm" operating point, not just hot-cache microbenchmarks

## Key Source Files for Implementation
- `src/main/ml-modules/root/lib/search/patterns/Keyword.mjs` — the keyword pattern
- `src/main/ml-modules/root/lib/search/engine.mjs` — plan assembly, assemblePlan(), createPlanAccumulator()
- `src/main/ml-modules/root/lib/searchScope.mjs` — scope → fields, predicates, types
- `docs/lux-optic-primer.md` — comprehensive primer including candidate optimizations
