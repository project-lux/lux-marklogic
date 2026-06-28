## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 11182 tests)](#aggregate-full-11182-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 192-test union](#pattern-shapes--192-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - `carries` (n=32, avg 4.8×, max 18.1×)](#shape-1---carries-n32-avg-48-max-181)
  - [Shape 2 - OR(`memberOf`) (n=11, avg 13.4×, max 20.5×)](#shape-2---ormemberof-n11-avg-134-max-205)
  - [Shape 3 - AND(`aboutConcept`, `aboutPlace`) (n=15, avg 5×, max 13.5×)](#shape-3---andaboutconcept-aboutplace-n15-avg-5-max-135)
  - [Shape 4 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=12, avg 4.5×, max 12.5×)](#shape-4---orcreatedby-creationinfluencedby-publishedby-n12-avg-45-max-125)
  - [Shape 5 - AND(`aboutConcept`) (n=15, avg 3.1×, max 10.2×)](#shape-5---andaboutconcept-n15-avg-31-max-102)
  - [Shape 6 - `used` (n=7, avg 5.3×, max 6.1×)](#shape-6---used-n7-avg-53-max-61)
  - [Shape 7 - AND(`aboutAgent`, `aboutConcept`) (n=6, avg 5.3×, max 13.6×)](#shape-7---andaboutagent-aboutconcept-n6-avg-53-max-136)
  - [Shape 8 - OR(`aboutConcept`, `classification`, `language`) (n=50, avg 0.5×, max 1.3×)](#shape-8---oraboutconcept-classification-language-n50-avg-05-max-13)
  - [Shape 9 - AND(`aboutAgent`) (n=4, avg 4.4×, max 13×)](#shape-9---andaboutagent-n4-avg-44-max-13)
  - [Shape 10 - `memberOf` (n=4, avg 3.3×, max 6.3×)](#shape-10---memberof-n4-avg-33-max-63)
  - [Shape 11 - AND(`aboutWork`) (n=2, avg 6.2×, max 12×)](#shape-11---andaboutwork-n2-avg-62-max-12)
  - [Shape 12 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=3, avg 3.7×, max 5.7×)](#shape-12---andaboutconcept-aboutevent-aboutplace-n3-avg-37-max-57)
  - [Shape 13 - AND(`aboutConcept`, `aboutEvent`) (n=4, avg 2.5×, max 8.6×)](#shape-13---andaboutconcept-aboutevent-n4-avg-25-max-86)
  - [Shape 14 - `broader` (n=1, avg 9.5×, max 9.5×)](#shape-14---broader-n1-avg-95-max-95)
  - [Shape 15 - multi-`text` AND (n=5, avg 1.5×, max 5.2×)](#shape-15---multi-text-and-n5-avg-15-max-52)
  - [Shape 16 - `aboutAgent` (n=2, avg 2.7×, max 4.1×)](#shape-16---aboutagent-n2-avg-27-max-41)
  - [Shape 17 - AND(`aboutPlace`, `createdBy`) (n=1, avg 4.4×, max 4.4×)](#shape-17---andaboutplace-createdby-n1-avg-44-max-44)
  - [Shape 18 - `startAt` (n=2, avg 1.9×, max 3.5×)](#shape-18---startat-n2-avg-19-max-35)
  - [Shape 19 - `gender` (n=1, avg 2.9×, max 2.9×)](#shape-19---gender-n1-avg-29-max-29)
  - [Shape 20 - `classification` (n=1, avg 2.9×, max 2.9×)](#shape-20---classification-n1-avg-29-max-29)
  - [Shape 21 - single `text` keyword (n=7, avg 0.4×, max 0.6×)](#shape-21---single-text-keyword-n7-avg-04-max-06)
  - [Shape 22 - OR(`classification`, `material`) (n=1, avg 1.9×, max 1.9×)](#shape-22---orclassification-material-n1-avg-19-max-19)
  - [Shape 23 - `influencedByConcept` (n=1, avg 0.8×, max 0.8×)](#shape-23---influencedbyconcept-n1-avg-08-max-08)
  - [Shape 24 - `aboutPlace` (n=2, avg 0.3×, max 0.3×)](#shape-24---aboutplace-n2-avg-03-max-03)
  - [Shape 25 - AND(`?`) (n=1, avg 0.4×, max 0.4×)](#shape-25---and-n1-avg-04-max-04)
  - [Shape 26 - `activeAt` (n=1, avg 0.3×, max 0.3×)](#shape-26---activeat-n1-avg-03-max-03)
  - [Shape 27 - OR(`encounteredAt`, `producedAt`) (n=1, avg 0.3×, max 0.3×)](#shape-27---orencounteredat-producedat-n1-avg-03-max-03)

# Input

Source: `scratch/pattern-shape-analysis/2026-06-28-cts-v-optic-2211d13-10k-3-single-thread.json`
- baseline: `2026-06-25-cts-10k-3-single-thread` (2026-06-25T19:19:31.296Z)
- current:  `2026-06-28-optic-2211d13-10k-3-single-thread` (2026-06-28T15:16:20.318Z)
- generated: 2026-06-28T15:19:38.065Z

# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 192 distinct tests**.
- The middle of the 11182-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 11182.
- Within the union: **0 functional regression(s)** (non-PASS in current) and **24 tests with ≥10× regression**.

# Aggregate (full 11182 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 39.67 ms | 52.01 ms | **+31%** |
| p50 | 34 ms | 46 ms | +35% |
| p90 | 49 ms | 65 ms | +33% |
| p95 | 56 ms | 70 ms | +25% |
| p99 | 123 ms | 101 ms | +-18% |
| p99.9 | 192.64 ms | 434.54 ms | **+126%** |
| Pass rate | 99.2% | 99.2% | 0.0 |

# Severity distribution

Bucketed counts across the 192-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 0 | status != PASS in current |
| Severe (≥10× ratio) | 24 | |
| Moderate (3–10×) | 58 | |
| Mild (<3×) | 110 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 192-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---carries-n32-avg-48-max-181) | `carries` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 32 | item | 29–258 | 42–525 | 4.8× | 18.1× |
| [2](#shape-2---ormemberof-n11-avg-134-max-205) | OR(`memberOf`) | `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs) | 11 | multi | 30–34 | 353–675 | 13.4× | 20.5× |
| [3](#shape-3---andaboutconcept-aboutplace-n15-avg-5-max-135) | AND(`aboutConcept`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 15 | work | 33–169 | 43–521 | 5× | 13.5× |
| [4](#shape-4---orcreatedby-creationinfluencedby-publishedby-n12-avg-45-max-125) | OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 12 | set,work | 33–171 | 43–436 | 4.5× | 12.5× |
| [5](#shape-5---andaboutconcept-n15-avg-31-max-102) | AND(`aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 15 | work | 37–169 | 59–420 | 3.1× | 10.2× |
| [6](#shape-6---used-n7-avg-53-max-61) | `used` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 7 | event | 35–53 | 215–226 | 5.3× | 6.1× |
| [7](#shape-7---andaboutagent-aboutconcept-n6-avg-53-max-136) | AND(`aboutAgent`, `aboutConcept`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 6 | work | 31–140 | 43–488 | 5.3× | 13.6× |
| [8](#shape-8---oraboutconcept-classification-language-n50-avg-05-max-13) | OR(`aboutConcept`, `classification`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 50 | work | 93–319 | 42–361 | 0.5× | 1.3× |
| [9](#shape-9---andaboutagent-n4-avg-44-max-13) | AND(`aboutAgent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 4 | work | 32–134 | 49–442 | 4.4× | 13× |
| [10](#shape-10---memberof-n4-avg-33-max-63) | `memberOf` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 4 | agent,item | 35–167 | 170–481 | 3.3× | 6.3× |
| [11](#shape-11---andaboutwork-n2-avg-62-max-12) | AND(`aboutWork`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 32–165 | 60–383 | 6.2× | 12× |
| [12](#shape-12---andaboutconcept-aboutevent-aboutplace-n3-avg-37-max-57) | AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 32–173 | 65–193 | 3.7× | 5.7× |
| [13](#shape-13---andaboutconcept-aboutevent-n4-avg-25-max-86) | AND(`aboutConcept`, `aboutEvent`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 4 | work | 47–175 | 47–402 | 2.5× | 8.6× |
| [14](#shape-14---broader-n1-avg-95-max-95) | `broader` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | concept | 35–35 | 332 | 9.5× | 9.5× |
| [15](#shape-15---multi-text-and-n5-avg-15-max-52) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 5 | item,place,work | 186–922 | 56–1193 | 1.5× | 5.2× |
| [16](#shape-16---aboutagent-n2-avg-27-max-41) | `aboutAgent` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 32–139 | 132–160 | 2.7× | 4.1× |
| [17](#shape-17---andaboutplace-createdby-n1-avg-44-max-44) | AND(`aboutPlace`, `createdBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 34–34 | 151 | 4.4× | 4.4× |
| [18](#shape-18---startat-n2-avg-19-max-35) | `startAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | agent | 38–159 | 47–132 | 1.9× | 3.5× |
| [19](#shape-19---gender-n1-avg-29-max-29) | `gender` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 94–94 | 273 | 2.9× | 2.9× |
| [20](#shape-20---classification-n1-avg-29-max-29) | `classification` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 90–90 | 259 | 2.9× | 2.9× |
| [21](#shape-21---single-text-keyword-n7-avg-04-max-06) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 7 | item | 133–216 | 46–130 | 0.4× | 0.6× |
| [22](#shape-22---orclassification-material-n1-avg-19-max-19) | OR(`classification`, `material`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 76–76 | 144 | 1.9× | 1.9× |
| [23](#shape-23---influencedbyconcept-n1-avg-08-max-08) | `influencedByConcept` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | concept | 169–169 | 139 | 0.8× | 0.8× |
| [24](#shape-24---aboutplace-n2-avg-03-max-03) | `aboutPlace` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 131–136 | 42–45 | 0.3× | 0.3× |
| [25](#shape-25---and-n1-avg-04-max-04) | AND(`?`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 1 | item | 1683–1683 | 701 | 0.4× | 0.4× |
| [26](#shape-26---activeat-n1-avg-03-max-03) | `activeAt` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 160–160 | 45 | 0.3× | 0.3× |
| [27](#shape-27---orencounteredat-producedat-n1-avg-03-max-03) | OR(`encounteredAt`, `producedAt`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 145–145 | 44 | 0.3× | 0.3× |

Total: 192 tests across 27 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - `carries` (n=32, avg 4.8×, max 18.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 29–258 ms; current range: 42–525 ms
- Ratio: avg 4.8×, max 18.1×

Worst 5 of 32:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10546 | item | 29 | 525 | 18.1× | — |
| Backend log test 7704 | item | 34 | 449 | 13.2× | — |
| Backend log test 4070 | item | 32 | 405 | 12.7× | — |
| Backend log test 1450 | item | 32 | 358 | 11.2× | — |
| Backend log test 8747 | item | 32 | 228 | 7.1× | — |

Example criteria (test `Backend log test 10546`):

```json
{
  "_scope": "item",
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/c6c8a50d-be2b-4d1e-b842-02b487dd6729"
  }
}
```

## Shape 2 - OR(`memberOf`) (n=11, avg 13.4×, max 20.5×)

- Patterns: `UNKNOWN(multi.classification)`, `UNKNOWN(multi.containingSet)`, `UNKNOWN(multi.identifier)`, `UNKNOWN(multi.memberOf)`, [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs)
- Scopes: multi
- Baseline range: 30–34 ms; current range: 353–675 ms
- Ratio: avg 13.4×, max 20.5×

Worst 5 of 11:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3 | multi | 33 | 675 | 20.5× | — |
| Backend log test 2320 | multi | 30 | 398 | 13.3× | — |
| Backend log test 4088 | multi | 30 | 395 | 13.2× | — |
| Backend log test 4812 | multi | 30 | 395 | 13.2× | — |
| Backend log test 9215 | multi | 30 | 394 | 13.1× | — |

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

## Shape 3 - AND(`aboutConcept`, `aboutPlace`) (n=15, avg 5×, max 13.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 33–169 ms; current range: 43–521 ms
- Ratio: avg 5×, max 13.5×

Worst 5 of 15:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 7030 | work | 33 | 444 | 13.5× | — |
| Backend log test 4510 | work | 38 | 409 | 10.8× | — |
| Backend log test 8304 | work | 48 | 481 | 10× | — |
| Backend log test 9834 | work | 55 | 521 | 9.5× | — |
| Backend log test 9001 | work | 33 | 201 | 6.1× | — |

Example criteria (test `Backend log test 7030`):

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
        "id": "https://lux.collections.yale.edu/data/place/bdc92371-b72c-4835-8903-f8347e3104f9"
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

## Shape 4 - OR(`createdBy`, `creationInfluencedBy`, `publishedBy`) (n=12, avg 4.5×, max 12.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: set, work
- Baseline range: 33–171 ms; current range: 43–436 ms
- Ratio: avg 4.5×, max 12.5×

Worst 5 of 12:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6396 | work | 35 | 436 | 12.5× | — |
| Backend log test 430 | set | 34 | 345 | 10.1× | — |
| Backend log test 10765 | work | 33 | 243 | 7.4× | — |
| Backend log test 9307 | work | 33 | 211 | 6.4× | — |
| Backend log test 9561 | work | 39 | 226 | 5.8× | — |

Example criteria (test `Backend log test 6396`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/2f79d785-285b-40a3-815d-c112a26257e3"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/2f79d785-285b-40a3-815d-c112a26257e3"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/2f79d785-285b-40a3-815d-c112a26257e3"
      }
    }
  ]
}
```

## Shape 5 - AND(`aboutConcept`) (n=15, avg 3.1×, max 10.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 37–169 ms; current range: 59–420 ms
- Ratio: avg 3.1×, max 10.2×

Worst 5 of 15:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3476 | work | 41 | 420 | 10.2× | — |
| Backend log test 744 | work | 56 | 391 | 7× | — |
| Backend log test 8513 | work | 44 | 217 | 4.9× | — |
| Backend log test 6995 | work | 38 | 185 | 4.9× | — |
| Backend log test 6771 | work | 46 | 194 | 4.2× | — |

Example criteria (test `Backend log test 3476`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/3ecdb209-1288-4116-bec9-e48c26fba88d"
      }
    }
  ]
}
```

## Shape 6 - `used` (n=7, avg 5.3×, max 6.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: event
- Baseline range: 35–53 ms; current range: 215–226 ms
- Ratio: avg 5.3×, max 6.1×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5312 | event | 35 | 215 | 6.1× | — |
| Backend log test 3312 | event | 37 | 218 | 5.9× | — |
| Backend log test 9443 | event | 41 | 226 | 5.5× | — |
| Backend log test 9552 | event | 41 | 219 | 5.3× | — |
| Backend log test 9543 | event | 42 | 220 | 5.2× | — |

Example criteria (test `Backend log test 5312`):

```json
{
  "_scope": "event",
  "used": {
    "containingItem": {
      "id": "https://lux.collections.yale.edu/data/object/f0353602-122b-48bd-8cd3-4996bf318679"
    }
  }
}
```

## Shape 7 - AND(`aboutAgent`, `aboutConcept`) (n=6, avg 5.3×, max 13.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 31–140 ms; current range: 43–488 ms
- Ratio: avg 5.3×, max 13.6×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9028 | work | 36 | 488 | 13.6× | — |
| Backend log test 5885 | work | 32 | 194 | 6.1× | — |
| Backend log test 6079 | work | 31 | 170 | 5.5× | — |
| Backend log test 4961 | work | 48 | 179 | 3.7× | — |
| Backend log test 3602 | work | 47 | 119 | 2.5× | — |

Example criteria (test `Backend log test 9028`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/4e698b5d-a5d1-42d8-aa88-b6801b2ccf6c"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/4d60866c-babb-4e94-8056-03512a923df8"
      }
    }
  ]
}
```

## Shape 8 - OR(`aboutConcept`, `classification`, `language`) (n=50, avg 0.5×, max 1.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 93–319 ms; current range: 42–361 ms
- Ratio: avg 0.5×, max 1.3×

Worst 5 of 50:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2683 | work | 93 | 122 | 1.3× | — |
| Backend log test 14 | work | 319 | 361 | 1.1× | PASS |
| Backend log test 143 | work | 157 | 99 | 0.6× | PASS |
| Backend log test 9663 | work | 152 | 72 | 0.5× | PASS |
| Backend log test 9381 | work | 146 | 68 | 0.5× | PASS |

Example criteria (test `Backend log test 2683`):

```json
{
  "_scope": "work",
  "OR": [
    {
      "classification": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/3d85809e-c384-414c-8aba-98c0a2bc9662"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/3d85809e-c384-414c-8aba-98c0a2bc9662"
            }
          }
        ]
      }
    },
    {
      "language": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/3d85809e-c384-414c-8aba-98c0a2bc9662"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/3d85809e-c384-414c-8aba-98c0a2bc9662"
            }
          }
        ]
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/3d85809e-c384-414c-8aba-98c0a2bc9662"
      }
    }
  ]
}
```

## Shape 9 - AND(`aboutAgent`) (n=4, avg 4.4×, max 13×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 32–134 ms; current range: 49–442 ms
- Ratio: avg 4.4×, max 13×

Worst 4 of 4:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5730 | work | 34 | 442 | 13× | — |
| Backend log test 5259 | work | 32 | 116 | 3.6× | — |
| Backend log test 7067 | work | 134 | 65 | 0.5× | PASS |
| Backend log test 7606 | work | 134 | 49 | 0.4× | PASS |

Example criteria (test `Backend log test 5730`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/person/e4d4c219-5532-41c8-9ffe-4c7477152e8d"
      }
    }
  ]
}
```

## Shape 10 - `memberOf` (n=4, avg 3.3×, max 6.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent, item
- Baseline range: 35–167 ms; current range: 170–481 ms
- Ratio: avg 3.3×, max 6.3×

Worst 4 of 4:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9819 | agent | 35 | 219 | 6.3× | — |
| Backend log test 462 | item | 125 | 481 | 3.8× | — |
| Backend log test 4731 | item | 83 | 170 | 2× | — |
| Backend log test 97 | item | 167 | 200 | 1.2× | PASS |

Example criteria (test `Backend log test 9819`):

```json
{
  "_scope": "agent",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/group/76a10a07-3d09-4803-a6a0-cfd8371161dd"
  }
}
```

## Shape 11 - AND(`aboutWork`) (n=2, avg 6.2×, max 12×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 32–165 ms; current range: 60–383 ms
- Ratio: avg 6.2×, max 12×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2056 | work | 32 | 383 | 12× | — |
| Backend log test 10071 | work | 165 | 60 | 0.4× | PASS |

Example criteria (test `Backend log test 2056`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutWork": {
        "id": "https://lux.collections.yale.edu/data/text/3139cf5e-73ad-4947-9bb8-ad3112a800c5"
      }
    }
  ]
}
```

## Shape 12 - AND(`aboutConcept`, `aboutEvent`, `aboutPlace`) (n=3, avg 3.7×, max 5.7×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 32–173 ms; current range: 65–193 ms
- Ratio: avg 3.7×, max 5.7×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8005 | work | 34 | 193 | 5.7× | — |
| Backend log test 5181 | work | 32 | 159 | 5× | — |
| Backend log test 9555 | work | 173 | 65 | 0.4× | PASS |

Example criteria (test `Backend log test 8005`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/01c13d86-2c38-4166-a6c3-4e8f69032120"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/e6a9d1f0-fbea-4cd6-a154-dbd159c4993e"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/7194bcef-3162-45ed-bc93-a534794c9922"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/9b189b8a-2f9f-4ef3-af5a-4d39f1406c23"
      }
    }
  ]
}
```

## Shape 13 - AND(`aboutConcept`, `aboutEvent`) (n=4, avg 2.5×, max 8.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 47–175 ms; current range: 47–402 ms
- Ratio: avg 2.5×, max 8.6×

Worst 4 of 4:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2952 | work | 47 | 402 | 8.6× | — |
| Backend log test 7403 | work | 140 | 65 | 0.5× | PASS |
| Backend log test 9940 | work | 175 | 62 | 0.4× | PASS |
| Backend log test 7257 | work | 133 | 47 | 0.4× | PASS |

Example criteria (test `Backend log test 2952`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/1fcdb888-0a22-46df-9c93-ecd6449403cd"
      }
    },
    {
      "aboutEvent": {
        "id": "https://lux.collections.yale.edu/data/activity/f1d3381d-a258-437d-8bee-8a3d574d624b"
      }
    }
  ]
}
```

## Shape 14 - `broader` (n=1, avg 9.5×, max 9.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: concept
- Baseline range: 35–35 ms; current range: 332–332 ms
- Ratio: avg 9.5×, max 9.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 224 | concept | 35 | 332 | 9.5× | — |

Example criteria (test `Backend log test 224`):

```json
{
  "_scope": "concept",
  "broader": {
    "id": "https://lux.collections.yale.edu/data/concept/4dc6d22c-7b0b-44be-9bc9-352d254c53ca"
  }
}
```

## Shape 15 - multi-`text` AND (n=5, avg 1.5×, max 5.2×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item, place, work
- Baseline range: 186–922 ms; current range: 56–1193 ms
- Ratio: avg 1.5×, max 5.2×

Worst 5 of 5:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 5176 | place | 228 | 1193 | 5.2× | PASS |
| Backend log test 4225 | place | 378 | 773 | 2× | PASS |
| Backend log test 479 | item | 186 | 62 | 0.3× | PASS |
| Backend log test 4933 | work | 922 | 60 | 0.1× | PASS |
| Backend log test 4931 | item | 482 | 56 | 0.1× | PASS |

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

## Shape 16 - `aboutAgent` (n=2, avg 2.7×, max 4.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 32–139 ms; current range: 132–160 ms
- Ratio: avg 2.7×, max 4.1×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3107 | work | 32 | 132 | 4.1× | — |
| Backend log test 1 | work | 139 | 160 | 1.2× | PASS |

Example criteria (test `Backend log test 3107`):

```json
{
  "_scope": "work",
  "aboutAgent": {
    "id": "https://lux.collections.yale.edu/data/person/f6365ba4-0a5a-4e84-aa59-69dd6460955a"
  }
}
```

## Shape 17 - AND(`aboutPlace`, `createdBy`) (n=1, avg 4.4×, max 4.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 34–34 ms; current range: 151–151 ms
- Ratio: avg 4.4×, max 4.4×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4777 | work | 34 | 151 | 4.4× | — |

Example criteria (test `Backend log test 4777`):

```json
{
  "_scope": "work",
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/4f4f7a86-70d8-40bc-beba-9c6177193e45"
      }
    },
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/61a98550-46e3-4201-b630-32b77aa2e8dc"
      }
    }
  ]
}
```

## Shape 18 - `startAt` (n=2, avg 1.9×, max 3.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 38–159 ms; current range: 47–132 ms
- Ratio: avg 1.9×, max 3.5×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9322 | agent | 38 | 132 | 3.5× | — |
| Backend log test 9594 | agent | 159 | 47 | 0.3× | PASS |

Example criteria (test `Backend log test 9322`):

```json
{
  "_scope": "agent",
  "startAt": {
    "id": "https://lux.collections.yale.edu/data/place/28bae125-51d8-4683-a112-c8c50bf003bb"
  }
}
```

## Shape 19 - `gender` (n=1, avg 2.9×, max 2.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 94–94 ms; current range: 273–273 ms
- Ratio: avg 2.9×, max 2.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8053 | agent | 94 | 273 | 2.9× | — |

Example criteria (test `Backend log test 8053`):

```json
{
  "_scope": "agent",
  "gender": {
    "id": "https://lux.collections.yale.edu/data/concept/6f652917-4c07-4d51-8209-fcdd4f285343"
  }
}
```

## Shape 20 - `classification` (n=1, avg 2.9×, max 2.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 90–90 ms; current range: 259–259 ms
- Ratio: avg 2.9×, max 2.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8056 | agent | 90 | 259 | 2.9× | — |

Example criteria (test `Backend log test 8056`):

```json
{
  "_scope": "agent",
  "classification": {
    "id": "https://lux.collections.yale.edu/data/concept/6f652917-4c07-4d51-8209-fcdd4f285343"
  }
}
```

## Shape 21 - single `text` keyword (n=7, avg 0.4×, max 0.6×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 133–216 ms; current range: 46–130 ms
- Ratio: avg 0.4×, max 0.6×

Worst 5 of 7:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1692 | item | 216 | 130 | 0.6× | PASS |
| Backend log test 815 | item | 193 | 70 | 0.4× | PASS |
| Backend log test 4178 | item | 134 | 48 | 0.4× | PASS |
| Backend log test 567 | item | 198 | 69 | 0.3× | PASS |
| Backend log test 1270 | item | 189 | 59 | 0.3× | PASS |

Example criteria (test `Backend log test 1692`):

```json
{
  "_scope": "item",
  "text": "Belgium",
  "_lang": "en"
}
```

## Shape 22 - OR(`classification`, `material`) (n=1, avg 1.9×, max 1.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 76–76 ms; current range: 144–144 ms
- Ratio: avg 1.9×, max 1.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 6374 | item | 76 | 144 | 1.9× | — |

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

## Shape 23 - `influencedByConcept` (n=1, avg 0.8×, max 0.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: concept
- Baseline range: 169–169 ms; current range: 139–139 ms
- Ratio: avg 0.8×, max 0.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9662 | concept | 169 | 139 | 0.8× | PASS |

Example criteria (test `Backend log test 9662`):

```json
{
  "_scope": "concept",
  "influencedByConcept": {
    "id": "https://lux.collections.yale.edu/data/concept/8b828bd8-afbc-4b21-b1e4-e10ff35c4d31"
  }
}
```

## Shape 24 - `aboutPlace` (n=2, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 131–136 ms; current range: 42–45 ms
- Ratio: avg 0.3×, max 0.3×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 8232 | work | 136 | 45 | 0.3× | PASS |
| Backend log test 7136 | work | 131 | 42 | 0.3× | PASS |

Example criteria (test `Backend log test 8232`):

```json
{
  "_scope": "work",
  "aboutPlace": {
    "id": "https://lux.collections.yale.edu/data/place/94297471-329d-4786-acca-b3e56522a2c5"
  }
}
```

## Shape 25 - AND(`?`) (n=1, avg 0.4×, max 0.4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 1683–1683 ms; current range: 701–701 ms
- Ratio: avg 0.4×, max 0.4×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 110 | item | 1683 | 701 | 0.4× | PASS |

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

## Shape 26 - `activeAt` (n=1, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 160–160 ms; current range: 45–45 ms
- Ratio: avg 0.3×, max 0.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 9334 | agent | 160 | 45 | 0.3× | PASS |

Example criteria (test `Backend log test 9334`):

```json
{
  "_scope": "agent",
  "activeAt": {
    "id": "https://lux.collections.yale.edu/data/place/04370b96-352d-4cfb-8a9a-e470e7acb588"
  }
}
```

## Shape 27 - OR(`encounteredAt`, `producedAt`) (n=1, avg 0.3×, max 0.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 145–145 ms; current range: 44–44 ms
- Ratio: avg 0.3×, max 0.3×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4001 | item | 145 | 44 | 0.3× | PASS |

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
