## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 10595 tests)](#aggregate-full-10595-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 151-test union](#pattern-shapes--151-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - OR(`aboutConcept`, `classification`, `language`) (n=103, avg 5.4×, max 12.7×)](#shape-1---oraboutconcept-classification-language-n103-avg-54-max-127)
  - [Shape 2 - multi-`text` AND (n=5, avg 6.5×, max 7.8×)](#shape-2---multi-text-and-n5-avg-65-max-78)
  - [Shape 3 - AND(`aboutConcept`) (n=7, avg 4.5×, max 27.1×)](#shape-3---andaboutconcept-n7-avg-45-max-271)
  - [Shape 4 - single `text` keyword (n=5, avg 5.7×, max 6.8×)](#shape-4---single-text-keyword-n5-avg-57-max-68)
  - [Shape 5 - AND(`?`) (n=1, avg 9.6×, max 9.6×)](#shape-5---and-n1-avg-96-max-96)
  - [Shape 6 - AND(`hasDigitalImage`, `memberOf`, `text`) (n=1, avg 7.5×, max 7.5×)](#shape-6---andhasdigitalimage-memberof-text-n1-avg-75-max-75)
  - [Shape 7 - `carries` (n=7, avg 0.8×, max 0.8×)](#shape-7---carries-n7-avg-08-max-08)
  - [Shape 8 - AND(`hasDigitalImage`, `text`) (n=1, avg 5.5×, max 5.5×)](#shape-8---andhasdigitalimage-text-n1-avg-55-max-55)
  - [Shape 9 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=5, avg 0.8×, max 1.3×)](#shape-9---orcreatedby-creationinfluencedby-publishedby-n5-avg-08-max-13)
  - [Shape 10 - `aboutAgent` (n=1, avg 2.5×, max 2.5×)](#shape-10---aboutagent-n1-avg-25-max-25)
  - [Shape 11 - `memberOf` (n=2, avg 1×, max 1.1×)](#shape-11---memberof-n2-avg-1-max-11)
  - [Shape 12 - AND(`aboutConcept`, `aboutEvent`) (n=2, avg 0.7×, max 0.8×)](#shape-12---andaboutconcept-aboutevent-n2-avg-07-max-08)
  - [Shape 13 - AND(`aboutConcept`, `aboutPlace`) (n=2, avg 0.6×, max 0.7×)](#shape-13---andaboutconcept-aboutplace-n2-avg-06-max-07)
  - [Shape 14 - AND(`aboutAgent`) (n=2, avg 0.6×, max 0.6×)](#shape-14---andaboutagent-n2-avg-06-max-06)
  - [Shape 15 - `partOfWork` (n=1, avg 0.8×, max 0.8×)](#shape-15---partofwork-n1-avg-08-max-08)
  - [Shape 16 - `broader` (n=1, avg 0.7×, max 0.7×)](#shape-16---broader-n1-avg-07-max-07)
  - [Shape 17 - `aboutPlace` (n=1, avg 0.7×, max 0.7×)](#shape-17---aboutplace-n1-avg-07-max-07)
  - [Shape 18 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.7×, max 0.7×)](#shape-18---andaboutagent-aboutconcept-n1-avg-07-max-07)
  - [Shape 19 - AND(`aboutPlace`) (n=1, avg 0.6×, max 0.6×)](#shape-19---andaboutplace-n1-avg-06-max-06)
  - [Shape 20 - `endAt` (n=1, avg 0.5×, max 0.5×)](#shape-20---endat-n1-avg-05-max-05)
  - [Shape 21 - `aboutWork` (n=1, avg 0.3×, max 0.3×)](#shape-21---aboutwork-n1-avg-03-max-03)

# Input

Source: `scratch/performance/2026-06-25-cts-v-optic-9acd007-10k-1-single-thread.json`
- baseline: `2026-06-04-cts-search-performance-10k-1-single-thread` (2026-06-04T16:07:27.273Z)
- current:  `2026-06-25-optic-9acd007-10k-1-single-thread` (2026-06-25T17:29:36.096Z)
- generated: 2026-06-25T18:31:13.591Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 151 distinct tests**.
- The middle of the 10595-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 10595.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **2 tests with ≥10× regression**.

# Aggregate (full 10595 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 39.44 ms | 140.11 ms | **+255%** |
| p50 | 34 ms | 124 ms | +265% |
| p90 | 48 ms | 142 ms | +196% |
| p95 | 56.95 ms | 178 ms | +213% |
| p99 | 142 ms | 748.39 ms | +427% |
| p99.9 | 220.77 ms | 1153.66 ms | **+423%** |
| Pass rate | 98.7% | 98.7% | 0.0 |

# Severity distribution

Bucketed counts across the 151-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 2 | |
| Moderate (3–10×) | 113 | |
| Mild (<3×) | 36 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 151-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---oraboutconcept-classification-language-n103-avg-54-max-127) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 103 | work | 133–267 | 484–2179 | 5.4× | 12.7× |
| [2](#shape-2---multi-text-and-n5-avg-65-max-78) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item | 185–953 | 1242–7463 | 6.5× | 7.8× |
| [3](#shape-3---andaboutconcept-n7-avg-45-max-271) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 7 | work | 80–196 | 110–2171 | 4.5× | 27.1× |
| [4](#shape-4---single-text-keyword-n5-avg-57-max-68) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item | 152–187 | 579–1242 | 5.7× | 6.8× |
| [5](#shape-5---and-n1-avg-96-max-96) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 969–969 | 9286 | 9.6× | 9.6× |
| [6](#shape-6---andhasdigitalimage-memberof-text-n1-avg-75-max-75) | AND(`hasDigitalImage`, `memberOf`, `text`) | [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [IndexedWord](/src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 325–325 | 2444 | 7.5× | 7.5× |
| [7](#shape-7---carries-n7-avg-08-max-08) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 7 | item | 148–205 | 117–127 | 0.8× | 0.8× |
| [8](#shape-8---andhasdigitalimage-text-n1-avg-55-max-55) | AND(`hasDigitalImage`, `text`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 182–182 | 1005 | 5.5× | 5.5× |
| [9](#shape-9---orcreatedby-creationinfluencedby-publishedby-n5-avg-08-max-13) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 5 | work | 147–199 | 119–212 | 0.8× | 1.3× |
| [10](#shape-10---aboutagent-n1-avg-25-max-25) | `aboutAgent` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 177–177 | 438 | 2.5× | 2.5× |
| [11](#shape-11---memberof-n2-avg-1-max-11) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | agent | 187–198 | 141–225 | 1× | 1.1× |
| [12](#shape-12---andaboutconcept-aboutevent-n2-avg-07-max-08) | AND(`aboutConcept`, `aboutEvent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 149–215 | 118–121 | 0.7× | 0.8× |
| [13](#shape-13---andaboutconcept-aboutplace-n2-avg-06-max-07) | AND(`aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 181–217 | 115–121 | 0.6× | 0.7× |
| [14](#shape-14---andaboutagent-n2-avg-06-max-06) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 224–252 | 125–151 | 0.6× | 0.6× |
| [15](#shape-15---partofwork-n1-avg-08-max-08) | `partOfWork` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 150–150 | 123 | 0.8× | 0.8× |
| [16](#shape-16---broader-n1-avg-07-max-07) | `broader` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | concept | 194–194 | 131 | 0.7× | 0.7× |
| [17](#shape-17---aboutplace-n1-avg-07-max-07) | `aboutPlace` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 178–178 | 123 | 0.7× | 0.7× |
| [18](#shape-18---andaboutagent-aboutconcept-n1-avg-07-max-07) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 173–173 | 122 | 0.7× | 0.7× |
| [19](#shape-19---andaboutplace-n1-avg-06-max-06) | AND(`aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 195–195 | 124 | 0.6× | 0.6× |
| [20](#shape-20---endat-n1-avg-05-max-05) | `endAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 230–230 | 123 | 0.5× | 0.5× |
| [21](#shape-21---aboutwork-n1-avg-03-max-03) | `aboutWork` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 144–144 | 45 | 0.3× | 0.3× |

Total: 151 tests across 21 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - OR(`aboutConcept`, `classification`, `language`) (n=103, avg 5.4×, max 12.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 133–267 ms; current range: 484–2179 ms
- Ratio: avg 5.4×, max 12.7×

Worst 5 of 103:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 14 | work | 171 | 2179 | 12.7× | PASS |
| Backend log test 7510 | work | 133 | 861 | 6.5× | — |
| Backend log test 3895 | work | 150 | 963 | 6.4× | PASS |
| Backend log test 32 | work | 150 | 923 | 6.2× | PASS |
| Backend log test 2159 | work | 141 | 864 | 6.1× | — |

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

## Shape 2 - multi-`text` AND (n=5, avg 6.5×, max 7.8×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 185–953 ms; current range: 1242–7463 ms
- Ratio: avg 6.5×, max 7.8×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6077 | item | 953 | 7463 | 7.8× | PASS |
| Backend log test 2351 | item | 334 | 2239 | 6.7× | PASS |
| Backend log test 7397 | item | 185 | 1242 | 6.7× | PASS |
| Backend log test 3577 | item | 427 | 2659 | 6.2× | PASS |
| Backend log test 7385 | item | 292 | 1494 | 5.1× | PASS |

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

## Shape 3 - AND(`aboutConcept`) (n=7, avg 4.5×, max 27.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 80–196 ms; current range: 110–2171 ms
- Ratio: avg 4.5×, max 27.1×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 68 | work | 80 | 2171 | 27.1× | — |
| Backend log test 6015 | work | 168 | 145 | 0.9× | PASS |
| Backend log test 6337 | work | 158 | 122 | 0.8× | PASS |
| Backend log test 5021 | work | 157 | 130 | 0.8× | PASS |
| Backend log test 5359 | work | 146 | 124 | 0.8× | PASS |

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

## Shape 4 - single `text` keyword (n=5, avg 5.7×, max 6.8×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 152–187 ms; current range: 579–1242 ms
- Ratio: avg 5.7×, max 6.8×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2630 | item | 183 | 1242 | 6.8× | PASS |
| Backend log test 9884 | item | 182 | 1191 | 6.5× | PASS |
| Backend log test 2591 | item | 184 | 1110 | 6× | PASS |
| Backend log test 2656 | item | 187 | 1016 | 5.4× | PASS |
| Backend log test 165 | item | 152 | 579 | 3.8× | PASS |

Example criteria (test `Backend log test 2630`):

```json
{
  "_scope": "item",
  "text": "harunobu",
  "_lang": "en"
}
```

## Shape 5 - AND(`?`) (n=1, avg 9.6×, max 9.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 969–969 ms; current range: 9286–9286 ms
- Ratio: avg 9.6×, max 9.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 969 | 9286 | 9.6× | PASS |

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

## Shape 6 - AND(`hasDigitalImage`, `memberOf`, `text`) (n=1, avg 7.5×, max 7.5×)

- Patterns: [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [IndexedWord](/src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 325–325 ms; current range: 2444–2444 ms
- Ratio: avg 7.5×, max 7.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6152 | item | 325 | 2444 | 7.5× | PASS |

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

## Shape 7 - `carries` (n=7, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 148–205 ms; current range: 117–127 ms
- Ratio: avg 0.8×, max 0.8×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6819 | item | 166 | 125 | 0.8× | PASS |
| Backend log test 6066 | item | 161 | 122 | 0.8× | PASS |
| Backend log test 6254 | item | 158 | 126 | 0.8× | PASS |
| Backend log test 6573 | item | 154 | 121 | 0.8× | PASS |
| Backend log test 7058 | item | 153 | 127 | 0.8× | PASS |

Example criteria (test `Backend log test 6819`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/7a2b1dcf-1294-4b7e-abb1-503e73b4358a"
  }
}
```

## Shape 8 - AND(`hasDigitalImage`, `text`) (n=1, avg 5.5×, max 5.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 182–182 ms; current range: 1005–1005 ms
- Ratio: avg 5.5×, max 5.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7332 | item | 182 | 1005 | 5.5× | PASS |

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

## Shape 9 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=5, avg 0.8×, max 1.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 147–199 ms; current range: 119–212 ms
- Ratio: avg 0.8×, max 1.3×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2 | work | 163 | 212 | 1.3× | PASS |
| Backend log test 6816 | work | 158 | 129 | 0.8× | PASS |
| Backend log test 5450 | work | 147 | 124 | 0.8× | PASS |
| Backend log test 7659 | work | 176 | 125 | 0.7× | PASS |
| Backend log test 8200 | work | 199 | 119 | 0.6× | PASS |

Example criteria (test `Backend log test 2`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/66f1e1aa-d806-4352-9fb7-cf13300e5571"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/66f1e1aa-d806-4352-9fb7-cf13300e5571"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/66f1e1aa-d806-4352-9fb7-cf13300e5571"
      }
    }
  ]
}
```

## Shape 10 - `aboutAgent` (n=1, avg 2.5×, max 2.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 177–177 ms; current range: 438–438 ms
- Ratio: avg 2.5×, max 2.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1 | work | 177 | 438 | 2.5× | PASS |

Example criteria (test `Backend log test 1`):

```json
{
  "_scope": "work",
  "aboutAgent": {
    "id": "https://lux.collections.yale.edu/data/group/bf219a49-0005-40df-a1d7-402537e9b485"
  }
}
```

## Shape 11 - `memberOf` (n=2, avg 1×, max 1.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 187–198 ms; current range: 141–225 ms
- Ratio: avg 1×, max 1.1×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8707 | agent | 198 | 225 | 1.1× | PASS |
| Backend log test 8199 | agent | 187 | 141 | 0.8× | PASS |

Example criteria (test `Backend log test 8707`):

```json
{
  "_scope": "agent",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/group/ad9f9897-b18f-4824-a130-510d9e83e548"
  }
}
```

## Shape 12 - AND(`aboutConcept`, `aboutEvent`) (n=2, avg 0.7×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 149–215 ms; current range: 118–121 ms
- Ratio: avg 0.7×, max 0.8×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5722 | work | 149 | 118 | 0.8× | PASS |
| Backend log test 9141 | work | 215 | 121 | 0.6× | PASS |

Example criteria (test `Backend log test 5722`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/76040d21-1abe-4686-a92d-c852448c9681"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/0a6cbc99-31d3-41b6-a740-850a0c2850f2"
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

## Shape 13 - AND(`aboutConcept`, `aboutPlace`) (n=2, avg 0.6×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 181–217 ms; current range: 115–121 ms
- Ratio: avg 0.6×, max 0.7×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7141 | work | 181 | 121 | 0.7× | PASS |
| Backend log test 9619 | work | 217 | 115 | 0.5× | PASS |

Example criteria (test `Backend log test 7141`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/a201bdba-27a0-4fbf-be38-7c67722146e6"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/7e1cae5f-af30-412d-aa16-a0b07a1eebf1"
      }
    }
  ]
}
```

## Shape 14 - AND(`aboutAgent`) (n=2, avg 0.6×, max 0.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 224–252 ms; current range: 125–151 ms
- Ratio: avg 0.6×, max 0.6×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4610 | work | 252 | 151 | 0.6× | PASS |
| Backend log test 10178 | work | 224 | 125 | 0.6× | PASS |

Example criteria (test `Backend log test 4610`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/bcb0a04f-d7a7-4fe5-8683-14fb81855423"
      }
    }
  ]
}
```

## Shape 15 - `partOfWork` (n=1, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 150–150 ms; current range: 123–123 ms
- Ratio: avg 0.8×, max 0.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5198 | work | 150 | 123 | 0.8× | PASS |

Example criteria (test `Backend log test 5198`):

```json
{
  "_scope": "work",
  "partOfWork": {
    "id": "https://lux.collections.yale.edu/data/text/9809fac5-55fb-467a-a95a-fca70f51de1b"
  }
}
```

## Shape 16 - `broader` (n=1, avg 0.7×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: concept
- Baseline range: 194–194 ms; current range: 131–131 ms
- Ratio: avg 0.7×, max 0.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9380 | concept | 194 | 131 | 0.7× | PASS |

Example criteria (test `Backend log test 9380`):

```json
{
  "_scope": "concept",
  "broader": {
    "id": "https://lux.collections.yale.edu/data/concept/244ba1c8-7bc6-4cbc-bc97-b19f4e250200"
  }
}
```

## Shape 17 - `aboutPlace` (n=1, avg 0.7×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 178–178 ms; current range: 123–123 ms
- Ratio: avg 0.7×, max 0.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8512 | work | 178 | 123 | 0.7× | PASS |

Example criteria (test `Backend log test 8512`):

```json
{
  "_scope": "work",
  "aboutPlace": {
    "id": "https://lux.collections.yale.edu/data/place/8ba7d7b8-8945-4e38-945d-0dcdb021c82d"
  }
}
```

## Shape 18 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.7×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 173–173 ms; current range: 122–122 ms
- Ratio: avg 0.7×, max 0.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7360 | work | 173 | 122 | 0.7× | PASS |

Example criteria (test `Backend log test 7360`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/15196d25-530c-4c18-a775-d88bcb7464a4"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/ab9740c2-9e70-433d-ae23-459fc414a614"
      }
    }
  ]
}
```

## Shape 19 - AND(`aboutPlace`) (n=1, avg 0.6×, max 0.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 195–195 ms; current range: 124–124 ms
- Ratio: avg 0.6×, max 0.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9740 | work | 195 | 124 | 0.6× | PASS |

Example criteria (test `Backend log test 9740`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/78744cef-313f-42a0-9440-684f673b61ec"
      }
    }
  ]
}
```

## Shape 20 - `endAt` (n=1, avg 0.5×, max 0.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 230–230 ms; current range: 123–123 ms
- Ratio: avg 0.5×, max 0.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6518 | agent | 230 | 123 | 0.5× | PASS |

Example criteria (test `Backend log test 6518`):

```json
{
  "_scope": "agent",
  "endAt": {
    "id": "https://lux.collections.yale.edu/data/place/c15217bd-a29b-46b0-9a83-7fc05854a6b6"
  }
}
```

## Shape 21 - `aboutWork` (n=1, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 144–144 ms; current range: 45–45 ms
- Ratio: avg 0.3×, max 0.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5837 | work | 144 | 45 | 0.3× | PASS |

Example criteria (test `Backend log test 5837`):

```json
{
  "_scope": "work",
  "aboutWork": {
    "id": "https://lux.collections.yale.edu/data/text/6802927b-1828-4bff-89c6-d773438c1687"
  }
}
```
