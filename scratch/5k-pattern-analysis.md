# 5K Comparison: Pattern-Level Analysis

Source: [scratch/5k-search-comparison.json](scratch/5k-search-comparison.json) (baseline = CTS, current = Optic, 2026-05-27).
Pattern names from [scratch/config/searchTermsConfigOptic.mjs](scratch/config/searchTermsConfigOptic.mjs).

## Scope of this analysis

- The summary JSON contains **two pre-built top-100 lists**: `slowest_baseline_analysis` (slowest under CTS) and `slowest_current_analysis` (slowest under Optic).
- This analysis covers the **union of those two lists = 173 distinct tests** (27 appear in both).
- The middle of the 5,588-test distribution is not visible per-test in this JSON, so this view is necessarily tail-biased. Aggregate stats (mean, percentiles) come from the `summary` block and reflect all 5,588.
- Within the 173-test union: **1 functional regression** (timeout, status flip) and **56 tests with ≥10× regression**.

---

## Aggregate (full 5,588 tests)

| Metric | Baseline (CTS) | Current (Optic) | Δ |
|---|---|---|---|
| Mean | 37 ms | 229 ms | +513% |
| p50 | 32 ms | 171 ms | +434% |
| p90 | 46 ms | 335 ms | +628% |
| p95 | 54 ms | 361 ms | +569% |
| p99 | 133 ms | 428 ms | +223% |
| p99.9 | 286 ms | 2,327 ms | **+715%** |
| Pass rate | 96.8% | 96.8% | 1 status flip |

Across the 173-test union, total wall time grew from **18.4 s → 123.1 s (6.7×)**. The regression is uniform across all percentiles — every shape pays a multi-hundred-ms tax. The tail (p99.9) is where shape-specific regressions concentrate.

---

## Functional regression — TIMEOUT

### Pattern: deeply-nested `hopWithField` chain inside top-level OR

**`Backend log test 10`** — `item` scope — 313 ms → **21,032 ms (HTTP 500, ≥20 s timeout)**

```json
{ "OR": [
  { "memberOf": { "curatedBy": { "id": "…group/0a5e…" } } },
  { "memberOf": { "curatedBy": { "memberOf": { "id": "…group/0a5e…" } } } }
]}
```

All `hopWithField`. Nested patternJoins inside top-level OR → duplicate-lexicon + full-outer joins compound. **The new pure-CTS fold does not help** here (`hopWithField` emits a patternJoin, not a ctsConstraint).

---

## Pattern shapes — 173-test union, grouped by term/logic signature

The table is sorted approximately by total impact (count × severity).

| # | Shape | n | scopes | base range (ms) | curr range (ms) | avg ratio | comment |
|---|---|---|---|---|---|---|---|
| 1 | `OR` of `aboutConcept` \| `classification.OR(id, influencedByConcept)` \| `language.OR(id, influencedByConcept)` | **86** | work | 82–162 | 339–530 | **3.3×** | "linked-to-this-concept" template; mild regression × huge volume |
| 2 | `OR` of `createdBy.id` \| `publishedBy.id` \| `creationInfluencedBy.id` | **42** | work | 27–109 | 325–4625 | **20.7×** | actor-role probe; **highest-severity bulk shape** |
| 3 | single `text` keyword | 8 | item | 59–1210 | (curr ≈ base) | **8.3×** | rare-term keyword: Divination, Summoning, Spells, Incantation, … |
| 4 | multi-`text` AND | 6 | item, work | 191–489 | 1175–3293 | 6.5× | Malena Rice, Babylonian collection, The Mellon Alchemy, 4-term ANDs |
| 5 | `carries` + `id` | 4 | item | 95–208 | — | 1.8× | mild — id lookup w/ carries; near parity |
| 6 | `aboutConcept.id` AND group | 4 | work | 44–761 | — | 9.3× | id-leaf hopWithField in degenerate AND wrapper |
| 7 | `aboutConcept` \| `aboutPlace` AND | 3 | work | 71–529 | — | 3.6× | mixed hopWithField AND |
| 8 | `memberOf` (top-level hop) | 3 | agent, item | 45–515 | — | 7.2× | id-leaf hopWithField, plain |
| 9 | `aboutAgent` \| `aboutConcept` AND | 2 | work | 102–168 | — | 1.6× | near parity |
| 10 | `event.containingItem` + `used` | 2 | event | 32–518 | — | 15.5× | event-scope hop chain (no producedBy leaf) |
| 11 | `id, memberOf, text` AND | 2 | item | 64–4634 | — | 6.8× | **WGA shape (test 110)** is here |
| 12 | `event.used → containingItem → producedBy.id` | 2 | event | 33–2094 | — | **43.0×** | 3-deep hop chain |
| 13 | `aboutPlace.id` AND | 2 | work | 58–1519 | — | 16.8× | single-hop wrapped in degenerate AND |
| — | `OR` of `classification.id` \| `material.id` | 1 | item | 64 → 1595 | — | 24.9× | (test 4858) |
| — | `OR` of `encounteredBy` \| `producedBy` \| `productionInfluencedBy` (id) | 1 | item | 31 → 586 | — | 18.9× | item-scope variant of shape #2 |
| — | `OR` of nested `memberOf.curatedBy.…` | 1 | item | 313 → **21032** | — | 67.2× | **TIMEOUT (test 10)** |
| — | misc near-parity (id+occupation, partOfWork, agent.classification, aboutAgent) | 5 | various | — | — | 1.8–13.5× | one-off shapes, mostly mild |

