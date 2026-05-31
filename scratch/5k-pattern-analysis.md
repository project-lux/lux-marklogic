## **Search Comparison: Pattern-Level Analysis**

## Contents

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [LLM Recommended Optimization Priorities](#llm-recommended-optimization-priorities)
- [Aggregate (full 5588 tests)](#aggregate-full-5588-tests)
- [Severity distribution](#severity-distribution)
- [Pattern shapes — 173-test union](#pattern-shapes--173-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 - OR(`createdBy`, `creationInfluencedBy`, `id`, `publishedBy`) (n=42, avg 20.7×, max 136×)](#shape-1---orcreatedby-creationinfluencedby-id-publishedby-n42-avg-207-max-136)
  - [Shape 2 - OR(`aboutConcept`, `classification`, `id`, `influencedByConcept`, `language`) (n=86, avg 3.3×, max 6×)](#shape-2---oraboutconcept-classification-id-influencedbyconcept-language-n86-avg-33-max-6)
  - [Shape 3 - `containingItem`, `id`, `producedBy`, `used` (n=2, avg 43×, max 63.5×)](#shape-3---containingitem-id-producedby-used-n2-avg-43-max-635)
  - [Shape 4 - OR(`curatedBy`, `id`, `memberOf`) (n=1, avg 67.2×, max 67.2×)](#shape-4---orcuratedby-id-memberof-n1-avg-672-max-672)
  - [Shape 5 - single `text` keyword (n=8, avg 8.3×, max 14.1×)](#shape-5---single-text-keyword-n8-avg-83-max-141)
  - [Shape 6 - multi-`text` AND (n=6, avg 6.5×, max 7.2×)](#shape-6---multi-text-and-n6-avg-65-max-72)
  - [Shape 7 - `aboutConcept.id` in 1-element AND (n=4, avg 9.3×, max 13.3×)](#shape-7---aboutconceptid-in-1-element-and-n4-avg-93-max-133)
  - [Shape 8 - `aboutPlace.id` in 1-element AND (n=2, avg 16.8×, max 22.3×)](#shape-8---aboutplaceid-in-1-element-and-n2-avg-168-max-223)
  - [Shape 9 - `containingItem`, `id`, `used` (n=2, avg 15.5×, max 16.2×)](#shape-9---containingitem-id-used-n2-avg-155-max-162)
  - [Shape 10 - OR(`classification`, `id`, `material`) (n=1, avg 24.9×, max 24.9×)](#shape-10---orclassification-id-material-n1-avg-249-max-249)
  - [Shape 11 - naked `memberOf.id` (n=3, avg 7.2×, max 10.9×)](#shape-11---naked-memberofid-n3-avg-72-max-109)
  - [Shape 12 - OR(`encounteredBy`, `id`, `producedBy`, `productionInfluencedBy`) (n=1, avg 18.9×, max 18.9×)](#shape-12---orencounteredby-id-producedby-productioninfluencedby-n1-avg-189-max-189)
  - [Shape 13 - AND(`id`, `memberOf`, `text`) (n=2, avg 6.8×, max 7.8×)](#shape-13---andid-memberof-text-n2-avg-68-max-78)
  - [Shape 14 - naked `occupation.id` (n=1, avg 13.5×, max 13.5×)](#shape-14---naked-occupationid-n1-avg-135-max-135)
  - [Shape 15 - AND(`aboutConcept`, `aboutPlace`, `id`) (n=3, avg 3.6×, max 7.5×)](#shape-15---andaboutconcept-aboutplace-id-n3-avg-36-max-75)
  - [Shape 16 - naked `carries.id` (n=4, avg 1.8×, max 2.1×)](#shape-16---naked-carriesid-n4-avg-18-max-21)
  - [Shape 17 - naked `aboutAgent.id` (n=1, avg 4×, max 4×)](#shape-17---naked-aboutagentid-n1-avg-4-max-4)
  - [Shape 18 - AND(`aboutAgent`, `aboutConcept`, `id`) (n=2, avg 1.6×, max 1.6×)](#shape-18---andaboutagent-aboutconcept-id-n2-avg-16-max-16)
  - [Shape 19 - naked `classification.id` (n=1, avg 2.1×, max 2.1×)](#shape-19---naked-classificationid-n1-avg-21-max-21)
  - [Shape 20 - naked `partOfWork.id` (n=1, avg 1.8×, max 1.8×)](#shape-20---naked-partofworkid-n1-avg-18-max-18)

# Input

Source: `scratch/5k-search-comparison.json`
- baseline: `2026-05-27-cts-search-performance-5k` (2026-05-27T14:43:14.401Z)
- current:  `2026-05-27-optic-search-performance-5k` (2026-05-27T15:04:38.884Z)
- generated: 2026-05-31T13:26:12.047Z
 
# Scope of this analysis

- Source contains `slowest_baseline_analysis` and `slowest_current_analysis` (top-100 each).
- This analysis covers the **union of those two lists, restricted to /api/search/{scope} = 173 distinct tests**.
- The middle of the 5588-test distribution is not visible per-test in this JSON, so this view is tail-biased. Aggregate stats below reflect all 5588.
- Within the union: **1 functional regression(s)** (non-PASS in current) and **56 tests with ≥10× regression**.

# LLM Recommended Optimization Priorities

This section was provided by an LLM.  The rest of the document was created by [analyze-search-comparison.mjs](scripts/performance/analyze-search-comparison.mjs):

 > node scripts/performance/analyze-search-comparison.mjs scratch/5k-search-comparison.json --output scratch/5k-search-comparison.md

On to the LLM's recommendations:

1. **`HopWithField` with id-leaf → emit a `ctsConstraint` instead of a `patternJoin`.**
   - Directly resolves shapes 2, 5, 6, 7, 8, 11, 13, 14, 15, 16, 18, 19, 20.
   - Plus the inner levels of shapes 9, 10, 12, 17 (variable amount of additional improvement depending on chain depth).
   - Estimate: roughly 50–55 of the 56 severe regressions in this union and most of the moderate band as well.
   - Once these become ctsConstraints, the new pure-CTS fold (just landed) picks them up automatically inside nested AND/OR.
   - **Highest leverage / smallest code surface.**
2. **`Keyword` plan-AST cost (49K-IRI `referenceName` expansion).**
   - Resolves shapes 3, 4, and the keyword half of shape 10. ~16 tests in this union, but very high frequency in production.
   - Validation harness already staged in [scratch/performance/woman-greek-art-memberOf/](scratch/performance/woman-greek-art-memberOf/) — waiting on run.
3. **Shape 1 mild-but-massive regression (n=86).**
   - The 3.3× ratio is partially the same patternJoins-OR wrap from shape 2; the fix in item 1 above should also reduce this group's regression substantially.
   - Re-measure after item 1 lands before targeting separately.
4. **Shape 17 timeout (if not fully resolved by item 1).**
   - If deeply-nested hop chains in OR still time out, consider a dedicated optimization that flattens hop chains into compound tripleRangeQueries when only id-leaves are present.

If items 1 + 2 land, p99.9 should drop sharply and the large majority of the 56 severe regressions should resolve.

# Aggregate (full 5588 tests)

| Metric | Baseline | Current | Δ |
|---|---|---|---|
| Mean | 37.44 ms | 229.48 ms | **+513%** |
| p50 | 32 ms | 171 ms | +434% |
| p90 | 46 ms | 335 ms | +628% |
| p95 | 54 ms | 361 ms | +569% |
| p99 | 132.55 ms | 427.6 ms | +223% |
| p99.9 | 285.6 ms | 2326.89 ms | **+715%** |
| Pass rate | 96.8% | 96.8% | 0.0 |

# Severity distribution

Bucketed counts across the 173-test union.

| Severity | Count | Notes |
|---|---|---|
| Functional fail | 1 | status != PASS in current |
| Severe (≥10× ratio) | 55 | |
| Moderate (3–10×) | 62 | |
| Mild (<3×) | 55 | |
| Unscored | 0 | missing baseline or current duration |

# Pattern shapes — 173-test union

Rows ordered by impact (avg ratio × n), then max ratio. Pattern files live in [src/main/ml-modules/root/lib/search/patterns](/src/main/ml-modules/root/lib/search/patterns).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1---orcreatedby-creationinfluencedby-id-publishedby-n42-avg-207-max-136) | OR(`createdBy`, `creationInfluencedBy`, `id`, `publishedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 42 | work | 27–109 | 325–4625 | 20.7× | 136× |
| [2](#shape-2---oraboutconcept-classification-id-influencedbyconcept-language-n86-avg-33-max-6) | OR(`aboutConcept`, `classification`, `id`, `influencedByConcept`, `language`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 86 | work | 82–162 | 339–530 | 3.3× | 6× |
| [3](#shape-3---containingitem-id-producedby-used-n2-avg-43-max-635) | `containingItem`, `id`, `producedBy`, `used` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | event | 33–37 | 833–2094 | 43× | 63.5× |
| [4](#shape-4---orcuratedby-id-memberof-n1-avg-672-max-672) | OR(`curatedBy`, `id`, `memberOf`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 313–313 | 21032 | 67.2× | 67.2× |
| [5](#shape-5---single-text-keyword-n8-avg-83-max-141) | single `text` keyword | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 8 | item | 59–199 | 564–1210 | 8.3× | 14.1× |
| [6](#shape-6---multi-text-and-n6-avg-65-max-72) | multi-`text` AND | [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 6 | item,work | 191–489 | 1175–3293 | 6.5× | 7.2× |
| [7](#shape-7---aboutconceptid-in-1-element-and-n4-avg-93-max-133) | `aboutConcept.id` in 1-element AND | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 4 | work | 44–128 | 175–761 | 9.3× | 13.3× |
| [8](#shape-8---aboutplaceid-in-1-element-and-n2-avg-168-max-223) | `aboutPlace.id` in 1-element AND | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 58–68 | 655–1519 | 16.8× | 22.3× |
| [9](#shape-9---containingitem-id-used-n2-avg-155-max-162) | `containingItem`, `id`, `used` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | event | 32–34 | 504–518 | 15.5× | 16.2× |
| [10](#shape-10---orclassification-id-material-n1-avg-249-max-249) | OR(`classification`, `id`, `material`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 64–64 | 1595 | 24.9× | 24.9× |
| [11](#shape-11---naked-memberofid-n3-avg-72-max-109) | naked `memberOf.id` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | agent,item | 45–99 | 168–515 | 7.2× | 10.9× |
| [12](#shape-12---orencounteredby-id-producedby-productioninfluencedby-n1-avg-189-max-189) | OR(`encounteredBy`, `id`, `producedBy`, `productionInfluencedBy`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 31–31 | 586 | 18.9× | 18.9× |
| [13](#shape-13---andid-memberof-text-n2-avg-68-max-78) | AND(`id`, `memberOf`, `text`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 2 | item | 64–810 | 498–4634 | 6.8× | 7.8× |
| [14](#shape-14---naked-occupationid-n1-avg-135-max-135) | naked `occupation.id` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 37–37 | 500 | 13.5× | 13.5× |
| [15](#shape-15---andaboutconcept-aboutplace-id-n3-avg-36-max-75) | AND(`aboutConcept`, `aboutPlace`, `id`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 71–102 | 160–529 | 3.6× | 7.5× |
| [16](#shape-16---naked-carriesid-n4-avg-18-max-21) | naked `carries.id` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 4 | item | 95–101 | 161–208 | 1.8× | 2.1× |
| [17](#shape-17---naked-aboutagentid-n1-avg-4-max-4) | naked `aboutAgent.id` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 127–127 | 510 | 4× | 4× |
| [18](#shape-18---andaboutagent-aboutconcept-id-n2-avg-16-max-16) | AND(`aboutAgent`, `aboutConcept`, `id`) | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 102–103 | 166–168 | 1.6× | 1.6× |
| [19](#shape-19---naked-classificationid-n1-avg-21-max-21) | naked `classification.id` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 98–98 | 201 | 2.1× | 2.1× |
| [20](#shape-20---naked-partofworkid-n1-avg-18-max-18) | naked `partOfWork.id` | [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 96–96 | 176 | 1.8× | 1.8× |

Total: 173 tests across 20 distinct shapes.

# Detailed per-shape analysis

## Shape 1 - OR(`createdBy`, `creationInfluencedBy`, `id`, `publishedBy`) (n=42, avg 20.7×, max 136×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 27–109 ms; current range: 325–4625 ms
- Ratio: avg 20.7×, max 136×

Worst 5 of 42:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3965 | work | 34 | 4625 | 136× | — |
| Backend log test 3653 | work | 31 | 3135 | 101.1× | — |
| Backend log test 3644 | work | 27 | 2114 | 78.3× | — |
| Backend log test 3655 | work | 32 | 1970 | 61.6× | — |
| Backend log test 3654 | work | 31 | 778 | 25.1× | — |

Example criteria (test `Backend log test 3965`):

```json
{
  "OR": [
    {
      "createdBy": {
        "id": "https://lux.collections.yale.edu/data/person/c5215e59-acb6-43d3-a210-e12ec3ccde5b"
      }
    },
    {
      "publishedBy": {
        "id": "https://lux.collections.yale.edu/data/person/c5215e59-acb6-43d3-a210-e12ec3ccde5b"
      }
    },
    {
      "creationInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/c5215e59-acb6-43d3-a210-e12ec3ccde5b"
      }
    }
  ]
}
```

## Shape 2 - OR(`aboutConcept`, `classification`, `id`, `influencedByConcept`, `language`) (n=86, avg 3.3×, max 6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 82–162 ms; current range: 339–530 ms
- Ratio: avg 3.3×, max 6×

Worst 5 of 86:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3659 | work | 89 | 530 | 6× | — |
| Backend log test 3660 | work | 83 | 465 | 5.6× | — |
| Backend log test 1436 | work | 82 | 423 | 5.2× | — |
| Backend log test 4848 | work | 84 | 428 | 5.1× | — |
| Backend log test 945 | work | 82 | 411 | 5× | — |

Example criteria (test `Backend log test 3659`):

```json
{
  "OR": [
    {
      "classification": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/75b52304-86e2-48d9-bf24-0f56b75c23f0"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/75b52304-86e2-48d9-bf24-0f56b75c23f0"
            }
          }
        ]
      }
    },
    {
      "language": {
        "OR": [
          {
            "id": "https://lux.collections.yale.edu/data/concept/75b52304-86e2-48d9-bf24-0f56b75c23f0"
          },
          {
            "influencedByConcept": {
              "id": "https://lux.collections.yale.edu/data/concept/75b52304-86e2-48d9-bf24-0f56b75c23f0"
            }
          }
        ]
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/75b52304-86e2-48d9-bf24-0f56b75c23f0"
      }
    }
  ]
}
```

## Shape 3 - `containingItem`, `id`, `producedBy`, `used` (n=2, avg 43×, max 63.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: event
- Baseline range: 33–37 ms; current range: 833–2094 ms
- Ratio: avg 43×, max 63.5×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3516 | event | 33 | 2094 | 63.5× | — |
| Backend log test 186 | event | 37 | 833 | 22.5× | — |

Example criteria (test `Backend log test 3516`):

```json
{
  "used": {
    "containingItem": {
      "producedBy": {
        "id": "https://lux.collections.yale.edu/data/person/d564dc62-0bc3-4295-92b9-f116e515972c"
      }
    }
  }
}
```

## Shape 4 - OR(`curatedBy`, `id`, `memberOf`) (n=1, avg 67.2×, max 67.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 313–313 ms; current range: 21032–21032 ms
- Ratio: avg 67.2×, max 67.2×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 10 | item | 313 | 21032 | 67.2× | FAIL |

Example criteria (test `Backend log test 10`):

```json
{
  "OR": [
    {
      "memberOf": {
        "curatedBy": {
          "id": "https://lux.collections.yale.edu/data/group/0a5ed086-396b-4cc2-8120-fdc3f8953ce2"
        }
      }
    },
    {
      "memberOf": {
        "curatedBy": {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/group/0a5ed086-396b-4cc2-8120-fdc3f8953ce2"
          }
        }
      }
    }
  ]
}
```

## Shape 5 - single `text` keyword (n=8, avg 8.3×, max 14.1×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 59–199 ms; current range: 564–1210 ms
- Ratio: avg 8.3×, max 14.1×

Worst 5 of 8:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4568 | item | 59 | 831 | 14.1× | — |
| Backend log test 4482 | item | 63 | 883 | 14× | — |
| Backend log test 4582 | item | 68 | 683 | 10× | — |
| Backend log test 4837 | item | 191 | 1210 | 6.3× | PASS |
| Backend log test 4766 | item | 190 | 1203 | 6.3× | PASS |

Example criteria (test `Backend log test 4568`):

```json
{
  "text": "Mellon",
  "_lang": "en"
}
```

## Shape 6 - multi-`text` AND (n=6, avg 6.5×, max 7.2×)

- Patterns: [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item, work
- Baseline range: 191–489 ms; current range: 1175–3293 ms
- Ratio: avg 6.5×, max 7.2×

Worst 5 of 6:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 141 | item | 379 | 2722 | 7.2× | PASS |
| Backend log test 4144 | item | 345 | 2353 | 6.8× | PASS |
| Backend log test 845 | item | 335 | 2289 | 6.8× | PASS |
| Backend log test 849 | work | 489 | 3293 | 6.7× | PASS |
| Backend log test 4865 | item | 191 | 1223 | 6.4× | PASS |

Example criteria (test `Backend log test 141`):

```json
{
  "AND": [
    {
      "text": "Babylonian",
      "_lang": "en"
    },
    {
      "text": "collection",
      "_lang": "en"
    }
  ]
}
```

## Shape 7 - `aboutConcept.id` in 1-element AND (n=4, avg 9.3×, max 13.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 44–128 ms; current range: 175–761 ms
- Ratio: avg 9.3×, max 13.3×

Worst 4 of 4:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3652 | work | 44 | 583 | 13.3× | — |
| Backend log test 4987 | work | 58 | 761 | 13.1× | — |
| Backend log test 3460 | work | 61 | 575 | 9.4× | — |
| Backend log test 3299 | work | 128 | 175 | 1.4× | PASS |

Example criteria (test `Backend log test 3652`):

```json
{
  "AND": [
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/b72e8ef0-502c-4563-a04b-3fbde5d9f838"
      }
    }
  ]
}
```

## Shape 8 - `aboutPlace.id` in 1-element AND (n=2, avg 16.8×, max 22.3×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 58–68 ms; current range: 655–1519 ms
- Ratio: avg 16.8×, max 22.3×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 287 | work | 68 | 1519 | 22.3× | — |
| Backend log test 286 | work | 58 | 655 | 11.3× | — |

Example criteria (test `Backend log test 287`):

```json
{
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/58a57603-f224-4cc7-ab41-f08876619e23"
      }
    }
  ]
}
```

## Shape 9 - `containingItem`, `id`, `used` (n=2, avg 15.5×, max 16.2×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](/src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: event
- Baseline range: 32–34 ms; current range: 504–518 ms
- Ratio: avg 15.5×, max 16.2×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2328 | event | 32 | 518 | 16.2× | — |
| Backend log test 3365 | event | 34 | 504 | 14.8× | — |

Example criteria (test `Backend log test 2328`):

```json
{
  "used": {
    "containingItem": {
      "id": "https://lux.collections.yale.edu/data/object/fe89fc06-a20b-4809-b30d-6d2507b4c7c2"
    }
  }
}
```

## Shape 10 - OR(`classification`, `id`, `material`) (n=1, avg 24.9×, max 24.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 64–64 ms; current range: 1595–1595 ms
- Ratio: avg 24.9×, max 24.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4858 | item | 64 | 1595 | 24.9× | — |

Example criteria (test `Backend log test 4858`):

```json
{
  "OR": [
    {
      "classification": {
        "id": "https://lux.collections.yale.edu/data/concept/1ee3a28c-d10c-4e7d-8d73-dea682a7ca28"
      }
    },
    {
      "material": {
        "id": "https://lux.collections.yale.edu/data/concept/1ee3a28c-d10c-4e7d-8d73-dea682a7ca28"
      }
    }
  ]
}
```

## Shape 11 - naked `memberOf.id` (n=3, avg 7.2×, max 10.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent, item
- Baseline range: 45–99 ms; current range: 168–515 ms
- Ratio: avg 7.2×, max 10.9×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4600 | item | 45 | 492 | 10.9× | — |
| Backend log test 138 | item | 57 | 515 | 9× | — |
| Backend log test 9 | agent | 99 | 168 | 1.7× | PASS |

Example criteria (test `Backend log test 4600`):

```json
{
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/set/55d8fe4d-31da-4b33-9f0a-1738b78aa24e"
  }
}
```

## Shape 12 - OR(`encounteredBy`, `id`, `producedBy`, `productionInfluencedBy`) (n=1, avg 18.9×, max 18.9×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 31–31 ms; current range: 586–586 ms
- Ratio: avg 18.9×, max 18.9×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 2945 | item | 31 | 586 | 18.9× | — |

Example criteria (test `Backend log test 2945`):

```json
{
  "OR": [
    {
      "producedBy": {
        "id": "https://lux.collections.yale.edu/data/person/d63f9b4d-d4cd-4cdc-809f-62646e6b7297"
      }
    },
    {
      "encounteredBy": {
        "id": "https://lux.collections.yale.edu/data/person/d63f9b4d-d4cd-4cdc-809f-62646e6b7297"
      }
    },
    {
      "productionInfluencedBy": {
        "id": "https://lux.collections.yale.edu/data/person/d63f9b4d-d4cd-4cdc-809f-62646e6b7297"
      }
    }
  ]
}
```

## Shape 13 - AND(`id`, `memberOf`, `text`) (n=2, avg 6.8×, max 7.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](/src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
- Scopes: item
- Baseline range: 64–810 ms; current range: 498–4634 ms
- Ratio: avg 6.8×, max 7.8×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 169 | item | 64 | 498 | 7.8× | — |
| Backend log test 110 | item | 810 | 4634 | 5.7× | PASS |

Example criteria (test `Backend log test 169`):

```json
{
  "AND": [
    {
      "AND": [
        {
          "text": "Babylonian",
          "_lang": "en"
        },
        {
          "text": "collection",
          "_lang": "en"
        }
      ]
    },
    {
      "AND": [
        {
          "memberOf": {
            "id": "https://lux.collections.yale.edu/data/set/a996e468-616e-47b3-966a-ced654bc53a6"
          }
        }
      ]
    }
  ]
}
```

## Shape 14 - naked `occupation.id` (n=1, avg 13.5×, max 13.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 37–37 ms; current range: 500–500 ms
- Ratio: avg 13.5×, max 13.5×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 3650 | agent | 37 | 500 | 13.5× | — |

Example criteria (test `Backend log test 3650`):

```json
{
  "occupation": {
    "id": "https://lux.collections.yale.edu/data/concept/e02efaff-9b3f-4c9b-a328-9384c81a3f57"
  }
}
```

## Shape 15 - AND(`aboutConcept`, `aboutPlace`, `id`) (n=3, avg 3.6×, max 7.5×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 71–102 ms; current range: 160–529 ms
- Ratio: avg 3.6×, max 7.5×

Worst 3 of 3:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 279 | work | 71 | 529 | 7.5× | — |
| Backend log test 4009 | work | 102 | 184 | 1.8× | PASS |
| Backend log test 4989 | work | 101 | 160 | 1.6× | PASS |

Example criteria (test `Backend log test 279`):

```json
{
  "AND": [
    {
      "aboutPlace": {
        "id": "https://lux.collections.yale.edu/data/place/f14804ea-6bd1-4bfb-9394-6f5428c83c34"
      }
    },
    {
      "aboutConcept": {
        "id": "https://lux.collections.yale.edu/data/concept/fbeaa4e8-5a0f-4db0-9f16-b7fbdd66cd54"
      }
    }
  ]
}
```

## Shape 16 - naked `carries.id` (n=4, avg 1.8×, max 2.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: item
- Baseline range: 95–101 ms; current range: 161–208 ms
- Ratio: avg 1.8×, max 2.1×

Worst 4 of 4:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1610 | item | 101 | 208 | 2.1× | PASS |
| Backend log test 4936 | item | 98 | 168 | 1.7× | PASS |
| Backend log test 5142 | item | 95 | 163 | 1.7× | PASS |
| Backend log test 5119 | item | 98 | 161 | 1.6× | PASS |

Example criteria (test `Backend log test 1610`):

```json
{
  "carries": {
    "id": "https://lux.collections.yale.edu/data/text/4fd2aaa9-9b5f-4141-bc95-17feee05126e"
  }
}
```

## Shape 17 - naked `aboutAgent.id` (n=1, avg 4×, max 4×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 127–127 ms; current range: 510–510 ms
- Ratio: avg 4×, max 4×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 1 | work | 127 | 510 | 4× | PASS |

Example criteria (test `Backend log test 1`):

```json
{
  "aboutAgent": {
    "id": "https://lux.collections.yale.edu/data/group/bf219a49-0005-40df-a1d7-402537e9b485"
  }
}
```

## Shape 18 - AND(`aboutAgent`, `aboutConcept`, `id`) (n=2, avg 1.6×, max 1.6×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 102–103 ms; current range: 166–168 ms
- Ratio: avg 1.6×, max 1.6×

Worst 2 of 2:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4802 | work | 103 | 168 | 1.6× | PASS |
| Backend log test 4707 | work | 102 | 166 | 1.6× | PASS |

Example criteria (test `Backend log test 4802`):

```json
{
  "AND": [
    {
      "aboutAgent": {
        "id": "https://lux.collections.yale.edu/data/group/b6002217-ed85-4fb6-9dd9-e68b89f6677d"
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

## Shape 19 - naked `classification.id` (n=1, avg 2.1×, max 2.1×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: agent
- Baseline range: 98–98 ms; current range: 201–201 ms
- Ratio: avg 2.1×, max 2.1×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4860 | agent | 98 | 201 | 2.1× | PASS |

Example criteria (test `Backend log test 4860`):

```json
{
  "classification": {
    "id": "https://lux.collections.yale.edu/data/concept/1ee3a28c-d10c-4e7d-8d73-dea682a7ca28"
  }
}
```

## Shape 20 - naked `partOfWork.id` (n=1, avg 1.8×, max 1.8×)

- Patterns: [DocumentIdOrIri](/src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](/src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)
- Scopes: work
- Baseline range: 96–96 ms; current range: 176–176 ms
- Ratio: avg 1.8×, max 1.8×

Worst 1 of 1:

| Test | scope | base (ms) | curr (ms) | ratio | currStatus |
|---|---|---|---|---|---|
| Backend log test 4841 | work | 96 | 176 | 1.8× | PASS |

Example criteria (test `Backend log test 4841`):

```json
{
  "partOfWork": {
    "id": "https://lux.collections.yale.edu/data/text/d66c0c3b-bf2f-4049-a1db-57f0cee886a7"
  }
}
```

---