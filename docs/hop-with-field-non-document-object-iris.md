## **HopWithField: Non-Document Object IRIs**

- [Problem](#problem)
- [Root Cause](#root-cause)
  - [Non-transitive path (`#processHopWithFieldTerm`)](#non-transitive-path-processhopwithfieldterm)
  - [Transitive path (`#processTransitiveHopWithFieldTerm`)](#transitive-path-processtransitivehopwithfieldterm)
- [Key Finding: The Problem Scope Is Narrow](#key-finding-the-problem-scope-is-narrow)
- [Fix](#fix)
- [`getChildId` Reference](#getchildid-reference)
- [Revised Finding: HopInverse-as-Child Is Also Affected](#revised-finding-hopinverse-as-child-is-also-affected)
  - [Why HopInverse Is Different](#why-hopinverse-is-different)
  - [Where the Drop Happens](#where-the-drop-happens)
  - [Detection Mechanism](#detection-mechanism)
- [Implementation Options for the HopInverse-Child Case](#implementation-options-for-the-hopinverse-child-case)
  - [Option A: New method on `HopInverse` (recommended default)](#option-a-new-method-on-hopinverse-recommended-default)
  - [Option B: `processCriteria` rootless mode](#option-b-processcriteria-rootless-mode)
  - [Option C: Inline construction in `HopWithField`](#option-c-inline-construction-in-hopwithfield)
- [Recommendation](#recommendation)
- [Caveats, Concerns, and Risks](#caveats-concerns-and-risks)

# Problem

The `HopWithField` pattern can return zero results when object IRIs in triple relationships are not backed by documents in the database. These non-document IRIs do not populate the URI lexicon, IRI lexicon, or have a fragment ID — so any plan rooted in `op.fromLexicons` will not find them.

The specific failure observed: an upstream optimization (the engine's `childId` rewrite to `indexedValue` at the `buildLeafSearchTerm` level) returns the correct 2 results, while the `HopWithField` transitive path returns zero.

# Root Cause

`HopWithField` has two code paths — **non-transitive** and **transitive** — and they handle direct IRI criteria (`{ iri: value }` / `{ id: value }`) differently.

## Non-transitive path (`#processHopWithFieldTerm`)

Has two safeguards for direct IRIs:

1. **Engine-level rewrite** ([engine.mjs, ~L474](../src/main/ml-modules/root/lib/search/engine.mjs)): When `getChildId()` returns a value, `hasIdIndexReferences()` is true, and the term is not transitive, the engine rewrites the search term to an `indexedValue` pattern. This bypasses `HopWithField` entirely.
2. **Pattern-level shortcut** ([HopWithField.mjs, ~L92](../src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs)): When `getChildId()` returns a value, the IRI is placed directly into the `op.fromTriples` pattern via `sem.iri(childId)` — no lexicon scan needed. Works for non-document IRIs.

## Transitive path (`#processTransitiveHopWithFieldTerm`)

Has **neither** safeguard:

- The engine rewrite explicitly skips transitive terms (`!termConfig.isTransitive()`).
- The transitive method has no `childId` check — it always builds a lexicon-based field plan, executes it, and embeds the resulting IRIs as a SPARQL `VALUES` block.

When the target IRI has no document, the field plan returns zero rows, the `VALUES` block is empty, and the SPARQL returns nothing.

# Key Finding: The Problem Scope Is Narrow

We investigated whether nested child criteria (not direct IRI) could also miss non-document object IRIs. **The answer is no.**

Non-document IRIs have no field index entries — field indexes (`cts.fieldReference`, `cts.fieldWordQuery`, etc.) are populated from document content. A nested search like `{ workPrimaryName: "sunset" }` or a complex `{ AND: [...] }` ultimately constrains via field indexes or CTS queries. A non-document object IRI can never satisfy those constraints because there is nothing indexed for it.

The `joinInner` dropping non-document IRIs in the nested/atomic field plan cases is therefore **correct behavior** — those IRIs genuinely cannot match field-based criteria.

The **only** case where a non-document IRI should be kept is when the caller explicitly provides it by identity (`{ iri: value }` or `{ id: value }`). This is the `childId` case.

# Fix

Add a `childId` check to `#processTransitiveHopWithFieldTerm`, matching the pattern already used in the non-transitive path. When `getChildId()` returns a value, place the IRI directly into the SPARQL `VALUES` block instead of executing a lexicon-based field plan:

```javascript
const childId = SCP.getChildId(searchTerm.getCriteria());
let objectIris;
if (!searchTerm.hasValue() && childId) {
  // Direct IRI — bypass lexicon scan.
  objectIris = [`<${childId}>`];
} else {
  const fieldPlan = searchTerm.hasValue()
    ? this.#getFieldAtomicPlan(scp, searchTerm, patternOptions)
    : this.#getFieldNestedPlan(scp, searchTerm, patternOptions);
  objectIris = fieldPlan
    .result()
    .toArray()
    .map((row) => `<${row[fieldIriCol]}>`);
}
// objectIris is then embedded in the SPARQL VALUES block as before.
```

This fork is semantically justified: identity lookup (`{ iri: value }`) and field search (`{ name: "Pablo" }`) are fundamentally different operations, not the same query done differently.

# `getChildId` Reference

`getChildId(termValue)` ([engine.mjs, ~L1192](../src/main/ml-modules/root/lib/search/engine.mjs)) extracts a single IRI string from `{ id: value }` or `{ iri: value }` criteria. Returns `null` for all other shapes (arrays, non-string values, nested criteria, etc.).

# Revised Finding: HopInverse-as-Child Is Also Affected

The earlier [Key Finding](#key-finding-the-problem-scope-is-narrow) claimed that **only** the direct-IRI (`{ iri: value }` / `{ id: value }`) case could legitimately involve a non-document object IRI. Further analysis shows that is **not the complete picture**. There is a second, structurally different case:

> **When the child term under `HopWithField` is configured to the `hopInverse` search pattern, that child legitimately produces object IRIs that may not be backed by documents in the database — and they will be dropped by the same lexicon-rooted join that motivates the direct-IRI fix.**

## Why HopInverse Is Different

`HopInverse` walks triples in the object→subject direction. Its outer triple pattern is `(?s, predicates, ?o, fragId)`, where:

- The triple itself lives on a **document** (the subject is always a document, because triples are document-scoped).
- The **object** column (`_o`) is an IRI extracted from the triple. There is no requirement that this IRI also be a document URI.

So unlike field-based child criteria (`{ workPrimaryName: "sunset" }`), which can only ever match document-backed IRIs, `HopInverse` is a child shape that *can* yield non-document object IRIs as a normal, expected output.

## Where the Drop Happens

`HopWithField` obtains the child plan via [`#getFieldNestedPlan`](../src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs), which calls `scp.processCriteria(...)`. That returns a plan **rooted in `op.fromLexicons`** of the child's target scope — IRI/URI/fragment columns populated only by document IRIs.

The engine then assembles `HopInverse`'s contribution as `basePlan.joinInner(right, parentIriCol == _o)`. `parentIriCol` is the lexicon-rooted IRI column, so any `_o` value that isn't a document IRI is silently filtered out before `HopWithField` ever sees it.

The transitive `HopWithField` path then serializes the surviving `fieldIriCol` values into the SPARQL `VALUES` block; the non-transitive path joins them via `op.on(_o == fieldIriCol)`. **Both paths are affected.**

The inner `joinInner(childCriteriaPlan, triFrag == refFrag)` inside `HopInverse` is *not* the problem — it constrains the triple's subject (a document) and is correct.

## Detection Mechanism

`SearchTerm` carries child-pattern metadata on its `childInfo` field, exposed via:

```javascript
searchTerm.getChildPatternName()
```

Defined in [SearchTerm.mjs](../src/main/ml-modules/root/lib/search/SearchTerm.mjs#L81). For the case at hand this returns `'hopInverse'` (the value of `PATTERN_NAME_HOP_INVERSE`). This is the signal `HopWithField` should use to switch to the alternate plan-construction path.

# Implementation Options for the HopInverse-Child Case

The goal is: when the child pattern is `hopInverse`, build a field plan that exposes `HopInverse`'s outer triple `_o` column as `fieldIriCol` **without** routing it through a lexicon-rooted base plan. Concretely:

```javascript
op.fromTriples([
  op.pattern(op.col(child_s), childPredicates, op.col(child_o), op.fragmentIdCol(child_triFrag)),
])
.joinInner(
  innerCriteriaPlan,                                  // criteria nested under the HopInverse term
  op.on(op.fragmentIdCol(child_triFrag), op.fragmentIdCol(innerCriteriaRefFrag)),
)
.select([op.as(fieldIriCol, op.col(child_o)), ...])
```

The `innerCriteriaPlan` remains lexicon-rooted, which is correct — the inner hop's subjects are documents.

Three places this fork could live:

## Option A: New method on `HopInverse` (recommended default)

Add a method to `HopInverse`, e.g. `buildObjectIriPlan(scp, hopInverseSearchTerm, outputIriColAlias)`, that returns the unjoined `right` plan with `_o` aliased to the caller-specified column name. `HopWithField.#getFieldNestedPlan` would, when the child pattern is `hopInverse`, build (or obtain) the child `SearchTerm` and call this method.

- **Pro:** keeps `HopInverse`'s plan-construction logic in one place; no duplication; future changes to predicate expansion, fragment-column naming, or any other internal `HopInverse` convention automatically propagate.
- **Pro:** the responsibility lives with the pattern that owns the underlying triple structure.
- **Con:** `HopWithField` needs a child `SearchTerm` instance to pass in. Either the engine must expose the child term it already builds during criteria iteration, or `HopWithField` must build one locally (the latter risks coupling).

## Option B: `processCriteria` rootless mode

Add a flag (e.g. `rootless: true`, plus `objectIriColAlias: <name>`) to `scp.processCriteria(...)` that, when the top-level term in `planCriteria` is `hopInverse`, returns `HopInverse`'s `right` plan directly with the requested alias rather than joining it onto a lexicon-rooted base plan.

- **Pro:** `HopWithField` stays declarative: `scp.processCriteria({ ..., rootless: true, objectIriColAlias: fieldIriCol })`.
- **Pro:** generalizes to any future caller that wants object-IRI-producing plans.
- **Con:** broader change in the engine; needs careful audit to ensure no unintended interactions with grouping, fragment-column conventions, or other patterns that may eventually want similar treatment.
- **Con:** introduces a new mode in a hot path (`processCriteria`), which raises the regression surface for unrelated queries.

## Option C: Inline construction in `HopWithField`

Detect the `hopInverse` child via `getChildPatternName()`, walk the criteria to find the child's name, look up its `SearchTermConfig` (predicates + target scope), and construct `op.fromTriples(...).joinInner(scp.processCriteria(innerCriteria, scope=child's targetScope), triFrag==refFrag).select([op.as(fieldIriCol, _o)])` directly inside `HopWithField`.

- **Pro:** smallest blast radius; no changes to `HopInverse` or the engine.
- **Pro:** easiest to gate, log, and roll back independently.
- **Con:** duplicates `HopInverse`'s plan-construction logic in a second file. Any future change to `HopInverse` (predicate expansion, frag-col naming, additional filters) must be mirrored or the two patterns silently diverge.

# Recommendation

**Default: Option A** — new method on `HopInverse`. It preserves the single-source-of-truth for `HopInverse`'s triple plan, keeps `HopWithField`'s call site declarative, and aligns with the existing pattern-of-patterns architecture where each pattern owns its plan shape. The main open question is the cleanest way for `HopWithField` to obtain a child `SearchTerm` (engine-provided vs. locally built); that should be answered before committing.

**Fallback: Option C** if minimizing scope/risk is more important than avoiding duplication — e.g., if this fix needs to ship narrowly and a follow-up refactor will consolidate later.

**Avoid Option B for now** unless we have at least one additional concrete consumer for the rootless mode; otherwise the generalization is speculative.

In all options, **both `HopWithField` paths must be patched** — non-transitive (`#processHopWithFieldTerm`) and transitive (`#processTransitiveHopWithFieldTerm`). The bug is the same shape in both.

# Caveats, Concerns, and Risks

- **The previous [Key Finding](#key-finding-the-problem-scope-is-narrow) is partially superseded.** It is still correct that *field-based* nested criteria cannot legitimately match non-document object IRIs (no field index entries exist for non-document IRIs). The amendment is that **`hopInverse`-pattern children** are a second legitimate source of non-document object IRIs, alongside the direct-IRI (`childId`) case. Any deeper nesting — e.g. `HopWithField → HopInverse → HopInverse → …` — would need the same recursive analysis if it becomes a real configuration.

- **Performance.** The current transitive comment in `HopWithField` notes the embedded-`VALUES` approach was measured ">3x faster" than `joinInner` in 12.0.1. Option A/C continues to use the same SPARQL `VALUES` shape — they only change *how the IRIs are obtained*. No expected change to the transitive perf profile. The non-transitive path's `joinInner(hopPlan, fieldPlan)` is also structurally unchanged. Still, the new field plan is no longer lexicon-rooted, so D-Node pushdown characteristics may differ; worth a perf spot-check on a representative query.

- **HopInverse's `#processValuesOnly` optimization is not in play here.** It triggers only on `searchTerm.isTopLevel()` and short-circuits via `scp.appendValues(...)` rather than returning a plan. As a child of `HopWithField` the `HopInverse` term is not top-level, so it takes the plan-producing path. No interaction to manage.

- **`isCompleteMatch` / atomic field path is orthogonal.** The atomic field plan (`#getFieldAtomicPlan`) is taken only when `searchTerm.hasValue()` — i.e., the `HopWithField` term itself carries a literal value rather than nested criteria. The `hopInverse`-child case is in the `searchTerm.hasCriteria()` branch (nested), so the atomic path is not affected.

- **Direct-IRI fix and HopInverse-child fix are independent.** The transitive `childId` fix proposed in [Fix](#fix) addresses `{ iri: value }` / `{ id: value }` directly as criteria. The HopInverse-child fix addresses a separately-shaped criteria tree. Both should land; neither subsumes the other.

- **Test coverage gap.** There is currently no integration test exercising `HopWithField → HopInverse` where the outer hop's object IRI is non-document. Whichever option is chosen, a regression test for this exact shape is required, plus a counterpart proving non-document object IRIs from field-based child criteria are *still* correctly filtered out (i.e., we don't over-permit).

- **Engine-level `childId` rewrite ([engine.mjs, ~L474](../src/main/ml-modules/root/lib/search/engine.mjs)) does not help here.** That rewrite targets the `HopWithField` term itself when its own criteria is a direct IRI. It does nothing when the criteria contains a `hopInverse` child — that's outside its scope. So the fix must live in `HopWithField` (or the engine's nested-plan construction), not in the existing rewrite.

- **Risk of silent semantics change in field-based queries.** None of the proposed options modify the field-based nested path. If any of them inadvertently widens that path (e.g. accidentally bypassing the lexicon root for field children too), it could surface non-document IRIs that genuinely have no business being in the result set. The implementation must gate strictly on `getChildPatternName() === 'hopInverse'`.