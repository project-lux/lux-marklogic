## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 10585 tests)](#aggregate-full-10585-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 127-test union](#pattern-shapes--127-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - OR(`aboutConcept`, `classification`, `language`) (n=75, avg 5.2×, max 6.2×)](#shape-1---oraboutconcept-classification-language-n75-avg-52-max-62)
  - [Shape 2 - multi-`text` AND (n=27, avg 6.6×, max 9.9×)](#shape-2---multi-text-and-n27-avg-66-max-99)
  - [Shape 3 - single `text` keyword (n=5, avg 6.5×, max 11.3×)](#shape-3---single-text-keyword-n5-avg-65-max-113)
  - [Shape 4 - OR(`classification`, `material`) (n=1, avg 28.7×, max 28.7×)](#shape-4---orclassification-material-n1-avg-287-max-287)
  - [Shape 5 - AND(`aboutPlace`) (n=2, avg 7.3×, max 13.7×)](#shape-5---andaboutplace-n2-avg-73-max-137)
  - [Shape 6 - `memberOf` (n=3, avg 1.8×, max 2.5×)](#shape-6---memberof-n3-avg-18-max-25)
  - [Shape 7 - AND(`?`) (n=1, avg 3.6×, max 3.6×)](#shape-7---and-n1-avg-36-max-36)
  - [Shape 8 - `carries` (n=3, avg 0.9×, max 1×)](#shape-8---carries-n3-avg-09-max-1)
  - [Shape 9 - AND(`aboutAgent`) (n=1, avg 2.3×, max 2.3×)](#shape-9---andaboutagent-n1-avg-23-max-23)
  - [Shape 10 - AND(`aboutConcept`) (n=3, avg 0.7×, max 0.8×)](#shape-10---andaboutconcept-n3-avg-07-max-08)
  - [Shape 11 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=2, avg 0.9×, max 0.9×)](#shape-11---orcreatedby-creationinfluencedby-publishedby-n2-avg-09-max-09)
  - [Shape 12 - `partOf` (n=1, avg 0.9×, max 0.9×)](#shape-12---partof-n1-avg-09-max-09)
  - [Shape 13 - `foundedBy` (n=1, avg 0.8×, max 0.8×)](#shape-13---foundedby-n1-avg-08-max-08)
  - [Shape 14 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=1, avg 0.8×, max 0.8×)](#shape-14---andaboutconcept-aboutevent-aboutplace-n1-avg-08-max-08)
  - [Shape 15 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.7×, max 0.7×)](#shape-15---andaboutagent-aboutconcept-n1-avg-07-max-07)

# Input

Source: `scratch/performance/2026-06-25-cts-v-optic-9acd007-10k-2-single-thread.json`
- baseline: `2026-06-16-cts-search-performance-10k-2-single-thread` (2026-06-16T18:54:07.594Z)
- current:  `2026-06-25-optic-9acd007-10k-2-single-thread` (2026-06-25T18:03:34.320Z)
- generated: 2026-06-25T18:31:22.210Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 127 distinct tests**.
- The middle of the 10585-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 10585.
- Within the union: **1 functional regression(s)** (non-PASS in current) and **3 tests with ≥10× regression**.

# Aggregate (full 10585 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 39.17 ms | 142.78 ms | **+265%** |
| p50 | 33 ms | 123 ms | +273% |
| p90 | 47 ms | 137 ms | +191% |
| p95 | 54.1 ms | 167 ms | +209% |
| p99 | 141 ms | 689.6 ms | +389% |
| p99.9 | 557.61 ms | 3514.42 ms | **+530%** |
| Pass rate | 98.1% | 98.0% | -0.1 |

# Severity distribution

Bucketed counts across the 127-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 1 | status != PASS in current |
| Severe (≥10× ratio) | 3 | |
| Moderate (3–10×) | 103 | |
| Mild (<3×) | 20 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 127-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---oraboutconcept-classification-language-n75-avg-52-max-62) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 75 | work | 130–277 | 481–909 | 5.2× | 6.2× |
| [2](#shape-2---multi-text-and-n27-avg-66-max-99) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 27 | agent,item,place,work | 107–1023 | 222–10149 | 6.6× | 9.9× |
| [3](#shape-3---single-text-keyword-n5-avg-65-max-113) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item,work | 194–529 | 979–2805 | 6.5× | 11.3× |
| [4](#shape-4---orclassification-material-n1-avg-287-max-287) | OR(`classification`, `material`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 141–141 | 4049 | 28.7× | 28.7× |
| [5](#shape-5---andaboutplace-n2-avg-73-max-137) | AND(`aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 63–154 | 128–863 | 7.3× | 13.7× |
| [6](#shape-6---memberof-n3-avg-18-max-25) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | item | 142–162 | 204–408 | 1.8× | 2.5× |
| [7](#shape-7---and-n1-avg-36-max-36) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 1254–1254 | 4485 | 3.6× | 3.6× |
| [8](#shape-8---carries-n3-avg-09-max-1) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | item | 146–164 | 123–158 | 0.9× | 1× |
| [9](#shape-9---andaboutagent-n1-avg-23-max-23) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 160–160 | 362 | 2.3× | 2.3× |
| [10](#shape-10---andaboutconcept-n3-avg-07-max-08) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 154–170 | 118–123 | 0.7× | 0.8× |
| [11](#shape-11---orcreatedby-creationinfluencedby-publishedby-n2-avg-09-max-09) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 145–146 | 116–126 | 0.9× | 0.9× |
| [12](#shape-12---partof-n1-avg-09-max-09) | `partOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | place | 142–142 | 122 | 0.9× | 0.9× |
| [13](#shape-13---foundedby-n1-avg-08-max-08) | `foundedBy` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 156–156 | 126 | 0.8× | 0.8× |
| [14](#shape-14---andaboutconcept-aboutevent-aboutplace-n1-avg-08-max-08) | AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 149–149 | 119 | 0.8× | 0.8× |
| [15](#shape-15---andaboutagent-aboutconcept-n1-avg-07-max-07) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 156–156 | 111 | 0.7× | 0.7× |

Total: 127 tests across 15 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - OR(`aboutConcept`, `classification`, `language`) (n=75, avg 5.2×, max 6.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 130–277 ms; current range: 481–909 ms
- Ratio: avg 5.2×, max 6.2×

Worst 5 of 75:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 504 | work | 147 | 909 | 6.2× | PASS |
| Backend log test 922 | work | 140 | 835 | 6× | — |
| Backend log test 5599 | work | 130 | 770 | 5.9× | — |
| Backend log test 6770 | work | 141 | 820 | 5.8× | — |
| Backend log test 2540 | work | 138 | 802 | 5.8× | — |

Example criteria (test `Backend log test 504`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "classification": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/9aa10e00-1f88-4fb7-8fe1-944f78719035"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/9aa10e00-1f88-4fb7-8fe1-944f78719035"
            }
          }
        ]
      }
    },
    {
      "language": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/9aa10e00-1f88-4fb7-8fe1-944f78719035"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/9aa10e00-1f88-4fb7-8fe1-944f78719035"
            }
          }
        ]
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/9aa10e00-1f88-4fb7-8fe1-944f78719035"
      }
    }
  ]
}
```

## Shape 2 - multi-`text` AND (n=27, avg 6.6×, max 9.9×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: agent, item, place, work
- Baseline range: 107–1023 ms; current range: 222–10149 ms
- Ratio: avg 6.6×, max 9.9×

Worst 5 of 27:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8660 | item | 1023 | 10149 | 9.9× | SLOW |
| Backend log test 9183 | work | 764 | 6691 | 8.8× | PASS |
| Backend log test 4 | item | 594 | 5153 | 8.7× | PASS |
| Backend log test 204 | item | 747 | 5624 | 7.5× | PASS |
| Backend log test 3410 | item | 346 | 2441 | 7.1× | PASS |

Example criteria (test `Backend log test 8660`):

```json
{
  "_scope": "item",
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

## Shape 3 - single `text` keyword (n=5, avg 6.5×, max 11.3×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item, work
- Baseline range: 194–529 ms; current range: 979–2805 ms
- Ratio: avg 6.5×, max 11.3×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7362 | item | 248 | 2805 | 11.3× | PASS |
| Backend log test 7737 | item | 194 | 1256 | 6.5× | PASS |
| Backend log test 7695 | item | 207 | 1325 | 6.4× | PASS |
| Backend log test 4045 | item | 197 | 1226 | 6.2× | PASS |
| Backend log test 5431 | work | 529 | 979 | 1.9× | PASS |

Example criteria (test `Backend log test 7362`):

```json
{
  "_scope": "item",
  "text": "architecture",
  "_lang": "en"
}
```

## Shape 4 - OR(`classification`, `material`) (n=1, avg 28.7×, max 28.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 141–141 ms; current range: 4049–4049 ms
- Ratio: avg 28.7×, max 28.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3351 | item | 141 | 4049 | 28.7× | — |

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

## Shape 5 - AND(`aboutPlace`) (n=2, avg 7.3×, max 13.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 63–154 ms; current range: 128–863 ms
- Ratio: avg 7.3×, max 13.7×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3995 | work | 63 | 863 | 13.7× | — |
| Backend log test 9567 | work | 154 | 128 | 0.8× | PASS |

Example criteria (test `Backend log test 3995`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/b893ce02-7508-436f-bfdf-4d717a6bacf1"
      }
    }
  ]
}
```

## Shape 6 - `memberOf` (n=3, avg 1.8×, max 2.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 142–162 ms; current range: 204–408 ms
- Ratio: avg 1.8×, max 2.5×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6825 | item | 162 | 408 | 2.5× | PASS |
| Backend log test 9501 | item | 142 | 209 | 1.5× | PASS |
| Backend log test 24 | item | 149 | 204 | 1.4× | PASS |

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

## Shape 7 - AND(`?`) (n=1, avg 3.6×, max 3.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 1254–1254 ms; current range: 4485–4485 ms
- Ratio: avg 3.6×, max 3.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 1254 | 4485 | 3.6× | PASS |

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

## Shape 8 - `carries` (n=3, avg 0.9×, max 1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 146–164 ms; current range: 123–158 ms
- Ratio: avg 0.9×, max 1×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10018 | item | 160 | 158 | 1× | PASS |
| Backend log test 10097 | item | 164 | 123 | 0.8× | PASS |
| Backend log test 9325 | item | 146 | 124 | 0.8× | PASS |

Example criteria (test `Backend log test 10018`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/b397e09f-b9b4-4020-a5fa-4ef29a9532bb"
  }
}
```

## Shape 9 - AND(`aboutAgent`) (n=1, avg 2.3×, max 2.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 160–160 ms; current range: 362–362 ms
- Ratio: avg 2.3×, max 2.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9770 | work | 160 | 362 | 2.3× | PASS |

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

## Shape 10 - AND(`aboutConcept`) (n=3, avg 0.7×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 154–170 ms; current range: 118–123 ms
- Ratio: avg 0.7×, max 0.8×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7082 | work | 154 | 123 | 0.8× | PASS |
| Backend log test 9306 | work | 170 | 118 | 0.7× | PASS |
| Backend log test 9544 | work | 159 | 119 | 0.7× | PASS |

Example criteria (test `Backend log test 7082`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/fc63595e-1742-4e76-8e29-88b7509cb388"
      }
    }
  ]
}
```

## Shape 11 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=2, avg 0.9×, max 0.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 145–146 ms; current range: 116–126 ms
- Ratio: avg 0.9×, max 0.9×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8994 | work | 146 | 126 | 0.9× | PASS |
| Backend log test 8796 | work | 145 | 116 | 0.8× | PASS |

Example criteria (test `Backend log test 8994`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/c3a44038-dec0-4880-8f80-5c01939ec240"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/c3a44038-dec0-4880-8f80-5c01939ec240"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/c3a44038-dec0-4880-8f80-5c01939ec240"
      }
    }
  ]
}
```

## Shape 12 - `partOf` (n=1, avg 0.9×, max 0.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: place
- Baseline range: 142–142 ms; current range: 122–122 ms
- Ratio: avg 0.9×, max 0.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9087 | place | 142 | 122 | 0.9× | PASS |

Example criteria (test `Backend log test 9087`):

```json
{
  "_scope": "place",
  "partOf": {
    "id": "https://lux.collections.yale.edu/data/place/8070ab9b-2dfb-43c9-a650-03678f27d090"
  }
}
```

## Shape 13 - `foundedBy` (n=1, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 156–156 ms; current range: 126–126 ms
- Ratio: avg 0.8×, max 0.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9879 | agent | 156 | 126 | 0.8× | PASS |

Example criteria (test `Backend log test 9879`):

```json
{
  "_scope": "agent",
  "foundedBy": {
    "id": "https://lux.collections.yale.edu/data/group/f5d16416-037e-492a-8b5b-148f3b8f64ef"
  }
}
```

## Shape 14 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=1, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 149–149 ms; current range: 119–119 ms
- Ratio: avg 0.8×, max 0.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7378 | work | 149 | 119 | 0.8× | PASS |

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

## Shape 15 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.7×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 156–156 ms; current range: 111–111 ms
- Ratio: avg 0.7×, max 0.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7811 | work | 156 | 111 | 0.7× | PASS |

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
