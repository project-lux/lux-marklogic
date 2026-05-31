## **5K Comparison: Pattern-Level Analysis**

- [Input](#input)
- [Scope of this analysis](#scope-of-this-analysis)
- [Aggregate (full 5,588 tests)](#aggregate-full-5588-tests)
- [Pattern shapes — 173-test union](#pattern-shapes--173-test-union)
- [Detailed per-shape analysis](#detailed-per-shape-analysis)
  - [Shape 1 — work-scope concept-linkage OR (n=86, avg 3.3×, max 6.0×)](#shape-1--work-scope-concept-linkage-or-n86-avg-33-max-60)
  - [Shape 2 — work-scope actor-role OR (n=42, avg 20.7×, max 136×)](#shape-2--work-scope-actor-role-or-n42-avg-207-max-136)
  - [Shape 3 — single rare keyword (n=8, avg 8.3×, max 14.1×)](#shape-3--single-rare-keyword-n8-avg-83-max-141)
  - [Shape 4 — multi-text AND (n=6, avg 6.4×, max 7.2×)](#shape-4--multi-text-and-n6-avg-64-max-72)
  - [Shape 5 — `carries.id` (n=4, avg 1.8×, max 2.1×)](#shape-5--carriesid-n4-avg-18-max-21)
  - [Shape 6 — `aboutConcept.id` in degenerate 1-element AND (n=4, avg 9.3×, max 13.2×)](#shape-6--aboutconceptid-in-degenerate-1-element-and-n4-avg-93-max-132)
  - [Shape 7 — `AND(aboutPlace.id, aboutConcept.id)` (n=3, avg 3.6×, max 7.5×)](#shape-7--andaboutplaceid-aboutconceptid-n3-avg-36-max-75)
  - [Shape 8 — top-level `memberOf.id` (n=3, avg 7.2×, max 10.9×)](#shape-8--top-level-memberofid-n3-avg-72-max-109)
  - [Shape 9 — 3-deep event hop chain (n=2, avg 43×, max 63.5×)](#shape-9--3-deep-event-hop-chain-n2-avg-43-max-635)
  - [Shape 10 — WGA-style `AND(AND(text…), AND(memberOf.id))` (n=2, avg 6.8×, max 7.8×)](#shape-10--wga-style-andandtext-andmemberofid-n2-avg-68-max-78)
  - [Shape 11 — `AND(aboutAgent.id, aboutConcept.id)` (n=2, avg 1.6×, max 1.6×)](#shape-11--andaboutagentid-aboutconceptid-n2-avg-16-max-16)
  - [Shape 12 — 2-deep event hop chain (n=2, avg 15.5×, max 16.2×)](#shape-12--2-deep-event-hop-chain-n2-avg-155-max-162)
  - [Shape 13 — `aboutPlace.id` in degenerate 1-element AND (n=2, avg 16.8×, max 22.3×)](#shape-13--aboutplaceid-in-degenerate-1-element-and-n2-avg-168-max-223)
  - [Shape 14 — `agent.classification.id` (n=1, avg 2.1×)](#shape-14--agentclassificationid-n1-avg-21)
  - [Shape 15 — item-scope actor-role OR (n=1, avg 18.9×)](#shape-15--item-scope-actor-role-or-n1-avg-189)
  - [Shape 16 — `OR(classification.id, material.id)` (n=1, avg 24.9×)](#shape-16--orclassificationid-materialid-n1-avg-249)
  - [Shape 17 — nested `OR(memberOf.curatedBy.…)` — TIMEOUT (n=1)](#shape-17--nested-ormemberofcuratedby--timeout-n1)
  - [Shape 18 — `agent.occupation.id` (n=1, avg 13.5×)](#shape-18--agentoccupationid-n1-avg-135)
  - [Shape 19 — `work.partOfWork.id` (n=1, avg 1.8×)](#shape-19--workpartofworkid-n1-avg-18)
  - [Shape 20 — `work.aboutAgent.id` (n=1, avg 4.0×)](#shape-20--workaboutagentid-n1-avg-40)
- [Where the regressions cluster](#where-the-regressions-cluster)
- [What's NOT regressing](#whats-not-regressing)
- [Recommended priority for next engine work](#recommended-priority-for-next-engine-work)

# Input

Source: [scratch/5k-search-comparison.json](scratch/5k-search-comparison.json) (baseline = CTS, current = Optic, 2026-05-27).
Pattern definitions are linked inline from [src/main/ml-modules/root/lib/search/patterns/](src/main/ml-modules/root/lib/search/patterns/).
Term → pattern mapping derived from [scratch/config/searchTermsConfigOptic.mjs](scratch/config/searchTermsConfigOptic.mjs).

# Scope of this analysis

- The summary JSON contains two pre-built top-100 lists: `slowest_baseline_analysis` (slowest under CTS) and `slowest_current_analysis` (slowest under Optic).
- This analysis covers the **union of those two lists = 173 distinct tests** (27 appear in both).
- The middle of the 5,588-test distribution is not visible per-test in this JSON, so this view is necessarily tail-biased. Aggregate stats (mean, percentiles) come from the `summary` block and reflect all 5,588.
- Within the 173-test union: **1 functional regression** (timeout, status flip) and **56 tests with ≥10× regression**.
- **Sample-size caveat:** several shapes are represented by only 1–5 tests. Their ratios (some 18–24×) are *alarming* but the sample is small; treat each as a strong signal worth a dedicated investigation rather than a statistically stable measurement.

---

# Aggregate (full 5,588 tests)

| Metric | Baseline (CTS) | Current (Optic) | Δ |
|---|---|---|---|
| Mean | 37 ms | 229 ms | +513% |
| p50 | 32 ms | 171 ms | +434% |
| p90 | 46 ms | 335 ms | +628% |
| p95 | 54 ms | 361 ms | +569% |
| p99 | 133 ms | 428 ms | +223% |
| p99.9 | 286 ms | 2,327 ms | **+715%** |
| Pass rate | 96.8% | 96.8% | 1 status flip |

Across the 173-test union, total wall time grew from **18.4 s → 123.1 s (6.7×)**.

---

# Pattern shapes — 173-test union

Patterns column lists every pattern class involved in the shape (alphabetized within each cell). Pattern files live in [src/main/ml-modules/root/lib/search/patterns/](src/main/ml-modules/root/lib/search/patterns/).

| # | Shape | Patterns | n | scopes | base range (ms) | curr range (ms) | avg ratio | max ratio |
|---|---|---|---|---|---|---|---|---|
| [1](#shape-1--work-scope-concept-linkage-or-n86-avg-33-max-60) | work-scope concept-linkage `OR(classification.OR(id, influencedByConcept), language.OR(id, influencedByConcept), aboutConcept.id)` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 86 | work | 82–162 | 339–530 | 3.3× | 6.0× |
| [2](#shape-2--work-scope-actor-role-or-n42-avg-207-max-136) | work-scope actor-role `OR(createdBy.id, publishedBy.id, creationInfluencedBy.id)` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 42 | work | 27–109 | 325–4625 | **20.7×** | **136×** |
| [3](#shape-3--single-rare-keyword-n8-avg-83-max-141) | single `text` keyword | [Keyword](src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 8 | item | 59–199 | 564–1210 | 8.3× | 14.1× |
| [4](#shape-4--multi-text-and-n6-avg-64-max-72) | multi-`text` AND | [Keyword](src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 6 | item, work | 191–489 | 1175–3293 | 6.4× | 7.2× |
| [5](#shape-5--carriesid-n4-avg-18-max-21) | `carries.id` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 4 | item | 95–101 | 161–208 | 1.8× | 2.1× |
| [6](#shape-6--aboutconceptid-in-degenerate-1-element-and-n4-avg-93-max-132) | `aboutConcept.id` in degenerate 1-elem AND | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 4 | work | 44–128 | 175–761 | 9.3× | 13.2× |
| [7](#shape-7--andaboutplaceid-aboutconceptid-n3-avg-36-max-75) | `AND(aboutPlace.id, aboutConcept.id)` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | work | 71–102 | 160–529 | 3.6× | 7.5× |
| [8](#shape-8--top-level-memberofid-n3-avg-72-max-109) | top-level `memberOf.id` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 3 | agent, item | 45–99 | 168–515 | 7.2× | 10.9× |
| [9](#shape-9--3-deep-event-hop-chain-n2-avg-43-max-635) | `event.used → containingItem → producedBy.id` (3-deep) | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | event | 33–37 | 833–2094 | **43×** | **63.5×** |
| [10](#shape-10--wga-style-andandtext-andmemberofid-n2-avg-68-max-78) | `AND(AND(text…), AND(memberOf.id))` — WGA shape | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), [Keyword](src/main/ml-modules/root/lib/search/patterns/Keyword.mjs) | 2 | item | 64–810 | 498–4634 | 6.8× | 7.8× |
| [11](#shape-11--andaboutagentid-aboutconceptid-n2-avg-16-max-16) | `AND(aboutAgent.id, aboutConcept.id)` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 102–103 | 166–168 | 1.6× | 1.6× |
| [12](#shape-12--2-deep-event-hop-chain-n2-avg-155-max-162) | `event.used → containingItem.id` (2-deep) | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopInverse](src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | event | 32–34 | 504–518 | 15.5× | 16.2× |
| [13](#shape-13--aboutplaceid-in-degenerate-1-element-and-n2-avg-168-max-223) | `aboutPlace.id` in degenerate 1-elem AND | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 2 | work | 58–68 | 655–1519 | 16.8× | 22.3× |
| [14](#shape-14--agentclassificationid-n1-avg-21) | `agent.classification.id` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 98 | 201 | 2.1× | 2.1× |
| [15](#shape-15--item-scope-actor-role-or-n1-avg-189) | item-scope actor-role `OR(producedBy.id, encounteredBy.id, productionInfluencedBy.id)` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 31 | 586 | 18.9× | 18.9× |
| [16](#shape-16--orclassificationid-materialid-n1-avg-249) | `OR(classification.id, material.id)` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 64 | 1595 | 24.9× | 24.9× |
| [17](#shape-17--nested-ormemberofcuratedby--timeout-n1) | nested `OR(memberOf.curatedBy.…)` (TIMEOUT) | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | item | 313 | **21032** | **67.2×** | **67.2×** |
| [18](#shape-18--agentoccupationid-n1-avg-135) | `agent.occupation.id` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | agent | 37 | 500 | 13.5× | 13.5× |
| [19](#shape-19--workpartofworkid-n1-avg-18) | `work.partOfWork.id` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 96 | 176 | 1.8× | 1.8× |
| [20](#shape-20--workaboutagentid-n1-avg-40) | `work.aboutAgent.id` | [DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs), [HopWithField](src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs) | 1 | work | 127 | 510 | 4.0× | 4.0× |

Total: 173 tests across 20 distinct shapes.

---

# Detailed per-shape analysis

## Shape 1 — work-scope concept-linkage OR (n=86, avg 3.3×, max 6.0×)

86 tests share this exact template, varying only in concept id. By volume the largest contributor to the slowest-200 list. Drives moderate-band aggregate regression.

Example — **`Backend log test 3659`** · work · 89 → 530 ms (6×):
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

Five leaf occurrences, all `HopWithField` with id leaves. Top-level OR has three branches, two of which contain nested OR sub-shapes. The empty-groups parentScope rule (just merged) already removes any redundant dataType filters. Remaining cost is the same patternJoins-OR wrap as shape 2 — the three OR branches each become a patternJoin against the work-scope lexicon. Likely the "what works are linked to this concept" client query.

## Shape 2 — work-scope actor-role OR (n=42, avg 20.7×, max 136×)

42 tests, identical shape, varying only by person/group id. **Highest-severity bulk regression in the entire union.** Worst 5:

| Test | id | base → curr | ratio |
|---|---|---|---|
| 3965 | person c521… | 34 → **4625** | 136× |
| 3653 | person a90a… | 31 → 3135 | 101× |
| 3644 | person e791… | 27 → 2114 | 78× |
| 3655 | group c29d… | 32 → 1970 | 62× |
| 3654 | (person)    | 31 → 778  | 25× |

Example (test 3965):
```json
{ "OR": [
  { "createdBy":            { "id": "…person/c521…" } },
  { "publishedBy":          { "id": "…person/c521…" } },
  { "creationInfluencedBy": { "id": "…person/c521…" } }
]}
```

Each branch is purely CTS-resolvable (one `cts.tripleRangeQuery`), but each is currently emitted as a `patternJoin` by `HopWithField`. Top-level OR therefore triggers the assemblePlan patternJoins-OR wrap: **duplicate the full work-scope lexicon for each of the 3 branches, inner-join each, then full-outer-join them all back together** — three lexicon scans against the entire work corpus for what should be a single `cts.orQuery` of three tripleRangeQueries.

## Shape 3 — single rare keyword (n=8, avg 8.3×, max 14.1×)

`{"text": "…", "_lang": "en"}` at top level, no AND/OR. Eight item-scope rare-term searches:

| Test | term | base → curr | ratio |
|---|---|---|---|
| 4568 | Mellon       | 59 → 831  | 14.1× |
| 4360 | Divination   | 199 → 1202 | 6.0× |
| 4447 | Incantation  | 197 → 1191 | 6.0× |
| 4766 | Summoning    | 190 → 1203 | 6.3× |
| 4837 | Spells       | 191 → 1210 | 6.3× |

(Three more with comparable timings.) Driven by the 49K-IRI `referenceName` expansion the `Keyword` pattern emits straight into the top-level plan AST. No sub-plan to fold; the cost is in plan optimization itself. This is the WGA root cause when stripped to a single keyword.

## Shape 4 — multi-text AND (n=6, avg 6.4×, max 7.2×)

Linear in keyword count — each `text` term adds one tripleRangeQuery-with-N-IRIs to the plan AST.

| Test | scope | criteria | base → curr | ratio |
|---|---|---|---|---|
| 141 | item | `Babylonian AND collection` | 379 → 2722 | 7.2× |
| 4144 | item | `The AND Mellon AND Alchemy` | 345 → 2353 | 6.8× |
| 845 | item | `Malena AND Rice` | 335 → 2289 | 6.8× |
| 849 | work | `Malena AND Rice` | 489 → 3293 | 6.7× |
| 194 | item | 4-term (Babylonian collection MLC 2153) | 246 → 1175 | 4.8× |
| 4865 | item | `Magic AND Spells` | 191 → 1223 | 6.4× |

Same `Keyword` 49K-IRI cost as shape 3, paid per term.

## Shape 5 — `carries.id` (n=4, avg 1.8×, max 2.1×)

Near parity. Example — **`Backend log test 1610`** · item · 101 → 208 ms (2.1×):
```json
{ "carries": { "id": "…text/4fd2…" } }
```

Single `HopWithField` by id at top level, no wrapping. The 2× tax appears to be plan-cache miss / generic Optic overhead vs. raw CTS, not the patternJoins wrap. Lowest-priority shape; useful as a baseline of "what Optic costs even when the engine does the right thing."

## Shape 6 — `aboutConcept.id` in degenerate 1-element AND (n=4, avg 9.3×, max 13.2×)

Example — **`Backend log test 3652`** · work · 44 → 583 ms (13.2×):
```json
{ "AND": [ { "aboutConcept": { "id": "…concept/b72e…" } } ] }
```

Single `HopWithField` by id wrapped in a 1-element AND. The newly-added pure-CTS fold doesn't trigger because there's no sub-plan; the 1-element AND collapses to its leaf directly, leaving the patternJoin at top level — and the assemblePlan wrap fires anyway for a lone patternJoin. Same root cause as shape 2; fix is the same (id-leaf hop → ctsConstraint).

## Shape 7 — `AND(aboutPlace.id, aboutConcept.id)` (n=3, avg 3.6×, max 7.5×)

Example — **`Backend log test 279`** · work · 71 → 529 ms (7.5×):
```json
{ "AND": [
  { "aboutPlace":   { "id": "…place/f148…" } },
  { "aboutConcept": { "id": "…concept/fbea…" } }
]}
```

Two top-level `HopWithField` branches joined by AND. Each is a patternJoin → inner-join in assemblePlan. The fix from shape 2 collapses both branches into ctsConstraints, which then become a single `cts.andQuery` of two tripleRangeQueries — no joins.

## Shape 8 — top-level `memberOf.id` (n=3, avg 7.2×, max 10.9×)

Example — **`Backend log test 4600`** · item · 45 → 492 ms (10.9×):
```json
{ "memberOf": { "id": "…set/55d8…" } }
```

Naked `HopWithField` by id, no wrapper. Should be identical-cost to shape 5 (`carries.id`) but isn't — shape 5 averages 1.8×, shape 8 averages 7.2×. Suggests the cost is driven by referenceName/predicate set size (memberOf has many backing predicates / large IRI expansions for set membership) rather than the engine pattern itself. Fix from shape 2 still applies, but **even after the fix this shape may not collapse fully if the underlying tripleRangeQuery is expensive on memberOf's predicate set.** Worth re-measuring after the fix.

## Shape 9 — 3-deep event hop chain (n=2, avg 43×, max 63.5×)

Example — **`Backend log test 3516`** · event · 33 → 2094 ms (63.5×):
```json
{ "used": { "containingItem": { "producedBy": { "id": "…person/d564…" } } } }
```

`event.used` (`HopWithField`) → `item.containingItem` (`HopInverse`) → `item.producedBy` (`HopWithField`) → id-leaf. Three nested duplicate-lexicon scans, each with its own join. **Highest avg-ratio shape (43×).** The id-leaf fix collapses the innermost level (`producedBy.id` → tripleRangeQuery), which then folds into the parent hop's child query expression. The middle and outer hops remain joins because their children are nested term expressions, not ids. Expected outcome: dramatic but not complete improvement.

## Shape 10 — WGA-style `AND(AND(text…), AND(memberOf.id))` (n=2, avg 6.8×, max 7.8×)

Example — **`Backend log test 169`** · item · 64 → 498 ms (7.8×):
```json
{ "AND": [
  { "AND": [ {"text":"Babylonian"}, {"text":"collection"} ] },
  { "AND": [ {"memberOf": { "id": "…set/a996…" }} ] }
]}
```

(Test 110 — the original WGA case at 810 → 4634 — is the other test in this group.) The inner-AND dataType filter is now suppressed by the broad parentScope rule already merged. The `memberOf` sub-tree may fold via the new pure-CTS fold once the id-leaf hop fix lands. Keyword cost (shapes 3/4) remains the dominant tax.

## Shape 11 — `AND(aboutAgent.id, aboutConcept.id)` (n=2, avg 1.6×, max 1.6×)

Example — **`Backend log test 4707`** · work · 102 → 166 ms (1.6×):
```json
{ "AND": [
  { "aboutAgent":   { "id": "…person/dde4…" } },
  { "aboutConcept": { "id": "…concept/3cd2…" } }
]}
```

Near parity. Structurally identical to shape 7 (`aboutPlace + aboutConcept`) but lower regression. Two reasonable explanations: (a) `aboutAgent` has a much smaller IRI expansion than `aboutPlace`, making the patternJoin cheap, or (b) both branches return small result sets that limit the join cost. Either way, very low priority — likely resolves automatically when shape 2 fix lands.

## Shape 12 — 2-deep event hop chain (n=2, avg 15.5×, max 16.2×)

Example — **`Backend log test 2328`** · event · 32 → 518 ms (16.2×):
```json
{ "used": { "containingItem": { "id": "…object/fe89…" } } }
```

Same family as shape 9 but only 2 levels deep (id-leaf at the second level). The id-leaf fix should collapse this further than shape 9 — `containingItem.id` becomes a tripleRangeQuery, fused into the outer `used` hop's child query. Expected: near-baseline performance after fix.

## Shape 13 — `aboutPlace.id` in degenerate 1-element AND (n=2, avg 16.8×, max 22.3×)

Example — **`Backend log test 287`** · work · 68 → 1519 ms (22.3×):
```json
{ "AND": [ { "aboutPlace": { "id": "…place/58a5…" } } ] }
```

Same structural pattern as shape 6 (`aboutConcept` variant). Higher regression ratio because `aboutPlace` has a larger IRI expansion than `aboutConcept`. Same fix.

## Shape 14 — `agent.classification.id` (n=1, avg 2.1×)

Example — **`Backend log test 4860`** · agent · 98 → 201 ms (2.1×):
```json
{ "classification": { "id": "…concept/1ee3…" } }
```

Near-parity single-shape. Naked `HopWithField` by id on agent scope. Same fix as shape 5/8; comparable expected post-fix behavior.

## Shape 15 — item-scope actor-role OR (n=1, avg 18.9×)

Example — **`Backend log test 2945`** · item · 31 → 586 ms (18.9×):
```json
{ "OR": [
  { "producedBy":              { "id": "…person/d63f…" } },
  { "encounteredBy":           { "id": "…person/d63f…" } },
  { "productionInfluencedBy":  { "id": "…person/d63f…" } }
]}
```

**Item-scope structural twin of shape 2.** Same three-branch OR of `HopWithField`-by-id pattern — just in `item` scope instead of `work`, with item's actor predicates instead of work's. Same fix resolves it. The fact that this only shows up once in the slowest-200 (vs. 42 in shape 2) suggests the production traffic profile heavily favors work-scope actor probes; the item-scope version is still very likely to be a hot pattern in real usage that just wasn't exercised much in this test corpus.

## Shape 16 — `OR(classification.id, material.id)` (n=1, avg 24.9×)

Example — **`Backend log test 4858`** · item · 64 → 1595 ms (24.9×):
```json
{ "OR": [
  { "classification": { "id": "…concept/1ee3…" } },
  { "material":       { "id": "…concept/1ee3…" } }
]}
```

Two-branch variant of shape 2. Same root cause (patternJoins-OR wrap), same fix. Notable because `classification` and `material` are common item-faceting attributes — this exact shape (or its 3-branch variants) likely shows up in any "items of type X" query. **Probably a frequent shape in production not well represented in the test corpus.**

## Shape 17 — nested `OR(memberOf.curatedBy.…)` — TIMEOUT (n=1)

**`Backend log test 10`** · item · 313 → **21,032 ms (HTTP 500, ≥20 s timeout)**:
```json
{ "OR": [
  { "memberOf": { "curatedBy": { "id": "…group/0a5e…" } } },
  { "memberOf": { "curatedBy": { "memberOf": { "id": "…group/0a5e…" } } } }
]}
```

Top-level OR of two nested `HopWithField` chains (2-deep and 3-deep). Cost compounds along two dimensions: (a) patternJoins-OR wrap at the OR root, (b) nested patternJoins inside each branch. The id-leaf fix collapses the innermost `id` of both branches into a tripleRangeQuery, then the parent `curatedBy` / `memberOf` hops may further fold via the new pure-CTS fold if their children become pure ctsConstraints. **Likely (but not guaranteed) to resolve with the id-leaf fix.** If it doesn't, this is the canonical "deeply nested hop chain in OR" shape that would need a dedicated optimization (e.g., flattening hop chains into compound tripleRangeQueries when only id-leaves are present).

## Shape 18 — `agent.occupation.id` (n=1, avg 13.5×)

Example — **`Backend log test 3650`** · agent · 37 → 500 ms (13.5×):
```json
{ "occupation": { "id": "…concept/e02e…" } }
```

Naked `HopWithField` by id on agent scope. Surprisingly large regression for such a simple shape — higher than `agent.classification.id` (shape 14) at 2.1×. Likely explanation: `occupation` predicate has a much larger IRI expansion in the indexes than `classification`, so the patternJoin's underlying lexicon scan and join are more expensive. Same fix as shape 5/8/14, but expected post-fix gain is large here.

## Shape 19 — `work.partOfWork.id` (n=1, avg 1.8×)

Example — **`Backend log test 4841`** · work · 96 → 176 ms (1.8×):
```json
{ "partOfWork": { "id": "…text/d66c…" } }
```

Near-parity. Naked `HopWithField` by id. Lowest-priority single-shape regression; included for completeness. Fix from shape 2 should bring it to baseline.

## Shape 20 — `work.aboutAgent.id` (n=1, avg 4.0×)

Example — **`Backend log test 1`** · work · 127 → 510 ms (4.0×):
```json
{ "aboutAgent": { "id": "…group/bf21…" } }
```

Naked `HopWithField` by id, no wrapping. Mid-range single-shape regression. Same fix as shape 5/8/14/18.

---

# Where the regressions cluster

| Severity bucket | Count (of 173) | Notes |
|---|---|---|
| Functional fail (timeout) | 1 | shape 17 |
| Severe (≥10× ratio) | 56 | dominated by shape 2 (~42 tests), plus outliers from shapes 3, 4, 9, 12, 13, 15, 16, 18 |
| Moderate (3–10×) | ~110 | dominated by shape 1 (86 tests) plus shapes 6, 7, 8, 20 |
| Mild (<3×) | ~6 | shapes 5, 11, 14, 19 |

---

# What's NOT regressing

Shapes absent from the slowest-200 union (and thus presumably at parity for their typical inputs):
- Pure `id`-only document lookups ([DocumentIdOrIri](src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs) alone)
- [IndexedValue](src/main/ml-modules/root/lib/search/patterns/IndexedValue.mjs) / [IndexedWord](src/main/ml-modules/root/lib/search/patterns/IndexedWord.mjs) exact-match terms
- [IndexedRange](src/main/ml-modules/root/lib/search/patterns/IndexedRange.mjs) / [DateRange](src/main/ml-modules/root/lib/search/patterns/DateRange.mjs) terms
- [Geospatial](src/main/ml-modules/root/lib/search/patterns/Geospatial.mjs) terms
- [AnnTopK](src/main/ml-modules/root/lib/search/patterns/AnnTopK.mjs) terms

---

# Recommended priority for next engine work

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
