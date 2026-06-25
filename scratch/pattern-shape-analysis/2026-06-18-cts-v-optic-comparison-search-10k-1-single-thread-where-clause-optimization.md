## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 10595 tests)](#aggregate-full-10595-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 160-test union](#pattern-shapes--160-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - `broader` (n=11, avg 203.1×, max 269.1×)](#shape-1---broader-n11-avg-2031-max-2691)
  - [Shape 2 - `partOf` (n=2, avg 286×, max 298.3×)](#shape-2---partof-n2-avg-286-max-2983)
  - [Shape 3 - OR(`aboutConcept`, `classification`, `language`) (n=95, avg 5.3×, max 13.4×)](#shape-3---oraboutconcept-classification-language-n95-avg-53-max-134)
  - [Shape 4 - `used` (n=2, avg 207.9×, max 215.6×)](#shape-4---used-n2-avg-2079-max-2156)
  - [Shape 5 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=6, avg 6.3×, max 31.5×)](#shape-5---orcreatedby-creationinfluencedby-publishedby-n6-avg-63-max-315)
  - [Shape 6 - AND(`aboutConcept`) (n=7, avg 4.5×, max 27.2×)](#shape-6---andaboutconcept-n7-avg-45-max-272)
  - [Shape 7 - AND(`aboutAgent`) (n=3, avg 9.8×, max 28.4×)](#shape-7---andaboutagent-n3-avg-98-max-284)
  - [Shape 8 - `aboutAgent` (n=1, avg 26.6×, max 26.6×)](#shape-8---aboutagent-n1-avg-266-max-266)
  - [Shape 9 - AND(`aboutConcept`, `aboutPlace`) (n=3, avg 6.4×, max 17.9×)](#shape-9---andaboutconcept-aboutplace-n3-avg-64-max-179)
  - [Shape 10 - AND(`?`) (n=1, avg 9.4×, max 9.4×)](#shape-10---and-n1-avg-94-max-94)
  - [Shape 11 - AND(`hasDigitalImage`, `memberOf`, `text`) (n=1, avg 7.7×, max 7.7×)](#shape-11---andhasdigitalimage-memberof-text-n1-avg-77-max-77)
  - [Shape 12 - single `text` keyword (n=5, avg 1.5×, max 1.6×)](#shape-12---single-text-keyword-n5-avg-15-max-16)
  - [Shape 13 - AND(`hasDigitalImage`, `text`) (n=1, avg 6×, max 6×)](#shape-13---andhasdigitalimage-text-n1-avg-6-max-6)
  - [Shape 14 - multi-`text` AND (n=5, avg 1.2×, max 1.3×)](#shape-14---multi-text-and-n5-avg-12-max-13)
  - [Shape 15 - `carries` (n=7, avg 0.7×, max 0.8×)](#shape-15---carries-n7-avg-07-max-08)
  - [Shape 16 - AND(`aboutConcept`, `aboutEvent`) (n=2, avg 0.7×, max 0.8×)](#shape-16---andaboutconcept-aboutevent-n2-avg-07-max-08)
  - [Shape 17 - `memberOf` (n=2, avg 0.6×, max 0.7×)](#shape-17---memberof-n2-avg-06-max-07)
  - [Shape 18 - `partOfWork` (n=1, avg 1×, max 1×)](#shape-18---partofwork-n1-avg-1-max-1)
  - [Shape 19 - `aboutWork` (n=1, avg 0.8×, max 0.8×)](#shape-19---aboutwork-n1-avg-08-max-08)
  - [Shape 20 - `aboutPlace` (n=1, avg 0.7×, max 0.7×)](#shape-20---aboutplace-n1-avg-07-max-07)
  - [Shape 21 - AND(`aboutPlace`) (n=1, avg 0.6×, max 0.6×)](#shape-21---andaboutplace-n1-avg-06-max-06)
  - [Shape 22 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.6×, max 0.6×)](#shape-22---andaboutagent-aboutconcept-n1-avg-06-max-06)
  - [Shape 23 - `endAt` (n=1, avg 0.5×, max 0.5×)](#shape-23---endat-n1-avg-05-max-05)

# Input

Source: `scratch/pattern-analysis/2026-06-18-cts-v-optic-comparison-search-10k-1-single-thread-where-clause-optimization.json`
- baseline: `2026-06-04-cts-search-performance-10k-1-single-thread` (2026-06-04T16:07:27.273Z)
- current:  `2026-06-18-optic-search-performance-10k-1-single-thread-where-clause-optimization` (2026-06-18T16:41:51.547Z)
- generated: 2026-06-23T15:53:48.802Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 160 distinct tests**.
- The middle of the 10595-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 10595.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **20 tests with ≥10× regression**.

# Aggregate (full 10595 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 39.44 ms | 147.27 ms | **+273%** |
| p50 | 34 ms | 122 ms | +259% |
| p90 | 48 ms | 151 ms | +215% |
| p95 | 56.95 ms | 182 ms | +220% |
| p99 | 142 ms | 747.41 ms | +426% |
| p99.9 | 220.77 ms | 7268.44 ms | **+3192%** |
| Pass rate | 98.7% | 98.7% | 0.0 |

# Severity distribution

Bucketed counts across the 160-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 20 | |
| Moderate (3–10×) | 95 | |
| Mild (<3×) | 45 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 160-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---broader-n11-avg-2031-max-2691) | `broader` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 11 | concept | 32–194 | 162–8611 | 203.1× | 269.1× |
| [2](#shape-2---partof-n2-avg-286-max-2983) | `partOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | place | 36–37 | 10123–10737 | 286× | 298.3× |
| [3](#shape-3---oraboutconcept-classification-language-n95-avg-53-max-134) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 95 | work | 132–267 | 491–2289 | 5.3× | 13.4× |
| [4](#shape-4---used-n2-avg-2079-max-2156) | `used` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | event | 37–40 | 7403–8623 | 207.9× | 215.6× |
| [5](#shape-5---orcreatedby-creationinfluencedby-publishedby-n6-avg-63-max-315) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 6 | work | 31–199 | 119–977 | 6.3× | 31.5× |
| [6](#shape-6---andaboutconcept-n7-avg-45-max-272) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 7 | work | 80–196 | 110–2172 | 4.5× | 27.2× |
| [7](#shape-7---andaboutagent-n3-avg-98-max-284) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 30–252 | 118–853 | 9.8× | 28.4× |
| [8](#shape-8---aboutagent-n1-avg-266-max-266) | `aboutAgent` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 177–177 | 4712 | 26.6× | 26.6× |
| [9](#shape-9---andaboutconcept-aboutplace-n3-avg-64-max-179) | AND(`aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 48–217 | 115–860 | 6.4× | 17.9× |
| [10](#shape-10---and-n1-avg-94-max-94) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 969–969 | 9145 | 9.4× | 9.4× |
| [11](#shape-11---andhasdigitalimage-memberof-text-n1-avg-77-max-77) | AND(`hasDigitalImage`, `memberOf`, `text`) | [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [IndexedWord](/src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 325–325 | 2491 | 7.7× | 7.7× |
| [12](#shape-12---single-text-keyword-n5-avg-15-max-16) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item | 152–187 | 222–291 | 1.5× | 1.6× |
| [13](#shape-13---andhasdigitalimage-text-n1-avg-6-max-6) | AND(`hasDigitalImage`, `text`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 182–182 | 1092 | 6× | 6× |
| [14](#shape-14---multi-text-and-n5-avg-12-max-13) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item | 185–953 | 200–1063 | 1.2× | 1.3× |
| [15](#shape-15---carries-n7-avg-07-max-08) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 7 | item | 148–205 | 118–120 | 0.7× | 0.8× |
| [16](#shape-16---andaboutconcept-aboutevent-n2-avg-07-max-08) | AND(`aboutConcept`, `aboutEvent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 149–215 | 119–132 | 0.7× | 0.8× |
| [17](#shape-17---memberof-n2-avg-06-max-07) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | agent | 187–198 | 121–122 | 0.6× | 0.7× |
| [18](#shape-18---partofwork-n1-avg-1-max-1) | `partOfWork` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 150–150 | 149 | 1× | 1× |
| [19](#shape-19---aboutwork-n1-avg-08-max-08) | `aboutWork` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 144–144 | 115 | 0.8× | 0.8× |
| [20](#shape-20---aboutplace-n1-avg-07-max-07) | `aboutPlace` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 178–178 | 121 | 0.7× | 0.7× |
| [21](#shape-21---andaboutplace-n1-avg-06-max-06) | AND(`aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 195–195 | 119 | 0.6× | 0.6× |
| [22](#shape-22---andaboutagent-aboutconcept-n1-avg-06-max-06) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 173–173 | 111 | 0.6× | 0.6× |
| [23](#shape-23---endat-n1-avg-05-max-05) | `endAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 230–230 | 113 | 0.5× | 0.5× |

Total: 160 tests across 23 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - `broader` (n=11, avg 203.1×, max 269.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: concept
- Baseline range: 32–194 ms; current range: 162–8611 ms
- Ratio: avg 203.1×, max 269.1×

Worst 5 of 11:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1872 | concept | 32 | 8611 | 269.1× | — |
| Backend log test 1578 | concept | 32 | 8207 | 256.5× | — |
| Backend log test 5285 | concept | 32 | 8093 | 252.9× | — |
| Backend log test 7072 | concept | 35 | 7856 | 224.5× | — |
| Backend log test 3896 | concept | 37 | 8229 | 222.4× | — |

Example criteria (test `Backend log test 1872`):

```json
{
  "_scope": "concept",
  "broader": {
    "id": "https://lux.collections.yale.edu/data/concept/5a4d8808-4813-4724-828f-8f1382191f5e"
  }
}
```

## Shape 2 - `partOf` (n=2, avg 286×, max 298.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: place
- Baseline range: 36–37 ms; current range: 10123–10737 ms
- Ratio: avg 286×, max 298.3×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 65 | place | 36 | 10737 | 298.3× | — |
| Backend log test 7243 | place | 37 | 10123 | 273.6× | — |

Example criteria (test `Backend log test 65`):

```json
{
  "_scope": "place",
  "partOf": {
    "id": "https://lux.collections.yale.edu/data/place/67edbeb9-d8ad-4c39-a3c5-3b997c19d1a3"
  }
}
```

## Shape 3 - OR(`aboutConcept`, `classification`, `language`) (n=95, avg 5.3×, max 13.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 132–267 ms; current range: 491–2289 ms
- Ratio: avg 5.3×, max 13.4×

Worst 5 of 95:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 14 | work | 171 | 2289 | 13.4× | PASS |
| Backend log test 3190 | work | 136 | 938 | 6.9× | — |
| Backend log test 3895 | work | 150 | 923 | 6.2× | PASS |
| Backend log test 32 | work | 150 | 912 | 6.1× | PASS |
| Backend log test 7510 | work | 133 | 806 | 6.1× | — |

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

## Shape 4 - `used` (n=2, avg 207.9×, max 215.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: event
- Baseline range: 37–40 ms; current range: 7403–8623 ms
- Ratio: avg 207.9×, max 215.6×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2606 | event | 40 | 8623 | 215.6× | — |
| Backend log test 4401 | event | 37 | 7403 | 200.1× | — |

Example criteria (test `Backend log test 2606`):

```json
{
  "_scope": "event",
  "used": {
    "containingItem": {
      "producedBy": {
        "id": "https://lux.collections.yale.edu/data/person/e17df9e9-7254-409f-98c3-7c2fb3e73cd1"
      }
    }
  }
}
```

## Shape 5 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=6, avg 6.3×, max 31.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 31–199 ms; current range: 119–977 ms
- Ratio: avg 6.3×, max 31.5×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3174 | work | 31 | 977 | 31.5× | — |
| Backend log test 2 | work | 163 | 407 | 2.5× | PASS |
| Backend log test 7659 | work | 176 | 230 | 1.3× | PASS |
| Backend log test 6816 | work | 158 | 119 | 0.8× | PASS |
| Backend log test 5450 | work | 147 | 123 | 0.8× | PASS |

Example criteria (test `Backend log test 3174`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/e470b107-8bda-48aa-899b-083eed293600"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/e470b107-8bda-48aa-899b-083eed293600"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/e470b107-8bda-48aa-899b-083eed293600"
      }
    }
  ]
}
```

## Shape 6 - AND(`aboutConcept`) (n=7, avg 4.5×, max 27.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 80–196 ms; current range: 110–2172 ms
- Ratio: avg 4.5×, max 27.2×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 68 | work | 80 | 2172 | 27.2× | — |
| Backend log test 6015 | work | 168 | 149 | 0.9× | PASS |
| Backend log test 6337 | work | 158 | 119 | 0.8× | PASS |
| Backend log test 5021 | work | 157 | 125 | 0.8× | PASS |
| Backend log test 5359 | work | 146 | 117 | 0.8× | PASS |

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

## Shape 7 - AND(`aboutAgent`) (n=3, avg 9.8×, max 28.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 30–252 ms; current range: 118–853 ms
- Ratio: avg 9.8×, max 28.4×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3178 | work | 30 | 853 | 28.4× | — |
| Backend log test 4610 | work | 252 | 121 | 0.5× | PASS |
| Backend log test 10178 | work | 224 | 118 | 0.5× | PASS |

Example criteria (test `Backend log test 3178`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/group/e77042e1-709b-4b8a-bf8c-111979ba9304"
      }
    }
  ]
}
```

## Shape 8 - `aboutAgent` (n=1, avg 26.6×, max 26.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 177–177 ms; current range: 4712–4712 ms
- Ratio: avg 26.6×, max 26.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1 | work | 177 | 4712 | 26.6× | PASS |

Example criteria (test `Backend log test 1`):

```json
{
  "_scope": "work",
  "aboutAgent": {
    "id": "https://lux.collections.yale.edu/data/group/bf219a49-0005-40df-a1d7-402537e9b485"
  }
}
```

## Shape 9 - AND(`aboutConcept`, `aboutPlace`) (n=3, avg 6.4×, max 17.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 48–217 ms; current range: 115–860 ms
- Ratio: avg 6.4×, max 17.9×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3175 | work | 48 | 860 | 17.9× | — |
| Backend log test 9619 | work | 217 | 125 | 0.6× | PASS |
| Backend log test 7141 | work | 181 | 115 | 0.6× | PASS |

Example criteria (test `Backend log test 3175`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/ddd5de1b-0d2a-4e0c-84e3-b1d49c16b974"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/d422354c-12b7-4137-a323-2821e4200bab"
      }
    }
  ]
}
```

## Shape 10 - AND(`?`) (n=1, avg 9.4×, max 9.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 969–969 ms; current range: 9145–9145 ms
- Ratio: avg 9.4×, max 9.4×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 969 | 9145 | 9.4× | PASS |

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

## Shape 11 - AND(`hasDigitalImage`, `memberOf`, `text`) (n=1, avg 7.7×, max 7.7×)

- Patterns: [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [IndexedWord](/src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 325–325 ms; current range: 2491–2491 ms
- Ratio: avg 7.7×, max 7.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6152 | item | 325 | 2491 | 7.7× | PASS |

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

## Shape 12 - single `text` keyword (n=5, avg 1.5×, max 1.6×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 152–187 ms; current range: 222–291 ms
- Ratio: avg 1.5×, max 1.6×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2630 | item | 183 | 291 | 1.6× | PASS |
| Backend log test 2591 | item | 184 | 267 | 1.5× | PASS |
| Backend log test 9884 | item | 182 | 275 | 1.5× | PASS |
| Backend log test 165 | item | 152 | 222 | 1.5× | PASS |
| Backend log test 2656 | item | 187 | 257 | 1.4× | PASS |

Example criteria (test `Backend log test 2630`):

```json
{
  "_scope": "item",
  "text": "harunobu",
  "_lang": "en"
}
```

## Shape 13 - AND(`hasDigitalImage`, `text`) (n=1, avg 6×, max 6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 182–182 ms; current range: 1092–1092 ms
- Ratio: avg 6×, max 6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7332 | item | 182 | 1092 | 6× | PASS |

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

## Shape 14 - multi-`text` AND (n=5, avg 1.2×, max 1.3×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 185–953 ms; current range: 200–1063 ms
- Ratio: avg 1.2×, max 1.3×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2351 | item | 334 | 440 | 1.3× | PASS |
| Backend log test 3577 | item | 427 | 505 | 1.2× | PASS |
| Backend log test 7385 | item | 292 | 344 | 1.2× | PASS |
| Backend log test 6077 | item | 953 | 1063 | 1.1× | PASS |
| Backend log test 7397 | item | 185 | 200 | 1.1× | PASS |

Example criteria (test `Backend log test 2351`):

```json
{
  "_scope": "item",
  "AND": [
    {
      "text": "kitagawa",
      "_lang": "en"
    },
    {
      "text": "utamaro",
      "_lang": "en"
    }
  ]
}
```

## Shape 15 - `carries` (n=7, avg 0.7×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 148–205 ms; current range: 118–120 ms
- Ratio: avg 0.7×, max 0.8×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6573 | item | 154 | 120 | 0.8× | PASS |
| Backend log test 7058 | item | 153 | 118 | 0.8× | PASS |
| Backend log test 5006 | item | 148 | 120 | 0.8× | PASS |
| Backend log test 6819 | item | 166 | 118 | 0.7× | PASS |
| Backend log test 6066 | item | 161 | 120 | 0.7× | PASS |

Example criteria (test `Backend log test 6573`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/c1a3b2c2-01d0-45b6-b2bd-441e2ae29807"
  }
}
```

## Shape 16 - AND(`aboutConcept`, `aboutEvent`) (n=2, avg 0.7×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 149–215 ms; current range: 119–132 ms
- Ratio: avg 0.7×, max 0.8×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5722 | work | 149 | 119 | 0.8× | PASS |
| Backend log test 9141 | work | 215 | 132 | 0.6× | PASS |

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

## Shape 17 - `memberOf` (n=2, avg 0.6×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 187–198 ms; current range: 121–122 ms
- Ratio: avg 0.6×, max 0.7×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8199 | agent | 187 | 122 | 0.7× | PASS |
| Backend log test 8707 | agent | 198 | 121 | 0.6× | PASS |

Example criteria (test `Backend log test 8199`):

```json
{
  "_scope": "agent",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/group/6818157e-a4c7-4337-ad96-4bc2dcf7a54f"
  }
}
```

## Shape 18 - `partOfWork` (n=1, avg 1×, max 1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 150–150 ms; current range: 149–149 ms
- Ratio: avg 1×, max 1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5198 | work | 150 | 149 | 1× | PASS |

Example criteria (test `Backend log test 5198`):

```json
{
  "_scope": "work",
  "partOfWork": {
    "id": "https://lux.collections.yale.edu/data/text/9809fac5-55fb-467a-a95a-fca70f51de1b"
  }
}
```

## Shape 19 - `aboutWork` (n=1, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 144–144 ms; current range: 115–115 ms
- Ratio: avg 0.8×, max 0.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5837 | work | 144 | 115 | 0.8× | PASS |

Example criteria (test `Backend log test 5837`):

```json
{
  "_scope": "work",
  "aboutWork": {
    "id": "https://lux.collections.yale.edu/data/text/6802927b-1828-4bff-89c6-d773438c1687"
  }
}
```

## Shape 20 - `aboutPlace` (n=1, avg 0.7×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 178–178 ms; current range: 121–121 ms
- Ratio: avg 0.7×, max 0.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8512 | work | 178 | 121 | 0.7× | PASS |

Example criteria (test `Backend log test 8512`):

```json
{
  "_scope": "work",
  "aboutPlace": {
    "id": "https://lux.collections.yale.edu/data/place/8ba7d7b8-8945-4e38-945d-0dcdb021c82d"
  }
}
```

## Shape 21 - AND(`aboutPlace`) (n=1, avg 0.6×, max 0.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 195–195 ms; current range: 119–119 ms
- Ratio: avg 0.6×, max 0.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9740 | work | 195 | 119 | 0.6× | PASS |

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

## Shape 22 - AND(`aboutAgent`, `aboutConcept`) (n=1, avg 0.6×, max 0.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 173–173 ms; current range: 111–111 ms
- Ratio: avg 0.6×, max 0.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7360 | work | 173 | 111 | 0.6× | PASS |

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

## Shape 23 - `endAt` (n=1, avg 0.5×, max 0.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 230–230 ms; current range: 113–113 ms
- Ratio: avg 0.5×, max 0.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6518 | agent | 230 | 113 | 0.5× | PASS |

Example criteria (test `Backend log test 6518`):

```json
{
  "_scope": "agent",
  "endAt": {
    "id": "https://lux.collections.yale.edu/data/place/c15217bd-a29b-46b0-9a83-7fc05854a6b6"
  }
}
```