Counts add to 173. Single-test shapes are collapsed in the lower section.

---

## Detailed write-ups for the highest-impact shapes

### Shape #1 — work-scope concept linkage OR (n=86, avg 3.3×)

86 tests share this exact template, varying only in concept id. Despite a small per-test regression it is by volume the largest contributor to the slowest-200 list.

Example — **`Backend log test 3659`** · work · 89 → 530 ms:
```json
{ "OR": [
  { "classification": { "OR": [
    { "id": "…concept/75b5…" },
    { "influencedByConcept": { "id": "…concept/75b5…" } }
  ]}},
  { "language": { "OR": [
    { "id": "…concept/75b5…" },
    { "influencedByConcept": { "id": "…concept/75b5…" } }
  ]}},
  { "aboutConcept": { "id": "…concept/75b5…" } }
]}
```

All five leaf occurrences are `hopWithField` with id leaves. Top-level OR has three `hopWithField` branches; two of them have nested OR sub-shapes (id-leaf + one extra hop level). Likely fed by a "what works are linked to this concept" client query.

The empty-groups parentScope rule already merged removes any redundant dataType filters here. The remaining cost is the same patternJoins-OR wrap as shape #2.

### Shape #2 — work-scope actor-role OR (n=42, avg 20.7×, max 136×)

42 tests, all the same shape, varying only in person/group id. **This is the highest-severity bulk regression.** Worst 5:

| Test | id | base → curr | ratio |
|---|---|---|---|
| 3965 | person c521… | 34 → **4625** | 136× |
| 3653 | person a90a… | 31 → 3135 | 101× |
| 3644 | person e791… | 27 → 2114 | 78× |
| 3655 | group c29d… | 32 → 1970 | 62× |
| 3654 | (person) | 31 → 778 | 25× |

Example (test 3965):
```json
{ "OR": [
  { "createdBy":            { "id": "…person/c521…" } },
  { "publishedBy":          { "id": "…person/c521…" } },
  { "creationInfluencedBy": { "id": "…person/c521…" } }
]}
```

Each branch is purely CTS-resolvable (one `cts.tripleRangeQuery`), but each is currently emitted as a `patternJoin`, so top-level OR triggers the assemblePlan wrap: **duplicate the full work-scope lexicon for each of the 3 branches, inner-join each, then full-outer-join them all back together.** Three lexicon scans against the work corpus for what should be a single `cts.orQuery` of three tripleRangeQueries.

This shape is also represented in single-test variants (item-scope test 4858 with `classification | material`, item-scope test for `encounteredBy | producedBy | productionInfluencedBy`).

### Shape #3 — single rare keyword (n=8, avg 8.3×)

`text`-only at top level. Eight item-scope rare-term searches:

