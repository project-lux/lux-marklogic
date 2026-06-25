## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 10595 tests)](#aggregate-full-10595-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 157-test union](#pattern-shapes--157-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - OR(`aboutConcept`, `classification`, `language`) (n=104, avg 0.7×, max 2.2×)](#shape-1---oraboutconcept-classification-language-n104-avg-07-max-22)
  - [Shape 2 - AND(`?`) (n=1, avg 1.5×, max 1.5×)](#shape-2---and-n1-avg-15-max-15)
  - [Shape 3 - AND(`aboutConcept`) (n=7, avg 0.2×, max 0.5×)](#shape-3---andaboutconcept-n7-avg-02-max-05)
  - [Shape 4 - AND(`hasDigitalImage`, `memberOf`, `text`) (n=1, avg 0.9×, max 0.9×)](#shape-4---andhasdigitalimage-memberof-text-n1-avg-09-max-09)
  - [Shape 5 - multi-`text` AND (n=1, avg 0.9×, max 0.9×)](#shape-5---multi-text-and-n1-avg-09-max-09)
  - [Shape 6 - `used` (n=8, avg 0.1×, max 0.2×)](#shape-6---used-n8-avg-01-max-02)
  - [Shape 7 - AND(`hasDigitalImage`, `text`) (n=1, avg 0.7×, max 0.7×)](#shape-7---andhasdigitalimage-text-n1-avg-07-max-07)
  - [Shape 8 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=6, avg 0.1×, max 0.1×)](#shape-8---orcreatedby-creationinfluencedby-publishedby-n6-avg-01-max-01)
  - [Shape 9 - AND(`aboutConcept`, `aboutPlace`) (n=6, avg 0.1×, max 0.1×)](#shape-9---andaboutconcept-aboutplace-n6-avg-01-max-01)
  - [Shape 10 - `carries` (n=5, avg 0.1×, max 0.1×)](#shape-10---carries-n5-avg-01-max-01)
  - [Shape 11 - `classification` (n=2, avg 0.1×, max 0.1×)](#shape-11---classification-n2-avg-01-max-01)
  - [Shape 12 - `aboutPlace` (n=2, avg 0.1×, max 0.1×)](#shape-12---aboutplace-n2-avg-01-max-01)
  - [Shape 13 - `memberOf` (n=2, avg 0.1×, max 0.1×)](#shape-13---memberof-n2-avg-01-max-01)
  - [Shape 14 - AND(`aboutAgent`) (n=2, avg 0.1×, max 0.1×)](#shape-14---andaboutagent-n2-avg-01-max-01)
  - [Shape 15 - OR(`encounteredBy`, `producedBy`, `productionInfluencedBy`) (n=1, avg 0.1×, max 0.1×)](#shape-15---orencounteredby-producedby-productioninfluencedby-n1-avg-01-max-01)
  - [Shape 16 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.1×, max 0.1×)](#shape-16---andaboutagent-aboutconcept-n1-avg-01-max-01)
  - [Shape 17 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=1, avg 0.1×, max 0.1×)](#shape-17---andaboutconcept-aboutevent-aboutplace-n1-avg-01-max-01)
  - [Shape 18 - OR(`classification`, `material`) (n=1, avg 0.1×, max 0.1×)](#shape-18---orclassification-material-n1-avg-01-max-01)
  - [Shape 19 - `foundedBy` (n=1, avg 0.1×, max 0.1×)](#shape-19---foundedby-n1-avg-01-max-01)
  - [Shape 20 - `partOfWork` (n=1, avg 0.1×, max 0.1×)](#shape-20---partofwork-n1-avg-01-max-01)
  - [Shape 21 - `startAt` (n=1, avg 0.1×, max 0.1×)](#shape-21---startat-n1-avg-01-max-01)
  - [Shape 22 - OR(`encounteredAt`, `producedAt`) (n=2, avg 0×, max 0×)](#shape-22---orencounteredat-producedat-n2-avg-0-max-0)

# Input

Source: `scratch/performance/2026-06-24-without-page-slice-v-select-barrier.json`
- baseline: `2026-06-04-optic-search-performance-10k-1` (2026-06-04T13:46:03.631Z)
- current:  `2026-06-24-optic-10k-search-perf-5e24970` (2026-06-24T17:33:53.304Z)
- generated: 2026-06-24T18:22:54.799Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 157 distinct tests**.
- The middle of the 10595-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 10595.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **0 tests with ≥10× regression**.

# Aggregate (full 10595 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 450.25 ms | 139.49 ms | **+-69%** |
| p50 | 405 ms | 125 ms | +-69% |
| p90 | 657 ms | 143 ms | +-78% |
| p95 | 774 ms | 177 ms | +-77% |
| p99 | 1209.2 ms | 741 ms | +-39% |
| p99.9 | 1731.22 ms | 885.62 ms | **+-49%** |
| Pass rate | 98.7% | 98.7% | 0.0 |

# Severity distribution

Bucketed counts across the 157-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 0 | |
| Moderate (3–10×) | 0 | |
| Mild (<3×) | 157 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 157-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---oraboutconcept-classification-language-n104-avg-07-max-22) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 104 | work | 938–1654 | 234–2204 | 0.7× | 2.2× |
| [2](#shape-2---and-n1-avg-15-max-15) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 6133–6133 | 9254 | 1.5× | 1.5× |
| [3](#shape-3---andaboutconcept-n7-avg-02-max-05) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 7 | work | 1241–3994 | 115–2193 | 0.2× | 0.5× |
| [4](#shape-4---andhasdigitalimage-memberof-text-n1-avg-09-max-09) | AND(`hasDigitalImage`, `memberOf`, `text`) | [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [IndexedWord](/src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 2758–2758 | 2459 | 0.9× | 0.9× |
| [5](#shape-5---multi-text-and-n1-avg-09-max-09) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 1260–1260 | 1140 | 0.9× | 0.9× |
| [6](#shape-6---used-n8-avg-01-max-02) | `used` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 8 | event | 1469–13601 | 213–291 | 0.1× | 0.2× |
| [7](#shape-7---andhasdigitalimage-text-n1-avg-07-max-07) | AND(`hasDigitalImage`, `text`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 1299–1299 | 944 | 0.7× | 0.7× |
| [8](#shape-8---orcreatedby-creationinfluencedby-publishedby-n6-avg-01-max-01) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 6 | work | 1260–2689 | 124–190 | 0.1× | 0.1× |
| [9](#shape-9---andaboutconcept-aboutplace-n6-avg-01-max-01) | AND(`aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 6 | work | 1240–1479 | 115–129 | 0.1× | 0.1× |
| [10](#shape-10---carries-n5-avg-01-max-01) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 5 | item | 1258–1431 | 121–162 | 0.1× | 0.1× |
| [11](#shape-11---classification-n2-avg-01-max-01) | `classification` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | agent | 1384–1559 | 126–127 | 0.1× | 0.1× |
| [12](#shape-12---aboutplace-n2-avg-01-max-01) | `aboutPlace` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 1279–1546 | 128–149 | 0.1× | 0.1× |
| [13](#shape-13---memberof-n2-avg-01-max-01) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | agent | 1368–1409 | 126–128 | 0.1× | 0.1× |
| [14](#shape-14---andaboutagent-n2-avg-01-max-01) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 1256–1302 | 124–125 | 0.1× | 0.1× |
| [15](#shape-15---orencounteredby-producedby-productioninfluencedby-n1-avg-01-max-01) | OR(`encounteredBy`, `producedBy`, `productionInfluencedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 1637–1637 | 135 | 0.1× | 0.1× |
| [16](#shape-16---andaboutagent-aboutconcept-n1-avg-01-max-01) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 1533–1533 | 121 | 0.1× | 0.1× |
| [17](#shape-17---andaboutconcept-aboutevent-aboutplace-n1-avg-01-max-01) | AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 1497–1497 | 141 | 0.1× | 0.1× |
| [18](#shape-18---orclassification-material-n1-avg-01-max-01) | OR(`classification`, `material`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 1294–1294 | 124 | 0.1× | 0.1× |
| [19](#shape-19---foundedby-n1-avg-01-max-01) | `foundedBy` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 1246–1246 | 165 | 0.1× | 0.1× |
| [20](#shape-20---partofwork-n1-avg-01-max-01) | `partOfWork` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 1244–1244 | 124 | 0.1× | 0.1× |
| [21](#shape-21---startat-n1-avg-01-max-01) | `startAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 1244–1244 | 172 | 0.1× | 0.1× |
| [22](#shape-22---orencounteredat-producedat-n2-avg-0-max-0) | OR(`encounteredAt`, `producedAt`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | item | 4650–5069 | 125–132 | 0× | 0× |

Total: 157 tests across 22 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - OR(`aboutConcept`, `classification`, `language`) (n=104, avg 0.7×, max 2.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 938–1654 ms; current range: 234–2204 ms
- Ratio: avg 0.7×, max 2.2×

Worst 5 of 104:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 14 | work | 986 | 2204 | 2.2× | — |
| Backend log test 270 | work | 983 | 933 | 0.9× | — |
| Backend log test 32 | work | 1081 | 928 | 0.9× | — |
| Backend log test 9406 | work | 1008 | 877 | 0.9× | — |
| Backend log test 3765 | work | 1177 | 894 | 0.8× | — |

Example criteria (test `Backend log test 14`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "classification": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/4ec21fa7-9aae-4a69-95cc-228eb7cbe844"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/4ec21fa7-9aae-4a69-95cc-228eb7cbe844"
            }
          }
        ]
      }
    },
    {
      "language": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/4ec21fa7-9aae-4a69-95cc-228eb7cbe844"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/4ec21fa7-9aae-4a69-95cc-228eb7cbe844"
            }
          }
        ]
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/4ec21fa7-9aae-4a69-95cc-228eb7cbe844"
      }
    }
  ]
}
```

## Shape 2 - AND(`?`) (n=1, avg 1.5×, max 1.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 6133–6133 ms; current range: 9254–9254 ms
- Ratio: avg 1.5×, max 1.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 6133 | 9254 | 1.5× | PASS |

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

## Shape 3 - AND(`aboutConcept`) (n=7, avg 0.2×, max 0.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 1241–3994 ms; current range: 115–2193 ms
- Ratio: avg 0.2×, max 0.5×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 68 | work | 3994 | 2193 | 0.5× | PASS |
| Backend log test 4222 | work | 1397 | 450 | 0.3× | PASS |
| Backend log test 5938 | work | 1351 | 427 | 0.3× | PASS |
| Backend log test 4588 | work | 1797 | 165 | 0.1× | PASS |
| Backend log test 2339 | work | 1391 | 115 | 0.1× | PASS |

Example criteria (test `Backend log test 68`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/957fee60-f280-4e66-914d-e0dbf93d835b"
      }
    }
  ]
}
```

## Shape 4 - AND(`hasDigitalImage`, `memberOf`, `text`) (n=1, avg 0.9×, max 0.9×)

- Patterns: [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [IndexedWord](/src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 2758–2758 ms; current range: 2459–2459 ms
- Ratio: avg 0.9×, max 0.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6152 | item | 2758 | 2459 | 0.9× | PASS |

Example criteria (test `Backend log test 6152`):

```json
{
  "_scope": "item",
  "AND": [
    {
      "text": "abstract",
      "_lang": "en"
    },
    {
      "hasDigitalImage": 1
    },
    {
      "memberOf": {
        "name": "Yale University Art Gallery"
      }
    }
  ]
}
```

## Shape 5 - multi-`text` AND (n=1, avg 0.9×, max 0.9×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 1260–1260 ms; current range: 1140–1140 ms
- Ratio: avg 0.9×, max 0.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6077 | item | 1260 | 1140 | 0.9× | PASS |

Example criteria (test `Backend log test 6077`):

```json
{
  "_scope": "item",
  "AND": [
    {
      "text": "The",
      "_lang": "en"
    },
    {
      "text": "quick",
      "_lang": "en"
    },
    {
      "text": "brown",
      "_lang": "en"
    },
    {
      "text": "fox",
      "_lang": "en"
    },
    {
      "text": "jumps",
      "_lang": "en"
    },
    {
      "text": "over",
      "_lang": "en"
    },
    {
      "text": "the",
      "_lang": "en"
    },
    {
      "text": "lazy",
      "_lang": "en"
    },
    {
      "text": "dog",
      "_lang": "en"
    }
  ]
}
```

## Shape 6 - `used` (n=8, avg 0.1×, max 0.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: event
- Baseline range: 1469–13601 ms; current range: 213–291 ms
- Ratio: avg 0.1×, max 0.2×

Worst 5 of 8:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4128 | event | 1469 | 291 | 0.2× | PASS |
| Backend log test 186 | event | 2616 | 291 | 0.1× | PASS |
| Backend log test 9029 | event | 2544 | 222 | 0.1× | PASS |
| Backend log test 8807 | event | 2143 | 227 | 0.1× | PASS |
| Backend log test 5432 | event | 1581 | 213 | 0.1× | PASS |

Example criteria (test `Backend log test 4128`):

```json
{
  "_scope": "event",
  "used": {
    "containingItem": {
      "producedBy": {
        "id": "https://lux.collections.yale.edu/data/person/e7864c21-01da-4eca-b077-f9eab1194545"
      }
    }
  }
}
```

## Shape 7 - AND(`hasDigitalImage`, `text`) (n=1, avg 0.7×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 1299–1299 ms; current range: 944–944 ms
- Ratio: avg 0.7×, max 0.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7332 | item | 1299 | 944 | 0.7× | PASS |

Example criteria (test `Backend log test 7332`):

```json
{
  "_scope": "item",
  "AND": [
    {
      "text": "horoldt"
    },
    {
      "hasDigitalImage": 1
    },
    {
      "OR": [
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/cb466280-c7f2-4edd-8ec2-bf84c64b9150"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/5d41d8d9-3009-4e46-b8a5-6e376dd8537e"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/b5f07ff8-1274-4e75-a90c-e3fddd76b0b6"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/703438a0-4a84-4bc8-8c9c-28e8d3e944f8"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/f4ab70fc-0d86-4234-bd8f-f0c7c2e55423"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/7a8ea77e-f2c9-43cf-9ca7-23c84d92d1fb"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/68a04911-0631-4924-94f2-4d32838d6d2a"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/15b1f320-60d0-4077-bce8-591f6303ebae"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/de6f3f1a-6b88-4b17-9933-796cf745a30b"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/5e9b7f70-82d9-4f3e-8f72-ef5bf6b17d9e"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/4b80230d-f931-4853-8241-d331955338f0"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/4aadad7e-0bce-4b00-a057-757a027b1c20"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/1f8f20d5-a5e1-4422-8624-42debfe14eba"
          }
        },
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/56dc1a97-4dfa-4a30-b028-f816575da1ab"
          }
        }
      ]
    }
  ]
}
```

## Shape 8 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=6, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 1260–2689 ms; current range: 124–190 ms
- Ratio: avg 0.1×, max 0.1×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 181 | work | 2689 | 190 | 0.1× | PASS |
| Backend log test 556 | work | 1467 | 124 | 0.1× | PASS |
| Backend log test 1085 | work | 1405 | 172 | 0.1× | PASS |
| Backend log test 3545 | work | 1392 | 126 | 0.1× | PASS |
| Backend log test 279 | work | 1263 | 151 | 0.1× | PASS |

Example criteria (test `Backend log test 181`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/daada696-4b22-4353-bc07-a4507d66e78a"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/daada696-4b22-4353-bc07-a4507d66e78a"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/daada696-4b22-4353-bc07-a4507d66e78a"
      }
    }
  ]
}
```

## Shape 9 - AND(`aboutConcept`, `aboutPlace`) (n=6, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 1240–1479 ms; current range: 115–129 ms
- Ratio: avg 0.1×, max 0.1×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2179 | work | 1479 | 125 | 0.1× | PASS |
| Backend log test 745 | work | 1466 | 129 | 0.1× | PASS |
| Backend log test 9095 | work | 1442 | 124 | 0.1× | PASS |
| Backend log test 3345 | work | 1418 | 125 | 0.1× | PASS |
| Backend log test 7080 | work | 1262 | 115 | 0.1× | PASS |

Example criteria (test `Backend log test 2179`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/ce43fca0-9024-44ff-aa06-2da3d2f403d6"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/4e792bf4-f134-4281-b458-5cf72c8f6490"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/f23444ce-4170-412d-80f4-0af237736017"
      }
    }
  ]
}
```

## Shape 10 - `carries` (n=5, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 1258–1431 ms; current range: 121–162 ms
- Ratio: avg 0.1×, max 0.1×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2960 | item | 1431 | 162 | 0.1× | PASS |
| Backend log test 4586 | item | 1368 | 121 | 0.1× | PASS |
| Backend log test 7666 | item | 1318 | 121 | 0.1× | PASS |
| Backend log test 3563 | item | 1273 | 124 | 0.1× | PASS |
| Backend log test 4430 | item | 1258 | 122 | 0.1× | PASS |

Example criteria (test `Backend log test 2960`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/fae7db45-a2ac-47b5-8009-3114154594ca"
  }
}
```

## Shape 11 - `classification` (n=2, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 1384–1559 ms; current range: 126–127 ms
- Ratio: avg 0.1×, max 0.1×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3897 | agent | 1559 | 127 | 0.1× | PASS |
| Backend log test 2094 | agent | 1384 | 126 | 0.1× | PASS |

Example criteria (test `Backend log test 3897`):

```json
{
  "_scope": "agent",
  "classification": {
    "id": "https://lux.collections.yale.edu/data/concept/df29644f-406f-4b56-85d7-965e7b283425"
  }
}
```

## Shape 12 - `aboutPlace` (n=2, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 1279–1546 ms; current range: 128–149 ms
- Ratio: avg 0.1×, max 0.1×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 144 | work | 1546 | 149 | 0.1× | PASS |
| Backend log test 5263 | work | 1279 | 128 | 0.1× | PASS |

Example criteria (test `Backend log test 144`):

```json
{
  "_scope": "work",
  "aboutPlace": {
    "id": "https://lux.collections.yale.edu/data/place/eb7db943-c3dc-4057-820b-0d9f2b8d7c2c"
  }
}
```

## Shape 13 - `memberOf` (n=2, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 1368–1409 ms; current range: 126–128 ms
- Ratio: avg 0.1×, max 0.1×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 31 | agent | 1409 | 126 | 0.1× | PASS |
| Backend log test 41 | agent | 1368 | 128 | 0.1× | PASS |

Example criteria (test `Backend log test 31`):

```json
{
  "_scope": "agent",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/group/59b9da71-6c0c-4a81-bd90-ed5702777d5b"
  }
}
```

## Shape 14 - AND(`aboutAgent`) (n=2, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 1256–1302 ms; current range: 124–125 ms
- Ratio: avg 0.1×, max 0.1×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4029 | work | 1302 | 124 | 0.1× | PASS |
| Backend log test 3860 | work | 1256 | 125 | 0.1× | PASS |

Example criteria (test `Backend log test 4029`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/a9f6ca47-9774-4cfd-a4a0-a98447ee91b2"
      }
    }
  ]
}
```

## Shape 15 - OR(`encounteredBy`, `producedBy`, `productionInfluencedBy`) (n=1, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 1637–1637 ms; current range: 135–135 ms
- Ratio: avg 0.1×, max 0.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2234 | item | 1637 | 135 | 0.1× | PASS |

Example criteria (test `Backend log test 2234`):

```json
{
  "_scope": "item",
  "OR": [
    {
      "producedBy": {
        "id": "https://lux.collections.yale.edu/data/person/7e1f9606-e4de-433b-8580-b87ebb533049"
      }
    },
    {
      "encounteredBy": {
        "id": "https://lux.collections.yale.edu/data/person/7e1f9606-e4de-433b-8580-b87ebb533049"
      }
    },
    {
      "productionInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/7e1f9606-e4de-433b-8580-b87ebb533049"
      }
    }
  ]
}
```

## Shape 16 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 1533–1533 ms; current range: 121–121 ms
- Ratio: avg 0.1×, max 0.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1977 | work | 1533 | 121 | 0.1× | PASS |

Example criteria (test `Backend log test 1977`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/71c17a39-143e-4079-bb06-6b913ee6aca7"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/87989f39-caa9-4cec-b080-79eb7b1ef17e"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/05e410dd-5e15-474c-a18b-5c1c31bd5f08"
      }
    }
  ]
}
```

## Shape 17 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=1, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 1497–1497 ms; current range: 141–141 ms
- Ratio: avg 0.1×, max 0.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 253 | work | 1497 | 141 | 0.1× | PASS |

Example criteria (test `Backend log test 253`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/255f3cf2-66c3-4afe-b482-8c60cbc697af"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/957fee60-f280-4e66-914d-e0dbf93d835b"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/e06d5d25-38b6-442c-b384-a0c891277c0a"
      }
    }
  ]
}
```

## Shape 18 - OR(`classification`, `material`) (n=1, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 1294–1294 ms; current range: 124–124 ms
- Ratio: avg 0.1×, max 0.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2058 | item | 1294 | 124 | 0.1× | PASS |

Example criteria (test `Backend log test 2058`):

```json
{
  "_scope": "item",
  "OR": [
    {
      "classification": {
        "id": "https://lux.collections.yale.edu/data/concept/0c90e72a-8284-4f5d-b24f-7842c395d026"
      }
    },
    {
      "material": {
        "id": "https://lux.collections.yale.edu/data/concept/0c90e72a-8284-4f5d-b24f-7842c395d026"
      }
    }
  ]
}
```

## Shape 19 - `foundedBy` (n=1, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 1246–1246 ms; current range: 165–165 ms
- Ratio: avg 0.1×, max 0.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 264 | agent | 1246 | 165 | 0.1× | PASS |

Example criteria (test `Backend log test 264`):

```json
{
  "_scope": "agent",
  "foundedBy": {
    "id": "https://lux.collections.yale.edu/data/person/0ebc11a4-3ff1-494a-b920-4d802a8f508d"
  }
}
```

## Shape 20 - `partOfWork` (n=1, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 1244–1244 ms; current range: 124–124 ms
- Ratio: avg 0.1×, max 0.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3773 | work | 1244 | 124 | 0.1× | PASS |

Example criteria (test `Backend log test 3773`):

```json
{
  "_scope": "work",
  "partOfWork": {
    "id": "https://lux.collections.yale.edu/data/text/3e4a2de1-a91d-4547-ab22-5a66573dcdfc"
  }
}
```

## Shape 21 - `startAt` (n=1, avg 0.1×, max 0.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 1244–1244 ms; current range: 172–172 ms
- Ratio: avg 0.1×, max 0.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3855 | agent | 1244 | 172 | 0.1× | PASS |

Example criteria (test `Backend log test 3855`):

```json
{
  "_scope": "agent",
  "startAt": {
    "id": "https://lux.collections.yale.edu/data/place/b7914800-7215-4b82-bea5-dc7bca93668f"
  }
}
```

## Shape 22 - OR(`encounteredAt`, `producedAt`) (n=2, avg 0×, max 0×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 4650–5069 ms; current range: 125–132 ms
- Ratio: avg 0×, max 0×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 138 | item | 5069 | 132 | 0× | PASS |
| Backend log test 147 | item | 4650 | 125 | 0× | PASS |

Example criteria (test `Backend log test 138`):

```json
{
  "_scope": "item",
  "OR": [
    {
      "producedAt": {
        "id": "https://lux.collections.yale.edu/data/place/bc84b503-e7b9-429d-93b8-2942972cecf9"
      }
    },
    {
      "encounteredAt": {
        "id": "https://lux.collections.yale.edu/data/place/bc84b503-e7b9-429d-93b8-2942972cecf9"
      }
    }
  ]
}
```
