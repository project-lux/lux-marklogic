## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 10595 tests)](#aggregate-full-10595-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 185-test union](#pattern-shapes--185-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - `carries` (n=22, avg 5.7×, max 11.7×)](#shape-1---carries-n22-avg-57-max-117)
  - [Shape 2 - OR(`memberOf`) (n=9, avg 13.8×, max 21.9×)](#shape-2---ormemberof-n9-avg-138-max-219)
  - [Shape 3 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=17, avg 5.3×, max 10.2×)](#shape-3---orcreatedby-creationinfluencedby-publishedby-n17-avg-53-max-102)
  - [Shape 4 - AND(`aboutConcept`, `aboutPlace`) (n=12, avg 6.6×, max 11.1×)](#shape-4---andaboutconcept-aboutplace-n12-avg-66-max-111)
  - [Shape 5 - OR(`aboutConcept`, `classification`, `language`) (n=56, avg 1.2×, max 3.4×)](#shape-5---oraboutconcept-classification-language-n56-avg-12-max-34)
  - [Shape 6 - AND(`aboutConcept`) (n=15, avg 3.7×, max 8×)](#shape-6---andaboutconcept-n15-avg-37-max-8)
  - [Shape 7 - `used` (n=8, avg 6.9×, max 8.8×)](#shape-7---used-n8-avg-69-max-88)
  - [Shape 8 - AND(`aboutAgent`) (n=6, avg 5.5×, max 10.7×)](#shape-8---andaboutagent-n6-avg-55-max-107)
  - [Shape 9 - AND(`aboutAgent`, `aboutConcept`) (n=3, avg 6×, max 9×)](#shape-9---andaboutagent-aboutconcept-n3-avg-6-max-9)
  - [Shape 10 - `aboutPlace` (n=3, avg 5.5×, max 8.6×)](#shape-10---aboutplace-n3-avg-55-max-86)
  - [Shape 11 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=3, avg 5.5×, max 6.5×)](#shape-11---andaboutconcept-aboutevent-aboutplace-n3-avg-55-max-65)
  - [Shape 12 - `memberOf` (n=5, avg 3.2×, max 6.6×)](#shape-12---memberof-n5-avg-32-max-66)
  - [Shape 13 - `aboutAgent` (n=2, avg 4.6×, max 8.2×)](#shape-13---aboutagent-n2-avg-46-max-82)
  - [Shape 14 - `activeAt` (n=1, avg 8.6×, max 8.6×)](#shape-14---activeat-n1-avg-86-max-86)
  - [Shape 15 - `startAt` (n=1, avg 7.9×, max 7.9×)](#shape-15---startat-n1-avg-79-max-79)
  - [Shape 16 - `partOf` (n=1, avg 7.9×, max 7.9×)](#shape-16---partof-n1-avg-79-max-79)
  - [Shape 17 - AND(`aboutConcept`, `aboutEvent`) (n=3, avg 2.6×, max 7.2×)](#shape-17---andaboutconcept-aboutevent-n3-avg-26-max-72)
  - [Shape 18 - single `text` keyword (n=5, avg 1.4×, max 1.6×)](#shape-18---single-text-keyword-n5-avg-14-max-16)
  - [Shape 19 - multi-`text` AND (n=5, avg 1.2×, max 1.4×)](#shape-19---multi-text-and-n5-avg-12-max-14)
  - [Shape 20 - AND(`?`) (n=1, avg 1.9×, max 1.9×)](#shape-20---and-n1-avg-19-max-19)
  - [Shape 21 - AND(`hasDigitalImage`, `memberOf`, `text`) (n=1, avg 1.2×, max 1.2×)](#shape-21---andhasdigitalimage-memberof-text-n1-avg-12-max-12)
  - [Shape 22 - AND(`hasDigitalImage`, `text`) (n=1, avg 1.1×, max 1.1×)](#shape-22---andhasdigitalimage-text-n1-avg-11-max-11)
  - [Shape 23 - `partOfWork` (n=1, avg 0.4×, max 0.4×)](#shape-23---partofwork-n1-avg-04-max-04)
  - [Shape 24 - `aboutWork` (n=1, avg 0.3×, max 0.3×)](#shape-24---aboutwork-n1-avg-03-max-03)
  - [Shape 25 - `endAt` (n=1, avg 0.2×, max 0.2×)](#shape-25---endat-n1-avg-02-max-02)
  - [Shape 26 - AND(`aboutPlace`) (n=1, avg 0.2×, max 0.2×)](#shape-26---andaboutplace-n1-avg-02-max-02)
  - [Shape 27 - `broader` (n=1, avg 0.2×, max 0.2×)](#shape-27---broader-n1-avg-02-max-02)

# Input

Source: `scratch/pattern-shape-analysis/2026-06-29-cts-v-optic-2211d13-10k-1-single-thread.json`
- baseline: `2026-06-04-cts-search-performance-10k-1-single-thread` (2026-06-04T16:07:27.273Z)
- current:  `2026-06-29-optic-2211d13-10k-1-single-thread` (2026-06-29T11:53:04.763Z)
- generated: 2026-06-29T11:59:16.729Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 185 distinct tests**.
- The middle of the 10595-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 10595.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **15 tests with ≥10× regression**.

# Aggregate (full 10595 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 39.44 ms | 55.09 ms | **+40%** |
| p50 | 34 ms | 46 ms | +35% |
| p90 | 48 ms | 65 ms | +35% |
| p95 | 56.95 ms | 75 ms | +32% |
| p99 | 142 ms | 183.78 ms | +29% |
| p99.9 | 220.77 ms | 333.08 ms | **+51%** |
| Pass rate | 98.7% | 98.7% | 0.0 |

# Severity distribution

Bucketed counts across the 185-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 15 | |
| Moderate (3–10×) | 67 | |
| Mild (<3×) | 103 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 185-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---carries-n22-avg-57-max-117) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 22 | item | 31–205 | 41–363 | 5.7× | 11.7× |
| [2](#shape-2---ormemberof-n9-avg-138-max-219) | OR(`memberOf`) | `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs) | 9 | multi | 29–31 | 378–679 | 13.8× | 21.9× |
| [3](#shape-3---orcreatedby-creationinfluencedby-publishedby-n17-avg-53-max-102) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 17 | work | 31–199 | 44–330 | 5.3× | 10.2× |
| [4](#shape-4---andaboutconcept-aboutplace-n12-avg-66-max-111) | AND(`aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 12 | work | 30–217 | 44–345 | 6.6× | 11.1× |
| [5](#shape-5---oraboutconcept-classification-language-n56-avg-12-max-34) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 56 | work | 84–267 | 149–392 | 1.2× | 3.4× |
| [6](#shape-6---andaboutconcept-n15-avg-37-max-8) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 15 | work | 39–196 | 47–312 | 3.7× | 8× |
| [7](#shape-7---used-n8-avg-69-max-88) | `used` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 8 | event | 31–40 | 216–327 | 6.9× | 8.8× |
| [8](#shape-8---andaboutagent-n6-avg-55-max-107) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 6 | work | 31–252 | 45–332 | 5.5× | 10.7× |
| [9](#shape-9---andaboutagent-aboutconcept-n3-avg-6-max-9) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 31–173 | 61–293 | 6× | 9× |
| [10](#shape-10---aboutplace-n3-avg-55-max-86) | `aboutPlace` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 30–178 | 46–259 | 5.5× | 8.6× |
| [11](#shape-11---andaboutconcept-aboutevent-aboutplace-n3-avg-55-max-65) | AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 48–51 | 209–318 | 5.5× | 6.5× |
| [12](#shape-12---memberof-n5-avg-32-max-66) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 5 | agent,item | 32–198 | 42–231 | 3.2× | 6.6× |
| [13](#shape-13---aboutagent-n2-avg-46-max-82) | `aboutAgent` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 31–177 | 175–253 | 4.6× | 8.2× |
| [14](#shape-14---activeat-n1-avg-86-max-86) | `activeAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 38–38 | 325 | 8.6× | 8.6× |
| [15](#shape-15---startat-n1-avg-79-max-79) | `startAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 37–37 | 294 | 7.9× | 7.9× |
| [16](#shape-16---partof-n1-avg-79-max-79) | `partOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | place | 32–32 | 252 | 7.9× | 7.9× |
| [17](#shape-17---andaboutconcept-aboutevent-n3-avg-26-max-72) | AND(`aboutConcept`, `aboutEvent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 41–215 | 44–294 | 2.6× | 7.2× |
| [18](#shape-18---single-text-keyword-n5-avg-14-max-16) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item | 152–187 | 144–300 | 1.4× | 1.6× |
| [19](#shape-19---multi-text-and-n5-avg-12-max-14) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item | 185–953 | 251–1240 | 1.2× | 1.4× |
| [20](#shape-20---and-n1-avg-19-max-19) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 969–969 | 1846 | 1.9× | 1.9× |
| [21](#shape-21---andhasdigitalimage-memberof-text-n1-avg-12-max-12) | AND(`hasDigitalImage`, `memberOf`, `text`) | [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [IndexedWord](/src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 325–325 | 395 | 1.2× | 1.2× |
| [22](#shape-22---andhasdigitalimage-text-n1-avg-11-max-11) | AND(`hasDigitalImage`, `text`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 182–182 | 201 | 1.1× | 1.1× |
| [23](#shape-23---partofwork-n1-avg-04-max-04) | `partOfWork` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 150–150 | 54 | 0.4× | 0.4× |
| [24](#shape-24---aboutwork-n1-avg-03-max-03) | `aboutWork` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 144–144 | 42 | 0.3× | 0.3× |
| [25](#shape-25---endat-n1-avg-02-max-02) | `endAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 230–230 | 42 | 0.2× | 0.2× |
| [26](#shape-26---andaboutplace-n1-avg-02-max-02) | AND(`aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 195–195 | 43 | 0.2× | 0.2× |
| [27](#shape-27---broader-n1-avg-02-max-02) | `broader` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | concept | 194–194 | 43 | 0.2× | 0.2× |

Total: 185 tests across 27 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - `carries` (n=22, avg 5.7×, max 11.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 31–205 ms; current range: 41–363 ms
- Ratio: avg 5.7×, max 11.7×

Worst 5 of 22:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10177 | item | 31 | 363 | 11.7× | — |
| Backend log test 9664 | item | 31 | 340 | 11× | — |
| Backend log test 10078 | item | 31 | 331 | 10.7× | — |
| Backend log test 8144 | item | 31 | 304 | 9.8× | — |
| Backend log test 8608 | item | 33 | 314 | 9.5× | — |

Example criteria (test `Backend log test 10177`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/6e900378-ac08-4003-a081-b9f88dd1ebdc"
  }
}
```

## Shape 2 - OR(`memberOf`) (n=9, avg 13.8×, max 21.9×)

- Patterns: `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs)
- Scopes: multi
- Baseline range: 29–31 ms; current range: 378–679 ms
- Ratio: avg 13.8×, max 21.9×

Worst 5 of 9:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3 | multi | 31 | 679 | 21.9× | — |
| Backend log test 3612 | multi | 29 | 391 | 13.5× | — |
| Backend log test 1078 | multi | 30 | 392 | 13.1× | — |
| Backend log test 5031 | multi | 29 | 378 | 13× | — |
| Backend log test 219 | multi | 30 | 385 | 12.8× | — |

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

## Shape 3 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=17, avg 5.3×, max 10.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 31–199 ms; current range: 44–330 ms
- Ratio: avg 5.3×, max 10.2×

Worst 5 of 17:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7874 | work | 32 | 326 | 10.2× | — |
| Backend log test 7973 | work | 34 | 330 | 9.7× | — |
| Backend log test 5069 | work | 32 | 269 | 8.4× | — |
| Backend log test 4962 | work | 32 | 259 | 8.1× | — |
| Backend log test 3122 | work | 31 | 231 | 7.5× | — |

Example criteria (test `Backend log test 7874`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/2f4099d2-50aa-4334-887c-530401759715"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/2f4099d2-50aa-4334-887c-530401759715"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/2f4099d2-50aa-4334-887c-530401759715"
      }
    }
  ]
}
```

## Shape 4 - AND(`aboutConcept`, `aboutPlace`) (n=12, avg 6.6×, max 11.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 30–217 ms; current range: 44–345 ms
- Ratio: avg 6.6×, max 11.1×

Worst 5 of 12:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9184 | work | 31 | 345 | 11.1× | — |
| Backend log test 7218 | work | 30 | 286 | 9.5× | — |
| Backend log test 8447 | work | 34 | 319 | 9.4× | — |
| Backend log test 8957 | work | 37 | 330 | 8.9× | — |
| Backend log test 9409 | work | 46 | 341 | 7.4× | — |

Example criteria (test `Backend log test 9184`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/9da4f104-958a-4652-ae10-2c398b6f4e35"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/ce16fbc8-9edc-430a-a745-39c132dfae30"
      }
    }
  ]
}
```

## Shape 5 - OR(`aboutConcept`, `classification`, `language`) (n=56, avg 1.2×, max 3.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 84–267 ms; current range: 149–392 ms
- Ratio: avg 1.2×, max 3.4×

Worst 5 of 56:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1297 | work | 84 | 282 | 3.4× | — |
| Backend log test 4026 | work | 141 | 392 | 2.8× | — |
| Backend log test 14 | work | 171 | 318 | 1.9× | PASS |
| Backend log test 32 | work | 150 | 250 | 1.7× | PASS |
| Backend log test 3850 | work | 142 | 195 | 1.4× | — |

Example criteria (test `Backend log test 1297`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "classification": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/26e2492b-d191-439d-b9cf-8f04a7048aaa"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/26e2492b-d191-439d-b9cf-8f04a7048aaa"
            }
          }
        ]
      }
    },
    {
      "language": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/26e2492b-d191-439d-b9cf-8f04a7048aaa"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/26e2492b-d191-439d-b9cf-8f04a7048aaa"
            }
          }
        ]
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/26e2492b-d191-439d-b9cf-8f04a7048aaa"
      }
    }
  ]
}
```

## Shape 6 - AND(`aboutConcept`) (n=15, avg 3.7×, max 8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 39–196 ms; current range: 47–312 ms
- Ratio: avg 3.7×, max 8×

Worst 5 of 15:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7632 | work | 39 | 312 | 8× | — |
| Backend log test 6164 | work | 44 | 309 | 7× | — |
| Backend log test 3731 | work | 44 | 285 | 6.5× | — |
| Backend log test 3159 | work | 40 | 258 | 6.5× | — |
| Backend log test 4403 | work | 43 | 263 | 6.1× | — |

Example criteria (test `Backend log test 7632`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/f9211138-6000-4501-8f3f-5c596e470b0f"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/f01a1ad7-b685-4606-af4c-480c0fccc977"
      }
    }
  ]
}
```

## Shape 7 - `used` (n=8, avg 6.9×, max 8.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: event
- Baseline range: 31–40 ms; current range: 216–327 ms
- Ratio: avg 6.9×, max 8.8×

Worst 5 of 8:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 186 | event | 37 | 327 | 8.8× | — |
| Backend log test 5432 | event | 31 | 216 | 7× | — |
| Backend log test 4401 | event | 37 | 252 | 6.8× | — |
| Backend log test 8807 | event | 34 | 227 | 6.7× | — |
| Backend log test 9029 | event | 34 | 225 | 6.6× | — |

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

## Shape 8 - AND(`aboutAgent`) (n=6, avg 5.5×, max 10.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 31–252 ms; current range: 45–332 ms
- Ratio: avg 5.5×, max 10.7×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9871 | work | 31 | 332 | 10.7× | — |
| Backend log test 7517 | work | 39 | 307 | 7.9× | — |
| Backend log test 4753 | work | 38 | 264 | 6.9× | — |
| Backend log test 4029 | work | 35 | 242 | 6.9× | — |
| Backend log test 10178 | work | 224 | 63 | 0.3× | PASS |

Example criteria (test `Backend log test 9871`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/group/686cc541-221e-4838-8b8d-31c569f4ba27"
      }
    }
  ]
}
```

## Shape 9 - AND(`aboutAgent`, `aboutConcept`) (n=3, avg 6×, max 9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 31–173 ms; current range: 61–293 ms
- Ratio: avg 6×, max 9×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5905 | work | 31 | 279 | 9× | — |
| Backend log test 6283 | work | 34 | 293 | 8.6× | — |
| Backend log test 7360 | work | 173 | 61 | 0.4× | PASS |

Example criteria (test `Backend log test 5905`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/fb5150a9-a781-42f6-a903-3836b89d11c9"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/c1282215-801f-4982-857a-92832a6f5f08"
      }
    }
  ]
}
```

## Shape 10 - `aboutPlace` (n=3, avg 5.5×, max 8.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 30–178 ms; current range: 46–259 ms
- Ratio: avg 5.5×, max 8.6×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5356 | work | 30 | 259 | 8.6× | — |
| Backend log test 2814 | work | 32 | 239 | 7.5× | — |
| Backend log test 8512 | work | 178 | 46 | 0.3× | PASS |

Example criteria (test `Backend log test 5356`):

```json
{
  "_scope": "work",
  "aboutPlace": {
    "id": "https://lux.collections.yale.edu/data/place/4ac93051-8791-4b1c-a4c4-22a5e24cf76e"
  }
}
```

## Shape 11 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=3, avg 5.5×, max 6.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 48–51 ms; current range: 209–318 ms
- Ratio: avg 5.5×, max 6.5×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7189 | work | 49 | 318 | 6.5× | — |
| Backend log test 5631 | work | 51 | 285 | 5.6× | — |
| Backend log test 73 | work | 48 | 209 | 4.4× | — |

Example criteria (test `Backend log test 7189`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/d643bc7e-e213-4de8-9bef-565a1c21036b"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/e6a9d1f0-fbea-4cd6-a154-dbd159c4993e"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/b2d7d39d-398c-4af8-b323-c292ada5aadf"
      }
    }
  ]
}
```

## Shape 12 - `memberOf` (n=5, avg 3.2×, max 6.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent, item
- Baseline range: 32–198 ms; current range: 42–231 ms
- Ratio: avg 3.2×, max 6.6×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 690 | agent | 32 | 212 | 6.6× | — |
| Backend log test 1693 | agent | 39 | 231 | 5.9× | — |
| Backend log test 7484 | item | 67 | 200 | 3× | — |
| Backend log test 8707 | agent | 198 | 45 | 0.2× | PASS |
| Backend log test 8199 | agent | 187 | 42 | 0.2× | PASS |

Example criteria (test `Backend log test 690`):

```json
{
  "_scope": "agent",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/group/3bd3547e-6d0c-4431-8ffa-0d0211c74882"
  }
}
```

## Shape 13 - `aboutAgent` (n=2, avg 4.6×, max 8.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 31–177 ms; current range: 175–253 ms
- Ratio: avg 4.6×, max 8.2×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4698 | work | 31 | 253 | 8.2× | — |
| Backend log test 1 | work | 177 | 175 | 1× | PASS |

Example criteria (test `Backend log test 4698`):

```json
{
  "_scope": "work",
  "aboutAgent": {
    "id": "https://lux.collections.yale.edu/data/group/5996d9b1-c132-4fb6-a594-8a7e9b5a918c"
  }
}
```

## Shape 14 - `activeAt` (n=1, avg 8.6×, max 8.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 38–38 ms; current range: 325–325 ms
- Ratio: avg 8.6×, max 8.6×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6960 | agent | 38 | 325 | 8.6× | — |

Example criteria (test `Backend log test 6960`):

```json
{
  "_scope": "agent",
  "activeAt": {
    "id": "https://lux.collections.yale.edu/data/place/3fd8831d-052d-4df7-a158-e403e37a740f"
  }
}
```

## Shape 15 - `startAt` (n=1, avg 7.9×, max 7.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 37–37 ms; current range: 294–294 ms
- Ratio: avg 7.9×, max 7.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6707 | agent | 37 | 294 | 7.9× | — |

Example criteria (test `Backend log test 6707`):

```json
{
  "_scope": "agent",
  "startAt": {
    "id": "https://lux.collections.yale.edu/data/place/ce0aace7-3fce-472a-895b-8e8414830054"
  }
}
```

## Shape 16 - `partOf` (n=1, avg 7.9×, max 7.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: place
- Baseline range: 32–32 ms; current range: 252–252 ms
- Ratio: avg 7.9×, max 7.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2801 | place | 32 | 252 | 7.9× | — |

Example criteria (test `Backend log test 2801`):

```json
{
  "_scope": "place",
  "partOf": {
    "id": "https://lux.collections.yale.edu/data/place/fa96fd5c-3104-49bb-a779-b00120999e3b"
  }
}
```

## Shape 17 - AND(`aboutConcept`, `aboutEvent`) (n=3, avg 2.6×, max 7.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 41–215 ms; current range: 44–294 ms
- Ratio: avg 2.6×, max 7.2×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6865 | work | 41 | 294 | 7.2× | — |
| Backend log test 9141 | work | 215 | 64 | 0.3× | PASS |
| Backend log test 5722 | work | 149 | 44 | 0.3× | PASS |

Example criteria (test `Backend log test 6865`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/6ac30833-0873-4428-a9c8-f24741a6f4b1"
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

## Shape 18 - single `text` keyword (n=5, avg 1.4×, max 1.6×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 152–187 ms; current range: 144–300 ms
- Ratio: avg 1.4×, max 1.6×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2591 | item | 184 | 300 | 1.6× | PASS |
| Backend log test 2630 | item | 183 | 297 | 1.6× | PASS |
| Backend log test 9884 | item | 182 | 287 | 1.6× | PASS |
| Backend log test 2656 | item | 187 | 259 | 1.4× | PASS |
| Backend log test 165 | item | 152 | 144 | 0.9× | PASS |

Example criteria (test `Backend log test 2591`):

```json
{
  "_scope": "item",
  "text": "sharaku",
  "_lang": "en"
}
```

## Shape 19 - multi-`text` AND (n=5, avg 1.2×, max 1.4×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 185–953 ms; current range: 251–1240 ms
- Ratio: avg 1.2×, max 1.4×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7397 | item | 185 | 251 | 1.4× | PASS |
| Backend log test 6077 | item | 953 | 1240 | 1.3× | PASS |
| Backend log test 3577 | item | 427 | 497 | 1.2× | PASS |
| Backend log test 2351 | item | 334 | 380 | 1.1× | PASS |
| Backend log test 7385 | item | 292 | 334 | 1.1× | PASS |

Example criteria (test `Backend log test 7397`):

```json
{
  "_scope": "item",
  "AND": [
    {
      "text": "Filho",
      "_lang": "en"
    },
    {
      "text": "do",
      "_lang": "en"
    },
    {
      "text": "Piseiro",
      "_lang": "en"
    }
  ]
}
```

## Shape 20 - AND(`?`) (n=1, avg 1.9×, max 1.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 969–969 ms; current range: 1846–1846 ms
- Ratio: avg 1.9×, max 1.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 969 | 1846 | 1.9× | PASS |

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

## Shape 21 - AND(`hasDigitalImage`, `memberOf`, `text`) (n=1, avg 1.2×, max 1.2×)

- Patterns: [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [IndexedWord](/src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 325–325 ms; current range: 395–395 ms
- Ratio: avg 1.2×, max 1.2×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6152 | item | 325 | 395 | 1.2× | PASS |

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

## Shape 22 - AND(`hasDigitalImage`, `text`) (n=1, avg 1.1×, max 1.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [IndexedValue](/src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 182–182 ms; current range: 201–201 ms
- Ratio: avg 1.1×, max 1.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7332 | item | 182 | 201 | 1.1× | PASS |

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

## Shape 23 - `partOfWork` (n=1, avg 0.4×, max 0.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 150–150 ms; current range: 54–54 ms
- Ratio: avg 0.4×, max 0.4×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5198 | work | 150 | 54 | 0.4× | PASS |

Example criteria (test `Backend log test 5198`):

```json
{
  "_scope": "work",
  "partOfWork": {
    "id": "https://lux.collections.yale.edu/data/text/9809fac5-55fb-467a-a95a-fca70f51de1b"
  }
}
```

## Shape 24 - `aboutWork` (n=1, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 144–144 ms; current range: 42–42 ms
- Ratio: avg 0.3×, max 0.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5837 | work | 144 | 42 | 0.3× | PASS |

Example criteria (test `Backend log test 5837`):

```json
{
  "_scope": "work",
  "aboutWork": {
    "id": "https://lux.collections.yale.edu/data/text/6802927b-1828-4bff-89c6-d773438c1687"
  }
}
```

## Shape 25 - `endAt` (n=1, avg 0.2×, max 0.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 230–230 ms; current range: 42–42 ms
- Ratio: avg 0.2×, max 0.2×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6518 | agent | 230 | 42 | 0.2× | PASS |

Example criteria (test `Backend log test 6518`):

```json
{
  "_scope": "agent",
  "endAt": {
    "id": "https://lux.collections.yale.edu/data/place/c15217bd-a29b-46b0-9a83-7fc05854a6b6"
  }
}
```

## Shape 26 - AND(`aboutPlace`) (n=1, avg 0.2×, max 0.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 195–195 ms; current range: 43–43 ms
- Ratio: avg 0.2×, max 0.2×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9740 | work | 195 | 43 | 0.2× | PASS |

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

## Shape 27 - `broader` (n=1, avg 0.2×, max 0.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: concept
- Baseline range: 194–194 ms; current range: 43–43 ms
- Ratio: avg 0.2×, max 0.2×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9380 | concept | 194 | 43 | 0.2× | PASS |

Example criteria (test `Backend log test 9380`):

```json
{
  "_scope": "concept",
  "broader": {
    "id": "https://lux.collections.yale.edu/data/concept/244ba1c8-7bc6-4cbc-bc97-b19f4e250200"
  }
}
```
