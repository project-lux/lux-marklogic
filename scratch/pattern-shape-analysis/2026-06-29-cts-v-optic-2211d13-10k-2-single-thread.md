## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 10585 tests)](#aggregate-full-10585-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 150-test union](#pattern-shapes--150-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - OR(`memberOf`) (n=14, avg 14.2×, max 22.9×)](#shape-1---ormemberof-n14-avg-142-max-229)
  - [Shape 2 - `used` (n=6, avg 17.2×, max 72.6×)](#shape-2---used-n6-avg-172-max-726)
  - [Shape 3 - OR(`aboutConcept`, `classification`, `language`) (n=61, avg 1.3×, max 2.3×)](#shape-3---oraboutconcept-classification-language-n61-avg-13-max-23)
  - [Shape 4 - multi-`text` AND (n=27, avg 1.5×, max 2.8×)](#shape-4---multi-text-and-n27-avg-15-max-28)
  - [Shape 5 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=8, avg 3.8×, max 6.5×)](#shape-5---orcreatedby-creationinfluencedby-publishedby-n8-avg-38-max-65)
  - [Shape 6 - AND(`aboutConcept`) (n=7, avg 3×, max 6.5×)](#shape-6---andaboutconcept-n7-avg-3-max-65)
  - [Shape 7 - `carries` (n=6, avg 3.2×, max 6.3×)](#shape-7---carries-n6-avg-32-max-63)
  - [Shape 8 - AND(`aboutConcept`, `aboutPlace`) (n=3, avg 3.9×, max 6.1×)](#shape-8---andaboutconcept-aboutplace-n3-avg-39-max-61)
  - [Shape 9 - single `text` keyword (n=6, avg 1.5×, max 2.3×)](#shape-9---single-text-keyword-n6-avg-15-max-23)
  - [Shape 10 - `memberOf` (n=3, avg 1.6×, max 1.9×)](#shape-10---memberof-n3-avg-16-max-19)
  - [Shape 11 - `aboutAgent` (n=1, avg 3.7×, max 3.7×)](#shape-11---aboutagent-n1-avg-37-max-37)
  - [Shape 12 - AND(`?`) (n=1, avg 2×, max 2×)](#shape-12---and-n1-avg-2-max-2)
  - [Shape 13 - OR(`classification`, `material`) (n=1, avg 1.6×, max 1.6×)](#shape-13---orclassification-material-n1-avg-16-max-16)
  - [Shape 14 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.5×, max 0.5×)](#shape-14---andaboutagent-aboutconcept-n1-avg-05-max-05)
  - [Shape 15 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=1, avg 0.5×, max 0.5×)](#shape-15---andaboutconcept-aboutevent-aboutplace-n1-avg-05-max-05)
  - [Shape 16 - AND(`aboutAgent`) (n=1, avg 0.3×, max 0.3×)](#shape-16---andaboutagent-n1-avg-03-max-03)
  - [Shape 17 - `foundedBy` (n=1, avg 0.3×, max 0.3×)](#shape-17---foundedby-n1-avg-03-max-03)
  - [Shape 18 - AND(`aboutPlace`) (n=1, avg 0.3×, max 0.3×)](#shape-18---andaboutplace-n1-avg-03-max-03)
  - [Shape 19 - `partOf` (n=1, avg 0.3×, max 0.3×)](#shape-19---partof-n1-avg-03-max-03)

# Input

Source: `scratch/pattern-shape-analysis/2026-06-29-cts-v-optic-2211d13-10k-2-single-thread.json`
- baseline: `2026-06-16-cts-search-performance-10k-2-single-thread` (2026-06-16T18:54:07.594Z)
- current:  `2026-06-29-optic-2211d13-10k-2-single-thread` (2026-06-29T11:35:49.738Z)
- generated: 2026-06-29T11:59:09.645Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 150 distinct tests**.
- The middle of the 10585-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 10585.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **15 tests with ≥10× regression**.

# Aggregate (full 10585 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 39.17 ms | 56 ms | **+43%** |
| p50 | 33 ms | 46 ms | +39% |
| p90 | 47 ms | 66 ms | +40% |
| p95 | 54.1 ms | 79 ms | +46% |
| p99 | 141 ms | 175 ms | +24% |
| p99.9 | 557.61 ms | 741.04 ms | **+33%** |
| Pass rate | 98.1% | 98.1% | 0.0 |

# Severity distribution

Bucketed counts across the 150-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 15 | |
| Moderate (3–10×) | 20 | |
| Mild (<3×) | 115 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 150-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---ormemberof-n14-avg-142-max-229) | OR(`memberOf`) | `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs) | 14 | multi | 27–31 | 343–710 | 14.2× | 22.9× |
| [2](#shape-2---used-n6-avg-172-max-726) | `used` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 6 | event | 32–50 | 217–3049 | 17.2× | 72.6× |
| [3](#shape-3---oraboutconcept-classification-language-n61-avg-13-max-23) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 61 | work | 90–277 | 145–418 | 1.3× | 2.3× |
| [4](#shape-4---multi-text-and-n27-avg-15-max-28) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 27 | agent,item,place,work | 107–1023 | 114–2719 | 1.5× | 2.8× |
| [5](#shape-5---orcreatedby-creationinfluencedby-publishedby-n8-avg-38-max-65) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 8 | work | 32–146 | 45–208 | 3.8× | 6.5× |
| [6](#shape-6---andaboutconcept-n7-avg-3-max-65) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 7 | work | 35–170 | 49–226 | 3× | 6.5× |
| [7](#shape-7---carries-n6-avg-32-max-63) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 6 | item | 31–164 | 43–202 | 3.2× | 6.3× |
| [8](#shape-8---andaboutconcept-aboutplace-n3-avg-39-max-61) | AND(`aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 30–103 | 180–207 | 3.9× | 6.1× |
| [9](#shape-9---single-text-keyword-n6-avg-15-max-23) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 6 | item,work | 127–529 | 178–507 | 1.5× | 2.3× |
| [10](#shape-10---memberof-n3-avg-16-max-19) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | item | 142–162 | 194–312 | 1.6× | 1.9× |
| [11](#shape-11---aboutagent-n1-avg-37-max-37) | `aboutAgent` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 94–94 | 344 | 3.7× | 3.7× |
| [12](#shape-12---and-n1-avg-2-max-2) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 1254–1254 | 2567 | 2× | 2× |
| [13](#shape-13---orclassification-material-n1-avg-16-max-16) | OR(`classification`, `material`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 141–141 | 222 | 1.6× | 1.6× |
| [14](#shape-14---andaboutagent-aboutconcept-n1-avg-05-max-05) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 156–156 | 71 | 0.5× | 0.5× |
| [15](#shape-15---andaboutconcept-aboutevent-aboutplace-n1-avg-05-max-05) | AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 149–149 | 75 | 0.5× | 0.5× |
| [16](#shape-16---andaboutagent-n1-avg-03-max-03) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 160–160 | 51 | 0.3× | 0.3× |
| [17](#shape-17---foundedby-n1-avg-03-max-03) | `foundedBy` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 156–156 | 44 | 0.3× | 0.3× |
| [18](#shape-18---andaboutplace-n1-avg-03-max-03) | AND(`aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 154–154 | 45 | 0.3× | 0.3× |
| [19](#shape-19---partof-n1-avg-03-max-03) | `partOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | place | 142–142 | 42 | 0.3× | 0.3× |

Total: 150 tests across 19 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - OR(`memberOf`) (n=14, avg 14.2×, max 22.9×)

- Patterns: `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs)
- Scopes: multi
- Baseline range: 27–31 ms; current range: 343–710 ms
- Ratio: avg 14.2×, max 22.9×

Worst 5 of 14:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3 | multi | 31 | 710 | 22.9× | — |
| Backend log test 2963 | multi | 27 | 384 | 14.2× | — |
| Backend log test 5554 | multi | 28 | 391 | 14× | — |
| Backend log test 7766 | multi | 28 | 389 | 13.9× | — |
| Backend log test 4893 | multi | 28 | 386 | 13.8× | — |

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

## Shape 2 - `used` (n=6, avg 17.2×, max 72.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: event
- Baseline range: 32–50 ms; current range: 217–3049 ms
- Ratio: avg 17.2×, max 72.6×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 186 | event | 42 | 3049 | 72.6× | — |
| Backend log test 4928 | event | 33 | 244 | 7.4× | — |
| Backend log test 1124 | event | 38 | 273 | 7.2× | — |
| Backend log test 7061 | event | 32 | 217 | 6.8× | — |
| Backend log test 2814 | event | 46 | 223 | 4.8× | — |

Example criteria (test `Backend log test 186`):

```json
{
  "_scope": "event",
  "used": {
    "containingItem": {
      "producedBy": {
        "id": "https://lux.collections.yale.edu/data/person/8f19f2c0-b277-4a6a-a009-ebaf371e64ae"
      }
    }
  }
}
```

## Shape 3 - OR(`aboutConcept`, `classification`, `language`) (n=61, avg 1.3×, max 2.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 90–277 ms; current range: 145–418 ms
- Ratio: avg 1.3×, max 2.3×

Worst 5 of 61:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 16 | work | 140 | 321 | 2.3× | — |
| Backend log test 6105 | work | 93 | 194 | 2.1× | — |
| Backend log test 102 | work | 90 | 178 | 2× | — |
| Backend log test 14 | work | 277 | 418 | 1.5× | PASS |
| Backend log test 32 | work | 241 | 348 | 1.4× | PASS |

Example criteria (test `Backend log test 16`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "classification": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/27859e72-cf41-4983-b036-e7ce390dad18"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/27859e72-cf41-4983-b036-e7ce390dad18"
            }
          }
        ]
      }
    },
    {
      "language": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/27859e72-cf41-4983-b036-e7ce390dad18"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/27859e72-cf41-4983-b036-e7ce390dad18"
            }
          }
        ]
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/27859e72-cf41-4983-b036-e7ce390dad18"
      }
    }
  ]
}
```

## Shape 4 - multi-`text` AND (n=27, avg 1.5×, max 2.8×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: agent, item, place, work
- Baseline range: 107–1023 ms; current range: 114–2719 ms
- Ratio: avg 1.5×, max 2.8×

Worst 5 of 27:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8659 | place | 810 | 2255 | 2.8× | PASS |
| Backend log test 8660 | item | 1023 | 2719 | 2.7× | PASS |
| Backend log test 9382 | item | 868 | 2211 | 2.5× | PASS |
| Backend log test 134 | item | 712 | 1321 | 1.9× | PASS |
| Backend log test 9273 | agent | 107 | 205 | 1.9× | — |

Example criteria (test `Backend log test 8659`):

```json
{
  "_scope": "place",
  "AND": [
    {
      "text": "united",
      "_lang": "en"
    },
    {
      "text": "states",
      "_lang": "en"
    }
  ]
}
```

## Shape 5 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=8, avg 3.8×, max 6.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 32–146 ms; current range: 45–208 ms
- Ratio: avg 3.8×, max 6.5×

Worst 5 of 8:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10217 | work | 32 | 208 | 6.5× | — |
| Backend log test 10048 | work | 32 | 184 | 5.8× | — |
| Backend log test 18 | work | 33 | 182 | 5.5× | — |
| Backend log test 9586 | work | 36 | 191 | 5.3× | — |
| Backend log test 9372 | work | 40 | 199 | 5× | — |

Example criteria (test `Backend log test 10217`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/64158455-18eb-472d-8645-677dcbacb205"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/64158455-18eb-472d-8645-677dcbacb205"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/64158455-18eb-472d-8645-677dcbacb205"
      }
    }
  ]
}
```

## Shape 6 - AND(`aboutConcept`) (n=7, avg 3×, max 6.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 35–170 ms; current range: 49–226 ms
- Ratio: avg 3×, max 6.5×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9910 | work | 35 | 226 | 6.5× | — |
| Backend log test 8340 | work | 39 | 182 | 4.7× | — |
| Backend log test 8277 | work | 41 | 188 | 4.6× | — |
| Backend log test 9287 | work | 49 | 198 | 4× | — |
| Backend log test 9306 | work | 170 | 65 | 0.4× | PASS |

Example criteria (test `Backend log test 9910`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/d92761c6-c732-479a-b150-5ca3bcb8d75b"
      }
    }
  ]
}
```

## Shape 7 - `carries` (n=6, avg 3.2×, max 6.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 31–164 ms; current range: 43–202 ms
- Ratio: avg 3.2×, max 6.3×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10015 | item | 32 | 202 | 6.3× | — |
| Backend log test 9749 | item | 31 | 186 | 6× | — |
| Backend log test 9750 | item | 31 | 186 | 6× | — |
| Backend log test 10097 | item | 164 | 43 | 0.3× | PASS |
| Backend log test 10018 | item | 160 | 47 | 0.3× | PASS |

Example criteria (test `Backend log test 10015`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/ee343901-e9ee-4a14-b582-beb8d3629bc3"
  }
}
```

## Shape 8 - AND(`aboutConcept`, `aboutPlace`) (n=3, avg 3.9×, max 6.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 30–103 ms; current range: 180–207 ms
- Ratio: avg 3.9×, max 6.1×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9571 | work | 30 | 182 | 6.1× | — |
| Backend log test 7071 | work | 51 | 180 | 3.5× | — |
| Backend log test 9662 | work | 103 | 207 | 2× | — |

Example criteria (test `Backend log test 9571`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/49c1e216-8067-49e6-9c2b-65f58851e5f3"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/53f883ba-9fcc-4e93-b4e5-0f6856b6f876"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/4ed607a8-2ce8-4d04-92b3-1b3acb030af6"
      }
    }
  ]
}
```

## Shape 9 - single `text` keyword (n=6, avg 1.5×, max 2.3×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item, work
- Baseline range: 127–529 ms; current range: 178–507 ms
- Ratio: avg 1.5×, max 2.3×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7737 | item | 194 | 448 | 2.3× | PASS |
| Backend log test 7695 | item | 207 | 339 | 1.6× | PASS |
| Backend log test 4045 | item | 197 | 304 | 1.5× | PASS |
| Backend log test 7362 | item | 248 | 349 | 1.4× | PASS |
| Backend log test 165 | item | 127 | 178 | 1.4× | — |

Example criteria (test `Backend log test 7737`):

```json
{
  "_scope": "item",
  "text": "mcclintock",
  "_lang": "en"
}
```

## Shape 10 - `memberOf` (n=3, avg 1.6×, max 1.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 142–162 ms; current range: 194–312 ms
- Ratio: avg 1.6×, max 1.9×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6825 | item | 162 | 312 | 1.9× | PASS |
| Backend log test 9501 | item | 142 | 212 | 1.5× | PASS |
| Backend log test 24 | item | 149 | 194 | 1.3× | PASS |

Example criteria (test `Backend log test 6825`):

```json
{
  "_scope": "item",
  "memberOf": {
    "usedForEvent": {
      "id": "https://lux.collections.yale.edu/data/activity/2a81cf72-5f7e-467d-a6aa-e6e4a80ddb96"
    }
  }
}
```

## Shape 11 - `aboutAgent` (n=1, avg 3.7×, max 3.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 94–94 ms; current range: 344–344 ms
- Ratio: avg 3.7×, max 3.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1 | work | 94 | 344 | 3.7× | — |

Example criteria (test `Backend log test 1`):

```json
{
  "_scope": "work",
  "aboutAgent": {
    "id": "https://lux.collections.yale.edu/data/group/bf219a49-0005-40df-a1d7-402537e9b485"
  }
}
```

## Shape 12 - AND(`?`) (n=1, avg 2×, max 2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 1254–1254 ms; current range: 2567–2567 ms
- Ratio: avg 2×, max 2×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 1254 | 2567 | 2× | PASS |

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

## Shape 13 - OR(`classification`, `material`) (n=1, avg 1.6×, max 1.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 141–141 ms; current range: 222–222 ms
- Ratio: avg 1.6×, max 1.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3351 | item | 141 | 222 | 1.6× | — |

Example criteria (test `Backend log test 3351`):

```json
{
  "_scope": "item",
  "OR": [
    {
      "classification": {
        "id": "https://lux.collections.yale.edu/data/concept/05a41429-8a18-4911-854e-eae804b7d46f"
      }
    },
    {
      "material": {
        "id": "https://lux.collections.yale.edu/data/concept/05a41429-8a18-4911-854e-eae804b7d46f"
      }
    }
  ]
}
```

## Shape 14 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.5×, max 0.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 156–156 ms; current range: 71–71 ms
- Ratio: avg 0.5×, max 0.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7811 | work | 156 | 71 | 0.5× | PASS |

Example criteria (test `Backend log test 7811`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/group/37ff1719-988d-445b-9123-301909c26fbd"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/e6a9d1f0-fbea-4cd6-a154-dbd159c4993e"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/68eb2b87-17a8-45fe-9975-de2d633d741e"
      }
    }
  ]
}
```

## Shape 15 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=1, avg 0.5×, max 0.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 149–149 ms; current range: 75–75 ms
- Ratio: avg 0.5×, max 0.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7378 | work | 149 | 75 | 0.5× | PASS |

Example criteria (test `Backend log test 7378`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/3e3aadac-4755-4dee-998b-75dd289e1034"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/a2705325-6edb-4a5a-af46-9e1474dad050"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/a531c521-ed34-4b3b-a53f-38fc02e85d50"
      }
    }
  ]
}
```

## Shape 16 - AND(`aboutAgent`) (n=1, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 160–160 ms; current range: 51–51 ms
- Ratio: avg 0.3×, max 0.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9770 | work | 160 | 51 | 0.3× | PASS |

Example criteria (test `Backend log test 9770`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/f93cc1bf-9d1b-435c-a138-fed2e572274a"
      }
    }
  ]
}
```

## Shape 17 - `foundedBy` (n=1, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 156–156 ms; current range: 44–44 ms
- Ratio: avg 0.3×, max 0.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9879 | agent | 156 | 44 | 0.3× | PASS |

Example criteria (test `Backend log test 9879`):

```json
{
  "_scope": "agent",
  "foundedBy": {
    "id": "https://lux.collections.yale.edu/data/group/f5d16416-037e-492a-8b5b-148f3b8f64ef"
  }
}
```

## Shape 18 - AND(`aboutPlace`) (n=1, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 154–154 ms; current range: 45–45 ms
- Ratio: avg 0.3×, max 0.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9567 | work | 154 | 45 | 0.3× | PASS |

Example criteria (test `Backend log test 9567`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/c1982136-f04e-479d-a315-bfd24adc45f2"
      }
    }
  ]
}
```

## Shape 19 - `partOf` (n=1, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: place
- Baseline range: 142–142 ms; current range: 42–42 ms
- Ratio: avg 0.3×, max 0.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9087 | place | 142 | 42 | 0.3× | PASS |

Example criteria (test `Backend log test 9087`):

```json
{
  "_scope": "place",
  "partOf": {
    "id": "https://lux.collections.yale.edu/data/place/8070ab9b-2dfb-43c9-a650-03678f27d090"
  }
}
```
