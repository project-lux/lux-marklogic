## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 11182 tests)](#aggregate-full-11182-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 168-test union](#pattern-shapes--168-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - OR(`memberOf`) (n=11, avg 13.7×, max 24.1×)](#shape-1---ormemberof-n11-avg-137-max-241)
  - [Shape 2 - OR(`aboutConcept`, `classification`, `language`) (n=51, avg 1.6×, max 3.3×)](#shape-2---oraboutconcept-classification-language-n51-avg-16-max-33)
  - [Shape 3 - AND(`aboutConcept`, `aboutPlace`) (n=12, avg 5.4×, max 8.5×)](#shape-3---andaboutconcept-aboutplace-n12-avg-54-max-85)
  - [Shape 4 - AND(`aboutConcept`) (n=14, avg 4.2×, max 9×)](#shape-4---andaboutconcept-n14-avg-42-max-9)
  - [Shape 5 - `carries` (n=14, avg 4.1×, max 10.6×)](#shape-5---carries-n14-avg-41-max-106)
  - [Shape 6 - `memberOf` (n=4, avg 14×, max 36.9×)](#shape-6---memberof-n4-avg-14-max-369)
  - [Shape 7 - `classification` (n=3, avg 15×, max 30.1×)](#shape-7---classification-n3-avg-15-max-301)
  - [Shape 8 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=9, avg 3.8×, max 7.9×)](#shape-8---orcreatedby-creationinfluencedby-publishedby-n9-avg-38-max-79)
  - [Shape 9 - AND(`aboutAgent`) (n=5, avg 5.1×, max 8.5×)](#shape-9---andaboutagent-n5-avg-51-max-85)
  - [Shape 10 - `gender` (n=1, avg 24.1×, max 24.1×)](#shape-10---gender-n1-avg-241-max-241)
  - [Shape 11 - `used` (n=3, avg 6.6×, max 8.9×)](#shape-11---used-n3-avg-66-max-89)
  - [Shape 12 - AND(`aboutAgent`, `aboutConcept`) (n=3, avg 5.9×, max 8.5×)](#shape-12---andaboutagent-aboutconcept-n3-avg-59-max-85)
  - [Shape 13 - single `text` keyword (n=8, avg 2.2×, max 2.3×)](#shape-13---single-text-keyword-n8-avg-22-max-23)
  - [Shape 14 - `startAt` (n=3, avg 5.8×, max 9.1×)](#shape-14---startat-n3-avg-58-max-91)
  - [Shape 15 - `partOfWork` (n=2, avg 7.7×, max 8.1×)](#shape-15---partofwork-n2-avg-77-max-81)
  - [Shape 16 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=3, avg 5.1×, max 7.8×)](#shape-16---andaboutconcept-aboutevent-aboutplace-n3-avg-51-max-78)
  - [Shape 17 - multi-`text` AND (n=5, avg 2.4×, max 4.1×)](#shape-17---multi-text-and-n5-avg-24-max-41)
  - [Shape 18 - AND(`aboutPlace`) (n=2, avg 5.7×, max 6.1×)](#shape-18---andaboutplace-n2-avg-57-max-61)
  - [Shape 19 - AND(`aboutWork`) (n=3, avg 3.4×, max 7.4×)](#shape-19---andaboutwork-n3-avg-34-max-74)
  - [Shape 20 - OR(`classification`, `material`) (n=1, avg 8.5×, max 8.5×)](#shape-20---orclassification-material-n1-avg-85-max-85)
  - [Shape 21 - `partOf` (n=1, avg 7.7×, max 7.7×)](#shape-21---partof-n1-avg-77-max-77)
  - [Shape 22 - AND(`aboutConcept`, `aboutEvent`) (n=3, avg 1.1×, max 1.5×)](#shape-22---andaboutconcept-aboutevent-n3-avg-11-max-15)
  - [Shape 23 - `aboutAgent` (n=1, avg 3.3×, max 3.3×)](#shape-23---aboutagent-n1-avg-33-max-33)
  - [Shape 24 - `influencedByConcept` (n=1, avg 1.8×, max 1.8×)](#shape-24---influencedbyconcept-n1-avg-18-max-18)
  - [Shape 25 - `aboutPlace` (n=2, avg 0.9×, max 0.9×)](#shape-25---aboutplace-n2-avg-09-max-09)
  - [Shape 26 - AND(`?`) (n=1, avg 1.4×, max 1.4×)](#shape-26---and-n1-avg-14-max-14)
  - [Shape 27 - OR(`encounteredAt`, `producedAt`) (n=1, avg 0.9×, max 0.9×)](#shape-27---orencounteredat-producedat-n1-avg-09-max-09)
  - [Shape 28 - `activeAt` (n=1, avg 0.7×, max 0.7×)](#shape-28---activeat-n1-avg-07-max-07)

# Input

Source: `scratch/pattern-shape-analysis/2026-06-26-cts-v-optic-c16f1c8-10k-3-single-thread.json`
- baseline: `2026-06-25-cts-10k-3-single-thread` (2026-06-25T19:19:31.296Z)
- current:  `2026-06-26-optic-c16f1c8-10k-3-single-thread` (2026-06-26T19:23:39.750Z)
- generated: 2026-06-26T19:42:21.029Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 168 distinct tests**.
- The middle of the 11182-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 11182.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **15 tests with ≥10× regression**.

# Aggregate (full 11182 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 39.67 ms | 131.76 ms | **+232%** |
| p50 | 34 ms | 123 ms | +262% |
| p90 | 49 ms | 153 ms | +212% |
| p95 | 56 ms | 163.45 ms | +192% |
| p99 | 123 ms | 236.09 ms | +92% |
| p99.9 | 192.64 ms | 462.36 ms | **+140%** |
| Pass rate | 99.2% | 99.2% | 0.0 |

# Severity distribution

Bucketed counts across the 168-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 15 | |
| Moderate (3–10×) | 52 | |
| Mild (<3×) | 101 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 168-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---ormemberof-n11-avg-137-max-241) | OR(`memberOf`) | `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs) | 11 | multi | 30–34 | 352–796 | 13.7× | 24.1× |
| [2](#shape-2---oraboutconcept-classification-language-n51-avg-16-max-33) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 51 | work | 95–319 | 187–398 | 1.6× | 3.3× |
| [3](#shape-3---andaboutconcept-aboutplace-n12-avg-54-max-85) | AND(`aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 12 | work | 32–169 | 120–284 | 5.4× | 8.5× |
| [4](#shape-4---andaboutconcept-n14-avg-42-max-9) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 14 | work | 31–169 | 119–310 | 4.2× | 9× |
| [5](#shape-5---carries-n14-avg-41-max-106) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 14 | item | 29–258 | 118–306 | 4.1× | 10.6× |
| [6](#shape-6---memberof-n4-avg-14-max-369) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 4 | agent,item | 35–167 | 196–4609 | 14× | 36.9× |
| [7](#shape-7---classification-n3-avg-15-max-301) | `classification` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | agent,event | 34–90 | 256–2709 | 15× | 30.1× |
| [8](#shape-8---orcreatedby-creationinfluencedby-publishedby-n9-avg-38-max-79) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 9 | work | 33–171 | 121–270 | 3.8× | 7.9× |
| [9](#shape-9---andaboutagent-n5-avg-51-max-85) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 5 | work | 32–134 | 118–271 | 5.1× | 8.5× |
| [10](#shape-10---gender-n1-avg-241-max-241) | `gender` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 94–94 | 2264 | 24.1× | 24.1× |
| [11](#shape-11---used-n3-avg-66-max-89) | `used` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | event | 41–53 | 254–364 | 6.6× | 8.9× |
| [12](#shape-12---andaboutagent-aboutconcept-n3-avg-59-max-85) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 32–140 | 124–289 | 5.9× | 8.5× |
| [13](#shape-13---single-text-keyword-n8-avg-22-max-23) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 8 | item | 118–216 | 263–504 | 2.2× | 2.3× |
| [14](#shape-14---startat-n3-avg-58-max-91) | `startAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | agent | 32–159 | 124–292 | 5.8× | 9.1× |
| [15](#shape-15---partofwork-n2-avg-77-max-81) | `partOfWork` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 34–34 | 246–275 | 7.7× | 8.1× |
| [16](#shape-16---andaboutconcept-aboutevent-aboutplace-n3-avg-51-max-78) | AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 33–173 | 125–256 | 5.1× | 7.8× |
| [17](#shape-17---multi-text-and-n5-avg-24-max-41) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item,place,work | 186–922 | 441–1146 | 2.4× | 4.1× |
| [18](#shape-18---andaboutplace-n2-avg-57-max-61) | AND(`aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 46–49 | 259–279 | 5.7× | 6.1× |
| [19](#shape-19---andaboutwork-n3-avg-34-max-74) | AND(`aboutWork`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 34–165 | 125–252 | 3.4× | 7.4× |
| [20](#shape-20---orclassification-material-n1-avg-85-max-85) | OR(`classification`, `material`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 76–76 | 646 | 8.5× | 8.5× |
| [21](#shape-21---partof-n1-avg-77-max-77) | `partOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | place | 34–34 | 263 | 7.7× | 7.7× |
| [22](#shape-22---andaboutconcept-aboutevent-n3-avg-11-max-15) | AND(`aboutConcept`, `aboutEvent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 133–175 | 122–260 | 1.1× | 1.5× |
| [23](#shape-23---aboutagent-n1-avg-33-max-33) | `aboutAgent` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 139–139 | 463 | 3.3× | 3.3× |
| [24](#shape-24---influencedbyconcept-n1-avg-18-max-18) | `influencedByConcept` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | concept | 169–169 | 311 | 1.8× | 1.8× |
| [25](#shape-25---aboutplace-n2-avg-09-max-09) | `aboutPlace` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 131–136 | 122–123 | 0.9× | 0.9× |
| [26](#shape-26---and-n1-avg-14-max-14) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 1683–1683 | 2363 | 1.4× | 1.4× |
| [27](#shape-27---orencounteredat-producedat-n1-avg-09-max-09) | OR(`encounteredAt`, `producedAt`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 145–145 | 124 | 0.9× | 0.9× |
| [28](#shape-28---activeat-n1-avg-07-max-07) | `activeAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 160–160 | 117 | 0.7× | 0.7× |

Total: 168 tests across 28 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - OR(`memberOf`) (n=11, avg 13.7×, max 24.1×)

- Patterns: `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs)
- Scopes: multi
- Baseline range: 30–34 ms; current range: 352–796 ms
- Ratio: avg 13.7×, max 24.1×

Worst 5 of 11:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3 | multi | 33 | 796 | 24.1× | — |
| Backend log test 2320 | multi | 30 | 409 | 13.6× | — |
| Backend log test 10544 | multi | 31 | 402 | 13× | — |
| Backend log test 4088 | multi | 30 | 390 | 13× | — |
| Backend log test 9215 | multi | 30 | 389 | 13× | — |

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

## Shape 2 - OR(`aboutConcept`, `classification`, `language`) (n=51, avg 1.6×, max 3.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 95–319 ms; current range: 187–398 ms
- Ratio: avg 1.6×, max 3.3×

Worst 5 of 51:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8777 | work | 95 | 314 | 3.3× | — |
| Backend log test 2429 | work | 138 | 273 | 2× | PASS |
| Backend log test 2315 | work | 122 | 248 | 2× | — |
| Backend log test 9663 | work | 152 | 286 | 1.9× | PASS |
| Backend log test 1510 | work | 143 | 272 | 1.9× | PASS |

Example criteria (test `Backend log test 8777`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "classification": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/5b1d4dcb-d3a8-4de8-82c3-44968cd36f39"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/5b1d4dcb-d3a8-4de8-82c3-44968cd36f39"
            }
          }
        ]
      }
    },
    {
      "language": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/5b1d4dcb-d3a8-4de8-82c3-44968cd36f39"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/5b1d4dcb-d3a8-4de8-82c3-44968cd36f39"
            }
          }
        ]
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/5b1d4dcb-d3a8-4de8-82c3-44968cd36f39"
      }
    }
  ]
}
```

## Shape 3 - AND(`aboutConcept`, `aboutPlace`) (n=12, avg 5.4×, max 8.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 32–169 ms; current range: 120–284 ms
- Ratio: avg 5.4×, max 8.5×

Worst 5 of 12:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10308 | work | 32 | 271 | 8.5× | — |
| Backend log test 8726 | work | 33 | 278 | 8.4× | — |
| Backend log test 9378 | work | 32 | 258 | 8.1× | — |
| Backend log test 9760 | work | 33 | 256 | 7.8× | — |
| Backend log test 10613 | work | 42 | 279 | 6.6× | — |

Example criteria (test `Backend log test 10308`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/f9c65950-fe29-4428-846b-4df530b6da29"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/286b66f5-f7fa-4ab5-ab7e-424cc6605b3e"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/d16d2e86-931b-41cb-9019-1ccb06352ea2"
      }
    }
  ]
}
```

## Shape 4 - AND(`aboutConcept`) (n=14, avg 4.2×, max 9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 31–169 ms; current range: 119–310 ms
- Ratio: avg 4.2×, max 9×

Worst 5 of 14:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9165 | work | 31 | 278 | 9× | — |
| Backend log test 7197 | work | 32 | 257 | 8× | — |
| Backend log test 10496 | work | 37 | 266 | 7.2× | — |
| Backend log test 10570 | work | 44 | 310 | 7× | — |
| Backend log test 8720 | work | 44 | 264 | 6× | — |

Example criteria (test `Backend log test 9165`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/e03a8f47-8127-41f6-8077-b2db636f3cd2"
      }
    }
  ]
}
```

## Shape 5 - `carries` (n=14, avg 4.1×, max 10.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 29–258 ms; current range: 118–306 ms
- Ratio: avg 4.1×, max 10.6×

Worst 5 of 14:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10560 | item | 29 | 306 | 10.6× | — |
| Backend log test 9897 | item | 33 | 270 | 8.2× | — |
| Backend log test 9076 | item | 32 | 261 | 8.2× | — |
| Backend log test 10037 | item | 32 | 261 | 8.2× | — |
| Backend log test 9070 | item | 32 | 257 | 8× | — |

Example criteria (test `Backend log test 10560`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/e928f99f-2b37-4562-9ff3-56895f721cbd"
  }
}
```

## Shape 6 - `memberOf` (n=4, avg 14×, max 36.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent, item
- Baseline range: 35–167 ms; current range: 196–4609 ms
- Ratio: avg 14×, max 36.9×

Worst 4 of 4:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 462 | item | 125 | 4609 | 36.9× | — |
| Backend log test 4731 | item | 83 | 823 | 9.9× | — |
| Backend log test 9616 | agent | 35 | 281 | 8× | — |
| Backend log test 97 | item | 167 | 196 | 1.2× | PASS |

Example criteria (test `Backend log test 462`):

```json
{
  "_scope": "item",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/set/d1b8a867-8be7-4325-ad78-1f3abda76056"
  }
}
```

## Shape 7 - `classification` (n=3, avg 15×, max 30.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent, event
- Baseline range: 34–90 ms; current range: 256–2709 ms
- Ratio: avg 15×, max 30.1×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8056 | agent | 90 | 2709 | 30.1× | — |
| Backend log test 9067 | event | 34 | 256 | 7.5× | — |
| Backend log test 9069 | agent | 58 | 430 | 7.4× | — |

Example criteria (test `Backend log test 8056`):

```json
{
  "_scope": "agent",
  "classification": {
    "id": "https://lux.collections.yale.edu/data/concept/6f652917-4c07-4d51-8209-fcdd4f285343"
  }
}
```

## Shape 8 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=9, avg 3.8×, max 7.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 33–171 ms; current range: 121–270 ms
- Ratio: avg 3.8×, max 7.9×

Worst 5 of 9:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10221 | work | 33 | 261 | 7.9× | — |
| Backend log test 8310 | work | 33 | 259 | 7.8× | — |
| Backend log test 6899 | work | 36 | 270 | 7.5× | — |
| Backend log test 7863 | work | 38 | 247 | 6.5× | — |
| Backend log test 10754 | work | 171 | 152 | 0.9× | PASS |

Example criteria (test `Backend log test 10221`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/fbe20768-4a74-4cfb-add5-29ca7c546c06"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/fbe20768-4a74-4cfb-add5-29ca7c546c06"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/fbe20768-4a74-4cfb-add5-29ca7c546c06"
      }
    }
  ]
}
```

## Shape 9 - AND(`aboutAgent`) (n=5, avg 5.1×, max 8.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 32–134 ms; current range: 118–271 ms
- Ratio: avg 5.1×, max 8.5×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10723 | work | 32 | 271 | 8.5× | — |
| Backend log test 8783 | work | 32 | 247 | 7.7× | — |
| Backend log test 9585 | work | 34 | 250 | 7.4× | — |
| Backend log test 7067 | work | 134 | 124 | 0.9× | PASS |
| Backend log test 7606 | work | 134 | 118 | 0.9× | PASS |

Example criteria (test `Backend log test 10723`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/57e255d8-d655-413e-9a91-511227335757"
      }
    }
  ]
}
```

## Shape 10 - `gender` (n=1, avg 24.1×, max 24.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 94–94 ms; current range: 2264–2264 ms
- Ratio: avg 24.1×, max 24.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8053 | agent | 94 | 2264 | 24.1× | — |

Example criteria (test `Backend log test 8053`):

```json
{
  "_scope": "agent",
  "gender": {
    "id": "https://lux.collections.yale.edu/data/concept/6f652917-4c07-4d51-8209-fcdd4f285343"
  }
}
```

## Shape 11 - `used` (n=3, avg 6.6×, max 8.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: event
- Baseline range: 41–53 ms; current range: 254–364 ms
- Ratio: avg 6.6×, max 8.9×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9552 | event | 41 | 364 | 8.9× | — |
| Backend log test 186 | event | 53 | 295 | 5.6× | — |
| Backend log test 5236 | event | 47 | 254 | 5.4× | — |

Example criteria (test `Backend log test 9552`):

```json
{
  "_scope": "event",
  "used": {
    "containingItem": {
      "producedBy": {
        "id": "https://lux.collections.yale.edu/data/person/af3af40b-ddd0-4b8b-90e3-ecb576d06708"
      }
    }
  }
}
```

## Shape 12 - AND(`aboutAgent`, `aboutConcept`) (n=3, avg 5.9×, max 8.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 32–140 ms; current range: 124–289 ms
- Ratio: avg 5.9×, max 8.5×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10692 | work | 34 | 289 | 8.5× | — |
| Backend log test 8255 | work | 32 | 268 | 8.4× | — |
| Backend log test 7366 | work | 140 | 124 | 0.9× | PASS |

Example criteria (test `Backend log test 10692`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/b51239f0-98de-47df-bd8b-ab8dc942fb55"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/3c12ff0e-b0aa-459f-b15b-2433a06f535c"
      }
    }
  ]
}
```

## Shape 13 - single `text` keyword (n=8, avg 2.2×, max 2.3×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 118–216 ms; current range: 263–504 ms
- Ratio: avg 2.2×, max 2.3×

Worst 5 of 8:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1692 | item | 216 | 504 | 2.3× | PASS |
| Backend log test 567 | item | 198 | 456 | 2.3× | PASS |
| Backend log test 815 | item | 193 | 434 | 2.2× | PASS |
| Backend log test 4735 | item | 189 | 410 | 2.2× | PASS |
| Backend log test 4726 | item | 118 | 263 | 2.2× | — |

Example criteria (test `Backend log test 1692`):

```json
{
  "_scope": "item",
  "text": "Belgium",
  "_lang": "en"
}
```

## Shape 14 - `startAt` (n=3, avg 5.8×, max 9.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 32–159 ms; current range: 124–292 ms
- Ratio: avg 5.8×, max 9.1×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9622 | agent | 32 | 292 | 9.1× | — |
| Backend log test 10405 | agent | 35 | 261 | 7.5× | — |
| Backend log test 9594 | agent | 159 | 124 | 0.8× | PASS |

Example criteria (test `Backend log test 9622`):

```json
{
  "_scope": "agent",
  "startAt": {
    "id": "https://lux.collections.yale.edu/data/place/1aff44da-4b75-4930-bc20-5d08a9d80549"
  }
}
```

## Shape 15 - `partOfWork` (n=2, avg 7.7×, max 8.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 34–34 ms; current range: 246–275 ms
- Ratio: avg 7.7×, max 8.1×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8249 | work | 34 | 275 | 8.1× | — |
| Backend log test 8378 | work | 34 | 246 | 7.2× | — |

Example criteria (test `Backend log test 8249`):

```json
{
  "_scope": "work",
  "partOfWork": {
    "id": "https://lux.collections.yale.edu/data/text/bac7dbf2-a487-44b2-90e3-5eaf50bda2eb"
  }
}
```

## Shape 16 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=3, avg 5.1×, max 7.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 33–173 ms; current range: 125–256 ms
- Ratio: avg 5.1×, max 7.8×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9204 | work | 33 | 256 | 7.8× | — |
| Backend log test 8903 | work | 36 | 246 | 6.8× | — |
| Backend log test 9555 | work | 173 | 125 | 0.7× | PASS |

Example criteria (test `Backend log test 9204`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/7212b37d-b8c5-4a82-9500-1b588e11e643"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/c839bd75-826c-45d1-939e-d15e51529718"
      }
    },
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/f14804ea-6bd1-4bfb-9394-6f5428c83c34"
      }
    }
  ]
}
```

## Shape 17 - multi-`text` AND (n=5, avg 2.4×, max 4.1×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item, place, work
- Baseline range: 186–922 ms; current range: 441–1146 ms
- Ratio: avg 2.4×, max 4.1×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5176 | place | 228 | 930 | 4.1× | PASS |
| Backend log test 4225 | place | 378 | 1099 | 2.9× | PASS |
| Backend log test 479 | item | 186 | 441 | 2.4× | PASS |
| Backend log test 4931 | item | 482 | 687 | 1.4× | PASS |
| Backend log test 4933 | work | 922 | 1146 | 1.2× | PASS |

Example criteria (test `Backend log test 5176`):

```json
{
  "_scope": "place",
  "AND": [
    {
      "text": "Paris",
      "_lang": "en"
    },
    {
      "text": ",",
      "_lang": "en"
    },
    {
      "text": "France",
      "_lang": "en"
    }
  ]
}
```

## Shape 18 - AND(`aboutPlace`) (n=2, avg 5.7×, max 6.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 46–49 ms; current range: 259–279 ms
- Ratio: avg 5.7×, max 6.1×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10607 | work | 46 | 279 | 6.1× | — |
| Backend log test 2994 | work | 49 | 259 | 5.3× | — |

Example criteria (test `Backend log test 10607`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/b949b558-2a25-4fc9-a4d8-802c8f543b1d"
      }
    }
  ]
}
```

## Shape 19 - AND(`aboutWork`) (n=3, avg 3.4×, max 7.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 34–165 ms; current range: 125–252 ms
- Ratio: avg 3.4×, max 7.4×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9237 | work | 34 | 252 | 7.4× | — |
| Backend log test 6906 | work | 122 | 246 | 2× | — |
| Backend log test 10071 | work | 165 | 125 | 0.8× | PASS |

Example criteria (test `Backend log test 9237`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutWork": {
        "id": "https://lux.collections.yale.edu/data/text/5986c292-fc11-4f73-a924-3d88f5237511"
      }
    }
  ]
}
```

## Shape 20 - OR(`classification`, `material`) (n=1, avg 8.5×, max 8.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 76–76 ms; current range: 646–646 ms
- Ratio: avg 8.5×, max 8.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6374 | item | 76 | 646 | 8.5× | — |

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

## Shape 21 - `partOf` (n=1, avg 7.7×, max 7.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: place
- Baseline range: 34–34 ms; current range: 263–263 ms
- Ratio: avg 7.7×, max 7.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9891 | place | 34 | 263 | 7.7× | — |

Example criteria (test `Backend log test 9891`):

```json
{
  "_scope": "place",
  "partOf": {
    "id": "https://lux.collections.yale.edu/data/place/47a26566-6b4a-4ae7-aa4b-d3ae603f965d"
  }
}
```

## Shape 22 - AND(`aboutConcept`, `aboutEvent`) (n=3, avg 1.1×, max 1.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 133–175 ms; current range: 122–260 ms
- Ratio: avg 1.1×, max 1.5×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9940 | work | 175 | 260 | 1.5× | PASS |
| Backend log test 7403 | work | 140 | 123 | 0.9× | PASS |
| Backend log test 7257 | work | 133 | 122 | 0.9× | PASS |

Example criteria (test `Backend log test 9940`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/63d89999-9328-434d-9ed2-ec9d6d9ea56b"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/4e096b3c-6af6-4845-9169-dfeca24061cd"
      }
    }
  ]
}
```

## Shape 23 - `aboutAgent` (n=1, avg 3.3×, max 3.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 139–139 ms; current range: 463–463 ms
- Ratio: avg 3.3×, max 3.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1 | work | 139 | 463 | 3.3× | PASS |

Example criteria (test `Backend log test 1`):

```json
{
  "_scope": "work",
  "aboutAgent": {
    "id": "https://lux.collections.yale.edu/data/group/bf219a49-0005-40df-a1d7-402537e9b485"
  }
}
```

## Shape 24 - `influencedByConcept` (n=1, avg 1.8×, max 1.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: concept
- Baseline range: 169–169 ms; current range: 311–311 ms
- Ratio: avg 1.8×, max 1.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9662 | concept | 169 | 311 | 1.8× | PASS |

Example criteria (test `Backend log test 9662`):

```json
{
  "_scope": "concept",
  "influencedByConcept": {
    "id": "https://lux.collections.yale.edu/data/concept/8b828bd8-afbc-4b21-b1e4-e10ff35c4d31"
  }
}
```

## Shape 25 - `aboutPlace` (n=2, avg 0.9×, max 0.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 131–136 ms; current range: 122–123 ms
- Ratio: avg 0.9×, max 0.9×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8232 | work | 136 | 122 | 0.9× | PASS |
| Backend log test 7136 | work | 131 | 123 | 0.9× | PASS |

Example criteria (test `Backend log test 8232`):

```json
{
  "_scope": "work",
  "aboutPlace": {
    "id": "https://lux.collections.yale.edu/data/place/94297471-329d-4786-acca-b3e56522a2c5"
  }
}
```

## Shape 26 - AND(`?`) (n=1, avg 1.4×, max 1.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 1683–1683 ms; current range: 2363–2363 ms
- Ratio: avg 1.4×, max 1.4×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 1683 | 2363 | 1.4× | PASS |

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

## Shape 27 - OR(`encounteredAt`, `producedAt`) (n=1, avg 0.9×, max 0.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 145–145 ms; current range: 124–124 ms
- Ratio: avg 0.9×, max 0.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4001 | item | 145 | 124 | 0.9× | PASS |

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

## Shape 28 - `activeAt` (n=1, avg 0.7×, max 0.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 160–160 ms; current range: 117–117 ms
- Ratio: avg 0.7×, max 0.7×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9334 | agent | 160 | 117 | 0.7× | PASS |

Example criteria (test `Backend log test 9334`):

```json
{
  "_scope": "agent",
  "activeAt": {
    "id": "https://lux.collections.yale.edu/data/place/04370b96-352d-4cfb-8a9a-e470e7acb588"
  }
}
```
