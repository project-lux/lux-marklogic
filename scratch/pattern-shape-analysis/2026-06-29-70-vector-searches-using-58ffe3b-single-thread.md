## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 70 tests)](#aggregate-full-70-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 70-test union](#pattern-shapes--70-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - `similar` (n=70, avg 0.6×, max 1.8×)](#shape-1---similar-n70-avg-06-max-18)

# Input

Source: `scratch/pattern-shape-analysis/2026-06-29-70-vector-searches-using-58ffe3b-single-thread.json`
- baseline: `2026-06-29-optic-vector` (2026-06-29T16:41:39.904Z)
- current:  `2026-06-29-optic-58ffe3b-70-vector-searches-single-thread` (2026-06-30T03:35:58.568Z)
- generated: 2026-06-30T03:40:30.487Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 70 distinct tests**.
- The middle of the 70-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 70.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **0 tests with ≥10× regression**.

# Aggregate (full 70 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 4988.63 ms | 4652.11 ms | **+-7%** |
| p50 | 4740 ms | 5172.5 ms | +9% |
| p90 | 6569.8 ms | 6862.2 ms | +4% |
| p95 | 7014.5 ms | 7015.9 ms | +0% |
| p99 | 7347.42 ms | 7295.31 ms | +-1% |
| p99.9 | 7401.94 ms | 7482.23 ms | **+1%** |
| Pass rate | 38.6% | 100.0% | 61.4 |

# Severity distribution

Bucketed counts across the 70-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 0 | |
| Moderate (3–10×) | 0 | |
| Mild (<3×) | 70 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 70-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---similar-n70-avg-06-max-18) | `similar` | [AnnTopK](/src/main/ml-modules/root/lib/search/patterns/AnnTopK.mjs) | 70 | agent,concept,event,item,place,set,work | 2626–30022 | 1280–7503 | 0.6× | 1.8× |

Total: 70 tests across 1 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - `similar` (n=70, avg 0.6×, max 1.8×)

- Patterns: [AnnTopK](/src/main/ml-modules/root/lib/search/patterns/AnnTopK.mjs)
- Scopes: agent, concept, event, item, place, set, work
- Baseline range: 2626–30022 ms; current range: 1280–7503 ms
- Ratio: avg 0.6×, max 1.8×

Worst 5 of 70:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| manual 48 | place | 2760 | 5039 | 1.8× | PASS |
| manual 47 | place | 3320 | 5740 | 1.7× | PASS |
| manual 43 | place | 3522 | 5256 | 1.5× | PASS |
| manual 49 | place | 2626 | 3862 | 1.5× | PASS |
| manual 37 | concept | 4086 | 5559 | 1.4× | PASS |

Example criteria (test `manual 48`):

```json
{
  "_scope": "place",
  "similar": "https://lux.collections.yale.edu/data/place/867187b0-b46e-4146-8443-f8a04a735b56"
}
```
