## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 11182 tests)](#aggregate-full-11182-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 141-test union](#pattern-shapes--141-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - OR(`aboutConcept`, `classification`, `language`) (n=56, avg 4.6×, max 6.2×)](#shape-1---oraboutconcept-classification-language-n56-avg-46-max-62)
  - [Shape 2 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=11, avg 14.7×, max 53.7×)](#shape-2---orcreatedby-creationinfluencedby-publishedby-n11-avg-147-max-537)
  - [Shape 3 - `memberOf` (n=3, avg 53.5×, max 129.2×)](#shape-3---memberof-n3-avg-535-max-1292)
  - [Shape 4 - `carries` (n=16, avg 9.5×, max 38.8×)](#shape-4---carries-n16-avg-95-max-388)
  - [Shape 5 - `classification` (n=2, avg 61.2×, max 99.5×)](#shape-5---classification-n2-avg-612-max-995)
  - [Shape 6 - `gender` (n=1, avg 94.5×, max 94.5×)](#shape-6---gender-n1-avg-945-max-945)
  - [Shape 7 - AND(`aboutConcept`, `aboutPlace`) (n=8, avg 11.4×, max 32.8×)](#shape-7---andaboutconcept-aboutplace-n8-avg-114-max-328)
  - [Shape 8 - AND(`aboutConcept`) (n=10, avg 5.2×, max 13.1×)](#shape-8---andaboutconcept-n10-avg-52-max-131)
  - [Shape 9 - single `text` keyword (n=7, avg 5.5×, max 6.4×)](#shape-9---single-text-keyword-n7-avg-55-max-64)
  - [Shape 10 - AND(`aboutWork`) (n=3, avg 11×, max 16.5×)](#shape-10---andaboutwork-n3-avg-11-max-165)
  - [Shape 11 - multi-`text` AND (n=5, avg 5.7×, max 6.8×)](#shape-11---multi-text-and-n5-avg-57-max-68)
  - [Shape 12 - OR(`classification`, `material`) (n=1, avg 25.3×, max 25.3×)](#shape-12---orclassification-material-n1-avg-253-max-253)
  - [Shape 13 - OR(`memberOf`) (n=1, avg 20.6×, max 20.6×)](#shape-13---ormemberof-n1-avg-206-max-206)
  - [Shape 14 - AND(`aboutAgent`, `aboutConcept`, `aboutPlace`) (n=1, avg 9.2×, max 9.2×)](#shape-14---andaboutagent-aboutconcept-aboutplace-n1-avg-92-max-92)
  - [Shape 15 - AND(`classification`) (n=1, avg 6.1×, max 6.1×)](#shape-15---andclassification-n1-avg-61-max-61)
  - [Shape 16 - AND(`aboutConcept`, `aboutEvent`) (n=3, avg 1.7×, max 3.5×)](#shape-16---andaboutconcept-aboutevent-n3-avg-17-max-35)
  - [Shape 17 - AND(`?`) (n=1, avg 2.7×, max 2.7×)](#shape-17---and-n1-avg-27-max-27)
  - [Shape 18 - `aboutAgent` (n=1, avg 2.6×, max 2.6×)](#shape-18---aboutagent-n1-avg-26-max-26)
  - [Shape 19 - `aboutPlace` (n=2, avg 0.9×, max 0.9×)](#shape-19---aboutplace-n2-avg-09-max-09)
  - [Shape 20 - AND(`aboutAgent`) (n=2, avg 0.9×, max 0.9×)](#shape-20---andaboutagent-n2-avg-09-max-09)
  - [Shape 21 - `influencedByConcept` (n=1, avg 1.4×, max 1.4×)](#shape-21---influencedbyconcept-n1-avg-14-max-14)
  - [Shape 22 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.9×, max 0.9×)](#shape-22---andaboutagent-aboutconcept-n1-avg-09-max-09)
  - [Shape 23 - `activeAt` (n=1, avg 0.8×, max 0.8×)](#shape-23---activeat-n1-avg-08-max-08)
  - [Shape 24 - `startAt` (n=1, avg 0.8×, max 0.8×)](#shape-24---startat-n1-avg-08-max-08)
  - [Shape 25 - OR(`encounteredAt`, `producedAt`) (n=1, avg 0.8×, max 0.8×)](#shape-25---orencounteredat-producedat-n1-avg-08-max-08)
  - [Shape 26 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=1, avg 0.7×, max 0.7×)](#shape-26---andaboutconcept-aboutevent-aboutplace-n1-avg-07-max-07)

# Input

Source: `scratch/performance/2026-06-25-cts-v-optic-9acd007-10k-3-single-thread.json`
- baseline: `2026-06-25-cts-10k-3-single-thread` (2026-06-25T19:19:31.296Z)
- current:  `2026-06-25-optic-9acd007-10k-3-single-thread` (2026-06-25T18:35:36.115Z)
- generated: 2026-06-25T19:55:00.003Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 141 distinct tests**.
- The middle of the 11182-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 11182.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **28 tests with ≥10× regression**.

# Aggregate (full 11182 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 39.67 ms | 137.1 ms | **+246%** |
| p50 | 34 ms | 124 ms | +265% |
| p90 | 49 ms | 136 ms | +178% |
| p95 | 56 ms | 157 ms | +180% |
| p99 | 123 ms | 469.1 ms | +281% |
| p99.9 | 192.64 ms | 1356.76 ms | **+604%** |
| Pass rate | 99.2% | 99.2% | 0.0 |

# Severity distribution

Bucketed counts across the 141-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 28 | |
| Moderate (3–10×) | 69 | |
| Mild (<3×) | 44 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 141-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---oraboutconcept-classification-language-n56-avg-46-max-62) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 56 | work | 111–319 | 188–889 | 4.6× | 6.2× |
| [2](#shape-2---orcreatedby-creationinfluencedby-publishedby-n11-avg-147-max-537) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 11 | work | 35–171 | 124–1879 | 14.7× | 53.7× |
| [3](#shape-3---memberof-n3-avg-535-max-1292) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | item | 83–167 | 204–16147 | 53.5× | 129.2× |
| [4](#shape-4---carries-n16-avg-95-max-388) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 16 | item | 32–258 | 118–1241 | 9.5× | 38.8× |
| [5](#shape-5---classification-n2-avg-612-max-995) | `classification` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | agent | 58–90 | 1324–8955 | 61.2× | 99.5× |
| [6](#shape-6---gender-n1-avg-945-max-945) | `gender` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 94–94 | 8887 | 94.5× | 94.5× |
| [7](#shape-7---andaboutconcept-aboutplace-n8-avg-114-max-328) | AND(`aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 8 | work | 35–169 | 116–1605 | 11.4× | 32.8× |
| [8](#shape-8---andaboutconcept-n10-avg-52-max-131) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 10 | work | 40–169 | 113–533 | 5.2× | 13.1× |
| [9](#shape-9---single-text-keyword-n7-avg-55-max-64) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 7 | item | 133–216 | 313–1360 | 5.5× | 6.4× |
| [10](#shape-10---andaboutwork-n3-avg-11-max-165) | AND(`aboutWork`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 31–165 | 121–513 | 11× | 16.5× |
| [11](#shape-11---multi-text-and-n5-avg-57-max-68) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item,place,work | 186–922 | 1103–5429 | 5.7× | 6.8× |
| [12](#shape-12---orclassification-material-n1-avg-253-max-253) | OR(`classification`, `material`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 76–76 | 1924 | 25.3× | 25.3× |
| [13](#shape-13---ormemberof-n1-avg-206-max-206) | OR(`memberOf`) | `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs) | 1 | multi | 33–33 | 681 | 20.6× | 20.6× |
| [14](#shape-14---andaboutagent-aboutconcept-aboutplace-n1-avg-92-max-92) | AND(`aboutAgent`, `aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 57–57 | 524 | 9.2× | 9.2× |
| [15](#shape-15---andclassification-n1-avg-61-max-61) | AND(`classification`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 124–124 | 751 | 6.1× | 6.1× |
| [16](#shape-16---andaboutconcept-aboutevent-n3-avg-17-max-35) | AND(`aboutConcept`, `aboutEvent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 133–175 | 119–496 | 1.7× | 3.5× |
| [17](#shape-17---and-n1-avg-27-max-27) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 1683–1683 | 4605 | 2.7× | 2.7× |
| [18](#shape-18---aboutagent-n1-avg-26-max-26) | `aboutAgent` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 139–139 | 365 | 2.6× | 2.6× |
| [19](#shape-19---aboutplace-n2-avg-09-max-09) | `aboutPlace` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 131–136 | 120–122 | 0.9× | 0.9× |
| [20](#shape-20---andaboutagent-n2-avg-09-max-09) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 134–134 | 120–125 | 0.9× | 0.9× |
| [21](#shape-21---influencedbyconcept-n1-avg-14-max-14) | `influencedByConcept` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | concept | 169–169 | 241 | 1.4× | 1.4× |
| [22](#shape-22---andaboutagent-aboutconcept-n1-avg-09-max-09) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 140–140 | 125 | 0.9× | 0.9× |
| [23](#shape-23---activeat-n1-avg-08-max-08) | `activeAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 160–160 | 126 | 0.8× | 0.8× |
| [24](#shape-24---startat-n1-avg-08-max-08) | `startAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 159–159 | 123 | 0.8× | 0.8× |
| [25](#shape-25---orencounteredat-producedat-n1-avg-08-max-08) | OR(`encounteredAt`, `producedAt`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 145–145 | 122 | 0.8× | 0.8× |
| [26](#shape-26---andaboutconcept-aboutevent-aboutplace-n1-avg-07-max-07) | AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 173–173 | 124 | 0.7× | 0.7× |

Total: 141 tests across 26 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - OR(`aboutConcept`, `classification`, `language`) (n=56, avg 4.6×, max 6.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 111–319 ms; current range: 188–889 ms
- Ratio: avg 4.6×, max 6.2×

Worst 5 of 56:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3785 | work | 144 | 889 | 6.2× | PASS |
| Backend log test 9916 | work | 129 | 797 | 6.2× | PASS |
| Backend log test 9465 | work | 123 | 752 | 6.1× | — |
| Backend log test 9663 | work | 152 | 863 | 5.7× | PASS |
| Backend log test 8330 | work | 149 | 837 | 5.6× | PASS |

Example criteria (test `Backend log test 3785`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "classification": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/6cba0ac4-2629-40b3-acae-f5788645b53f"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/6cba0ac4-2629-40b3-acae-f5788645b53f"
            }
          }
        ]
      }
    },
    {
      "language": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/6cba0ac4-2629-40b3-acae-f5788645b53f"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/6cba0ac4-2629-40b3-acae-f5788645b53f"
            }
          }
        ]
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/6cba0ac4-2629-40b3-acae-f5788645b53f"
      }
    }
  ]
}
```

## Shape 2 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=11, avg 14.7×, max 53.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 35–171 ms; current range: 124–1879 ms
- Ratio: avg 14.7×, max 53.7×

Worst 5 of 11:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5667 | work | 35 | 1879 | 53.7× | — |
| Backend log test 5669 | work | 36 | 1481 | 41.1× | — |
| Backend log test 463 | work | 36 | 790 | 21.9× | — |
| Backend log test 9655 | work | 36 | 505 | 14× | — |
| Backend log test 10337 | work | 40 | 533 | 13.3× | — |

Example criteria (test `Backend log test 5667`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/48dfeabb-6c1d-4f35-b56d-4537211922c4"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/48dfeabb-6c1d-4f35-b56d-4537211922c4"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/48dfeabb-6c1d-4f35-b56d-4537211922c4"
      }
    }
  ]
}
```

## Shape 3 - `memberOf` (n=3, avg 53.5×, max 129.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 83–167 ms; current range: 204–16147 ms
- Ratio: avg 53.5×, max 129.2×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 462 | item | 125 | 16147 | 129.2× | — |
| Backend log test 4731 | item | 83 | 2500 | 30.1× | — |
| Backend log test 97 | item | 167 | 204 | 1.2× | PASS |

Example criteria (test `Backend log test 462`):

```json
{
  "_scope": "item",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/set/d1b8a867-8be7-4325-ad78-1f3abda76056"
  }
}
```

## Shape 4 - `carries` (n=16, avg 9.5×, max 38.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 32–258 ms; current range: 118–1241 ms
- Ratio: avg 9.5×, max 38.8×

Worst 5 of 16:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5670 | item | 32 | 1241 | 38.8× | — |
| Backend log test 8183 | item | 32 | 535 | 16.7× | — |
| Backend log test 8185 | item | 32 | 510 | 15.9× | — |
| Backend log test 10800 | item | 32 | 508 | 15.9× | — |
| Backend log test 10153 | item | 32 | 501 | 15.7× | — |

Example criteria (test `Backend log test 5670`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/c1b92ad5-933b-4fbf-b7c0-d62ca41da7d8"
  }
}
```

## Shape 5 - `classification` (n=2, avg 61.2×, max 99.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 58–90 ms; current range: 1324–8955 ms
- Ratio: avg 61.2×, max 99.5×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8056 | agent | 90 | 8955 | 99.5× | — |
| Backend log test 9069 | agent | 58 | 1324 | 22.8× | — |

Example criteria (test `Backend log test 8056`):

```json
{
  "_scope": "agent",
  "classification": {
    "id": "https://lux.collections.yale.edu/data/concept/6f652917-4c07-4d51-8209-fcdd4f285343"
  }
}
```

## Shape 6 - `gender` (n=1, avg 94.5×, max 94.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 94–94 ms; current range: 8887–8887 ms
- Ratio: avg 94.5×, max 94.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8053 | agent | 94 | 8887 | 94.5× | — |

Example criteria (test `Backend log test 8053`):

```json
{
  "_scope": "agent",
  "gender": {
    "id": "https://lux.collections.yale.edu/data/concept/6f652917-4c07-4d51-8209-fcdd4f285343"
  }
}
```

## Shape 7 - AND(`aboutConcept`, `aboutPlace`) (n=8, avg 11.4×, max 32.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 35–169 ms; current range: 116–1605 ms
- Ratio: avg 11.4×, max 32.8×

Worst 5 of 8:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5668 | work | 49 | 1605 | 32.8× | — |
| Backend log test 5671 | work | 35 | 1042 | 29.8× | — |
| Backend log test 9236 | work | 59 | 518 | 8.8× | — |
| Backend log test 6145 | work | 56 | 489 | 8.7× | — |
| Backend log test 9696 | work | 57 | 488 | 8.6× | — |

Example criteria (test `Backend log test 5668`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/fc1b3328-116d-4ec8-a77d-4a09a442b72a"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/60784941-d8e2-431d-bffe-7b17339ff91d"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/46470225-632a-43b0-80d9-34d8e83df2cb"
      }
    }
  ]
}
```

## Shape 8 - AND(`aboutConcept`) (n=10, avg 5.2×, max 13.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 40–169 ms; current range: 113–533 ms
- Ratio: avg 5.2×, max 13.1×

Worst 5 of 10:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10284 | work | 40 | 522 | 13.1× | — |
| Backend log test 10218 | work | 42 | 533 | 12.7× | — |
| Backend log test 8182 | work | 44 | 512 | 11.6× | — |
| Backend log test 10343 | work | 52 | 503 | 9.7× | — |
| Backend log test 5911 | work | 134 | 116 | 0.9× | PASS |

Example criteria (test `Backend log test 10284`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/ba664da1-5d80-45f2-a67c-2c074b569424"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/254231e2-ee20-45c2-8b9b-624c74364aa6"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/7d61a912-41df-40c0-9826-5b3e45d62dbd"
      }
    }
  ]
}
```

## Shape 9 - single `text` keyword (n=7, avg 5.5×, max 6.4×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 133–216 ms; current range: 313–1360 ms
- Ratio: avg 5.5×, max 6.4×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 815 | item | 193 | 1236 | 6.4× | PASS |
| Backend log test 1270 | item | 189 | 1212 | 6.4× | PASS |
| Backend log test 4735 | item | 189 | 1210 | 6.4× | PASS |
| Backend log test 1692 | item | 216 | 1360 | 6.3× | PASS |
| Backend log test 567 | item | 198 | 1243 | 6.3× | PASS |

Example criteria (test `Backend log test 815`):

```json
{
  "_scope": "item",
  "text": "statue",
  "_lang": "en"
}
```

## Shape 10 - AND(`aboutWork`) (n=3, avg 11×, max 16.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 31–165 ms; current range: 121–513 ms
- Ratio: avg 11×, max 16.5×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9195 | work | 31 | 513 | 16.5× | — |
| Backend log test 9201 | work | 32 | 508 | 15.9× | — |
| Backend log test 10071 | work | 165 | 121 | 0.7× | PASS |

Example criteria (test `Backend log test 9195`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutWork": {
        "id": "https://lux.collections.yale.edu/data/text/cc5f2220-c588-47b8-8f0c-32c9de4562cf"
      }
    }
  ]
}
```

## Shape 11 - multi-`text` AND (n=5, avg 5.7×, max 6.8×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item, place, work
- Baseline range: 186–922 ms; current range: 1103–5429 ms
- Ratio: avg 5.7×, max 6.8×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4931 | item | 482 | 3272 | 6.8× | PASS |
| Backend log test 479 | item | 186 | 1255 | 6.7× | PASS |
| Backend log test 4933 | work | 922 | 5429 | 5.9× | PASS |
| Backend log test 5176 | place | 228 | 1103 | 4.8× | PASS |
| Backend log test 4225 | place | 378 | 1553 | 4.1× | PASS |

Example criteria (test `Backend log test 4931`):

```json
{
  "_scope": "item",
  "AND": [
    {
      "text": "Dura-Europos",
      "_lang": "en"
    },
    {
      "text": "synagogue",
      "_lang": "en"
    },
    {
      "text": "fresco",
      "_lang": "en"
    }
  ]
}
```

## Shape 12 - OR(`classification`, `material`) (n=1, avg 25.3×, max 25.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 76–76 ms; current range: 1924–1924 ms
- Ratio: avg 25.3×, max 25.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6374 | item | 76 | 1924 | 25.3× | — |

Example criteria (test `Backend log test 6374`):

```json
{
  "_scope": "item",
  "OR": [
    {
      "classification": {
        "id": "https://lux.collections.yale.edu/data/concept/8eede6bc-e29e-4bc7-a70c-dabdfbcdcf25"
      }
    },
    {
      "material": {
        "id": "https://lux.collections.yale.edu/data/concept/8eede6bc-e29e-4bc7-a70c-dabdfbcdcf25"
      }
    }
  ]
}
```

## Shape 13 - OR(`memberOf`) (n=1, avg 20.6×, max 20.6×)

- Patterns: `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs)
- Scopes: multi
- Baseline range: 33–33 ms; current range: 681–681 ms
- Ratio: avg 20.6×, max 20.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3 | multi | 33 | 681 | 20.6× | — |

Example criteria (test `Backend log test 3`):

```json
{
  "_scope": "multi",
  "OR": [
    {
      "memberOf": {
        "AND": [
          {
            "classification": {
              "identifier": "http://vocab.getty.edu/aat/300375748"
            }
          },
          {
            "containingSet": {
              "id": "https://lux.collections.yale.edu/data/set/e042c8ac-be03-488a-939a-ceb71a6fb8d1"
            }
          }
        ]
      }
    },
    {
      "memberOf": {
        "AND": [
          {
            "classification": {
              "identifier": "http://vocab.getty.edu/aat/300375748"
            }
          },
          {
            "containingSet": {
              "id": "https://lux.collections.yale.edu/data/set/e042c8ac-be03-488a-939a-ceb71a6fb8d1"
            }
          }
        ]
      }
    }
  ]
}
```

## Shape 14 - AND(`aboutAgent`, `aboutConcept`, `aboutPlace`) (n=1, avg 9.2×, max 9.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 57–57 ms; current range: 524–524 ms
- Ratio: avg 9.2×, max 9.2×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9232 | work | 57 | 524 | 9.2× | — |

Example criteria (test `Backend log test 9232`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/group/7e27701b-f2ae-4f06-ac21-f64f960bd55a"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/6e543579-8e16-40b3-a3a3-8c8c1f4b6400"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/2893111d-54a2-4ac5-bb4d-8bc23df4815f"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/e6a9d1f0-fbea-4cd6-a154-dbd159c4993e"
      }
    }
  ]
}
```

## Shape 15 - AND(`classification`) (n=1, avg 6.1×, max 6.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 124–124 ms; current range: 751–751 ms
- Ratio: avg 6.1×, max 6.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4705 | work | 124 | 751 | 6.1× | — |

Example criteria (test `Backend log test 4705`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "OR": [
        {
          "classification": {
            "OR": [
              {
                "id": "https://lux.collections.yale.edu/data/concept/d96b5be7-85ae-4ccf-89fd-e9643c9a558f"
              },
              {
                "influencedByConcept": {
                  "id": "https://lux.collections.yale.edu/data/concept/d96b5be7-85ae-4ccf-89fd-e9643c9a558f"
                }
              }
            ]
          }
        },
        {
          "language": {
            "OR": [
              {
                "id": "https://lux.collections.yale.edu/data/concept/d96b5be7-85ae-4ccf-89fd-e9643c9a558f"
              },
              {
                "influencedByConcept": {
                  "id": "https://lux.collections.yale.edu/data/concept/d96b5be7-85ae-4ccf-89fd-e9643c9a558f"
                }
              }
            ]
          }
        },
        {
          "aboutConcept": {
            "id": "https://lux.collections.yale.edu/data/concept/d96b5be7-85ae-4ccf-89fd-e9643c9a558f"
          }
        }
      ]
    },
    {
      "classification": {
        "id": "https://lux.collections.yale.edu/data/concept/496ff1f3-a70a-48bc-94b4-a36912b13c65"
      }
    }
  ]
}
```

## Shape 16 - AND(`aboutConcept`, `aboutEvent`) (n=3, avg 1.7×, max 3.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 133–175 ms; current range: 119–496 ms
- Ratio: avg 1.7×, max 3.5×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7403 | work | 140 | 496 | 3.5× | PASS |
| Backend log test 7257 | work | 133 | 119 | 0.9× | PASS |
| Backend log test 9940 | work | 175 | 121 | 0.7× | PASS |

Example criteria (test `Backend log test 7403`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/79ff6ead-0cb5-44f6-b4ea-e8d0f63f9a20"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/a531c521-ed34-4b3b-a53f-38fc02e85d50"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/6dcfa793-4dd2-44ec-bf73-f63c964aef8f"
      }
    }
  ]
}
```

## Shape 17 - AND(`?`) (n=1, avg 2.7×, max 2.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 1683–1683 ms; current range: 4605–4605 ms
- Ratio: avg 2.7×, max 2.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 1683 | 4605 | 2.7× | PASS |

Example criteria (test `Backend log test 110`):

```json
{
  "_scope": "item",
  "AND": [
    {
      "AND": [
        {
          "text": "woman",
          "_lang": "en"
        },
        {
          "text": "greek",
          "_lang": "en"
        },
        {
          "text": "art",
          "_lang": "en"
        }
      ]
    },
    {
      "AND": [
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/5e9b7f70-82d9-4f3e-8f72-ef5bf6b17d9e"
          }
        }
      ]
    }
  ]
}
```

## Shape 18 - `aboutAgent` (n=1, avg 2.6×, max 2.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 139–139 ms; current range: 365–365 ms
- Ratio: avg 2.6×, max 2.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1 | work | 139 | 365 | 2.6× | PASS |

Example criteria (test `Backend log test 1`):

```json
{
  "_scope": "work",
  "aboutAgent": {
    "id": "https://lux.collections.yale.edu/data/group/bf219a49-0005-40df-a1d7-402537e9b485"
  }
}
```

## Shape 19 - `aboutPlace` (n=2, avg 0.9×, max 0.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 131–136 ms; current range: 120–122 ms
- Ratio: avg 0.9×, max 0.9×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8232 | work | 136 | 122 | 0.9× | PASS |
| Backend log test 7136 | work | 131 | 120 | 0.9× | PASS |

Example criteria (test `Backend log test 8232`):

```json
{
  "_scope": "work",
  "aboutPlace": {
    "id": "https://lux.collections.yale.edu/data/place/94297471-329d-4786-acca-b3e56522a2c5"
  }
}
```

## Shape 20 - AND(`aboutAgent`) (n=2, avg 0.9×, max 0.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 134–134 ms; current range: 120–125 ms
- Ratio: avg 0.9×, max 0.9×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7067 | work | 134 | 120 | 0.9× | PASS |
| Backend log test 7606 | work | 134 | 125 | 0.9× | PASS |

Example criteria (test `Backend log test 7067`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/13ca3c90-83cd-46f6-ad8a-434d74e5d8fa"
      }
    }
  ]
}
```

## Shape 21 - `influencedByConcept` (n=1, avg 1.4×, max 1.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: concept
- Baseline range: 169–169 ms; current range: 241–241 ms
- Ratio: avg 1.4×, max 1.4×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9662 | concept | 169 | 241 | 1.4× | PASS |

Example criteria (test `Backend log test 9662`):

```json
{
  "_scope": "concept",
  "influencedByConcept": {
    "id": "https://lux.collections.yale.edu/data/concept/8b828bd8-afbc-4b21-b1e4-e10ff35c4d31"
  }
}
```

## Shape 22 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.9×, max 0.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 140–140 ms; current range: 125–125 ms
- Ratio: avg 0.9×, max 0.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7366 | work | 140 | 125 | 0.9× | PASS |

Example criteria (test `Backend log test 7366`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/group/af0aebd1-dba5-427b-a8a3-e169616952f6"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/bc0e243e-acc0-4ef2-81ad-adaf57792821"
      }
    }
  ]
}
```

## Shape 23 - `activeAt` (n=1, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 160–160 ms; current range: 126–126 ms
- Ratio: avg 0.8×, max 0.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9334 | agent | 160 | 126 | 0.8× | PASS |

Example criteria (test `Backend log test 9334`):

```json
{
  "_scope": "agent",
  "activeAt": {
    "id": "https://lux.collections.yale.edu/data/place/04370b96-352d-4cfb-8a9a-e470e7acb588"
  }
}
```

## Shape 24 - `startAt` (n=1, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 159–159 ms; current range: 123–123 ms
- Ratio: avg 0.8×, max 0.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9594 | agent | 159 | 123 | 0.8× | PASS |

Example criteria (test `Backend log test 9594`):

```json
{
  "_scope": "agent",
  "startAt": {
    "id": "https://lux.collections.yale.edu/data/place/d94a93e3-1e21-457c-92d3-21182885240b"
  }
}
```

## Shape 25 - OR(`encounteredAt`, `producedAt`) (n=1, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 145–145 ms; current range: 122–122 ms
- Ratio: avg 0.8×, max 0.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4001 | item | 145 | 122 | 0.8× | PASS |

Example criteria (test `Backend log test 4001`):

```json
{
  "_scope": "item",
  "OR": [
    {
      "producedAt": {
        "id": "https://lux.collections.yale.edu/data/place/e448f865-034b-48f3-a61e-f5339f6998ba"
      }
    },
    {
      "encounteredAt": {
        "id": "https://lux.collections.yale.edu/data/place/e448f865-034b-48f3-a61e-f5339f6998ba"
      }
    }
  ]
}
```

## Shape 26 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=1, avg 0.7×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 173–173 ms; current range: 124–124 ms
- Ratio: avg 0.7×, max 0.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9555 | work | 173 | 124 | 0.7× | PASS |

Example criteria (test `Backend log test 9555`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/58a57603-f224-4cc7-ab41-f08876619e23"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/4e792bf4-f134-4281-b458-5cf72c8f6490"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/8bdea143-f4b4-4144-9efc-b0199a9212f6"
      }
    }
  ]
}
```