| Test | term | base → curr |
|---|---|---|
| 4360 | Divination | 199 → 1202 |
| 4447 | Incantation | 197 → 1191 |
| 4766 | Summoning | 190 → 1203 |
| 4837 | Spells | 191 → 1210 |

(Plus four more with comparable timings.) Driven by the WGA-style 49K-IRI plan-AST issue. No sub-plan to fold; the keyword pattern itself emits a large referenceName expansion straight into the top-level plan AST.

### Shape #4 — multi-text AND (n=6, avg 6.5×)

Linear in keyword count — each term adds one tripleRangeQuery-with-N-IRIs to the plan AST.

| Test | scope | criteria | base → curr |
|---|---|---|---|
| 845 | item | `Malena AND Rice` | 335 → 2289 |
| 849 | work | `Malena AND Rice` | 489 → 3293 |
| 141 | item | `Babylonian AND collection` | 379 → 2722 |
| 4144 | item | `The AND Mellon AND Alchemy` | 345 → 2353 |
| 194 | item | 4-term AND | 246 → 1175 |
| 4865 | item | `Magic AND Spells` | 191 → 1223 |

### Shape #11 — WGA outlier (test 110, in n=2 group)

**`Backend log test 110`** · item · 810 → 4634 ms:
```json
{ "AND": [
  { "AND": [ {"text":"woman"}, {"text":"greek"}, {"text":"art"} ] },
  { "AND": [ {"memberOf": { "id": "…set/5e9b…" }} ] }
]}
```
Inner-AND dataType filter now suppressed by the new broad parentScope rule. Keyword cost (shapes #3/#4) remains the dominant tax.

### Shape #12 — event-scope deep hop chain (n=2, avg 43×)

**`Backend log test 3516`** · event · 33 → 2094 ms:
```json
{ "used": { "containingItem": { "producedBy": { "id": "…person/d564…" } } } }
```
`event.used` (hopWithField) → `item.containingItem` (hopInverse) → `item.producedBy` (hopWithField) → id. Three nested duplicate-lexicon scans.

---

## Where the regressions cluster

| Severity bucket | Count (of 173) | Notes |
|---|---|---|
| Functional fail (timeout) | 1 | test 10 |
| Severe (≥10× ratio) | 56 | dominated by shape #2 (42 of these), plus outliers from #3, #4, #10, #12, #13 |
| Moderate (3–10×) | ~110 | dominated by shape #1 (86 tests) plus shapes #6–8 |
| Mild (<3×) | ~6 | id-only & near-parity shapes |

---

## What's NOT regressing

Shapes absent from the slowest-200 union (and thus presumably at parity for their typical inputs):
- Pure `id`-only document lookups
- Single top-level `hopWithField` *without* OR/AND wrapping
- `indexedValue` / `indexedWord` exact-match terms
- Date / number range terms

---

## Recommended priority for next engine work

1. **`hopWithField` with id-leaf → emit a `ctsConstraint` instead of a `patternJoin`.**
   - Resolves shape #2 (42 tests, including the four worst at 78–136× regression).
   - Likely also resolves shapes #6, #8, #10, #12, #13, the two single-test OR-by-id variants, and the timeout on test 10 (its inner id-leaf levels collapse).
   - Estimate: roughly 50–55 of the 56 severe regressions in this union.
   - Once these become ctsConstraints, the new pure-CTS fold (just landed) picks them up automatically inside nested AND/OR.
   - **Highest leverage / smallest code surface.**
2. **`keyword` plan-AST cost (49K-IRI expansion).**
   - Resolves shapes #3, #4, and the WGA outlier (#11). ~15 tests in this union, but very high frequency in production.
   - Validation harness already staged in [scratch/performance/woman-greek-art-memberOf/](scratch/performance/woman-greek-art-memberOf/) — waiting on run.
3. **Shape #1 mild regression (n=86).**
   - The 3.3× ratio is partially the same patternJoins-OR wrap from #2; the fix in #1 should also reduce this group's regression substantially.
   - Re-measure after #1 lands before targeting separately.

If items 1 + 2 land, the p99.9 should drop sharply and the large majority of the 56 severe regressions should resolve.
