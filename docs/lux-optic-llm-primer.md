## **LUX Optic LLM Primer**

- [Introduction](#introduction)
  - [Why Optic?](#why-optic)
  - [Single Export](#single-export)
- [MarkLogic Optic Primer](#marklogic-optic-primer)
  - [Key Optic Behavior](#key-optic-behavior)
- [Architecture Overview](#architecture-overview)
- [The Three Constraint Buckets (Critical Concept)](#the-three-constraint-buckets-critical-concept)
  - [Why This Matters](#why-this-matters)
  - [The Rule Every Pattern Follows](#the-rule-every-pattern-follows)
  - [Summary Table for Pattern Implementors](#summary-table-for-pattern-implementors)
- [Nested Conjunction Handling (The 3×3 Matrix)](#nested-conjunction-handling-the-33-matrix)
  - [Key Optimizations in This Matrix](#key-optimizations-in-this-matrix)
- [Column Naming Strategy](#column-naming-strategy)
  - [Join Column Alignment](#join-column-alignment)
- [Pattern Implementation Details](#pattern-implementation-details)
  - [`text` (a.k.a., `keyword`)](#text-aka-keyword)
  - [`indexedWord`](#indexedword)
  - [`indexedRange`](#indexedrange)
  - [`propertyValue`](#propertyvalue)
  - [`hopWithField`](#hopwithfield)
    - [Simple hop (termValue is a string):](#simple-hop-termvalue-is-a-string)
    - [Complex hop (termValue is an object—nested criteria):](#complex-hop-termvalue-is-an-objectnested-criteria)
  - [`documentId` / `iri`](#documentid--iri)
  - [`annTopK`](#anntopk)
    - [Row source](#row-source)
    - [Term config properties (new for this pattern)](#term-config-properties-new-for-this-pattern)
    - [`k` — the neighbor count](#k--the-neighbor-count)
    - [Distance column and the `GetOpticPlan` return type](#distance-column-and-the-getopticplan-return-type)
    - [Join pattern by logicType](#join-pattern-by-logictype)
    - [Multiple `annTopK` criteria in the same AND](#multiple-anntopk-criteria-in-the-same-and)
- [The `execute()` Function](#the-execute-function)
- [Configuration Dependencies](#configuration-dependencies)
  - [Imports](#imports)
  - [Search Term Config Shape](#search-term-config-shape)
  - [RDF Prefixers](#rdf-prefixers)
- [The `ProcessPredicates` Helper](#the-processpredicates-helper)
- [Plan Options](#plan-options)
  - [`annTopK` build constants](#anntopk-build-constants)
- [The `_scope` Property Override](#the-_scope-property-override)
- [Deep-Copy via `xdmp.toJSON`](#deep-copy-via-xdmptojson)
- [The Dynamic `for` Loop](#the-dynamic-for-loop)
- [Known Issues and TODOs](#known-issues-and-todos)
- [Unimplemented Patterns](#unimplemented-patterns)
- [Glossary](#glossary)
- [Worked Example: `{ "AND": [{ "text": "lobster" }] }`](#worked-example--and--text-lobster--)

---

# Introduction

**Primary Audience:** LLMs assisting developers who are reading, modifying, or extending [/src/main/ml-modules/root/lib/search/optic.mjs](/src/main/ml-modules/root/lib/search/optic.mjs). This document is intended to pass on key insights to the LLM to improve its ability to help developers.

`optic.mjs` is an **replacement search implementation** for Yale's LUX discovery platform. The previous production search pipeline builds CTS (Core Text Search) query strings via `SearchCriteriaProcessor` and `searchPatternsLib`. `SearchCriteriaProcessor` lives on but has been updated to use `optic.mjs`, which implement's MarkLogic's **Optic API**, expressing the same searches (and new ones!) as relational-style plans composed of lexicon scans, joins, and filters.

> **Note:** The CTS-based implementation is still being dismantled.  More code is expected to be removed, including parts or all of `searchPatternsLib.mjs` and `SearchTerm.mjs`. Those files are **not runtime dependencies** of `optic.mjs`. They are referenced in this guide only where their pattern semantics help explain what an Optic pattern is supposed to do.

## Why Optic?

Yale's reasons are two-fold:

1. **Investment alignment.** Optic is where MarkLogic Engineering is investing most heavily among their APIs. Building on Optic aligns with the platform's future direction.
2. **Exclusive capabilities.** Some functionality is only available in Optic — for example, **transitive triples** — which the CTS API cannot express at all.

## Single Export

```javascript
export { execute };
```

`execute(searchCriteria, searchScope, includeResults)` is the only public entry point. It accepts the same JSON search criteria grammar used by the rest of LUX.

---

# MarkLogic Optic Primer

These are the Optic concepts the code relies on. All are server-side MarkLogic APIs.

| Concept | What it does |
|---|---|
| `op.fromLexicons(lexiconMap, qualifier, fragmentIdCol)` | Creates a plan that scans one or more range indexes. Each key in `lexiconMap` becomes a column name; its value is a range reference (e.g. `cts.uriReference()`, `cts.fieldReference('name')`). Returns one row per co-occurring index tuple within a fragment. |
| `op.fromTriples([op.pattern(s, p, o, frag)])` | Creates a plan that scans the triple index. Columns are bound to subject, predicate, object, and optionally fragment. Constants in the pattern act as filters. |
| `op.fromView(schema, view, qualifier, fragmentIdCol)` | Creates a plan backed by a TDE (Template-Driven Extraction) view. Rows correspond to TDE-projected values from documents. The `fragmentIdCol` arg names the fragment column so the plan can be joined back to other plans by fragment ID. |
| `plan.annTopK(k, vectorCol, queryVector, distanceCol, options)` | Approximate nearest-neighbor search within a `fromView` plan. Scores each row by cosine distance between `vectorCol` and `queryVector`, keeps the `k` closest rows, and writes the distance into `distanceCol`. Must be called on a `fromView` plan that contains the vector column. |
| `plan.where(condition)` | Filters rows. Accepts Optic expressions (`op.eq(...)`) or CTS queries (`cts.fieldWordQuery(...)`). Multiple `.where()` calls are implicitly AND'd. |
| `plan.joinInner(right, on, condition)` | Inner join—only rows that match in both sides survive. Equivalent to SQL `INNER JOIN`. |
| `plan.joinFullOuter(right, on, condition)` | Full outer join—all rows from both sides, nulls where no match. Equivalent to SQL `FULL OUTER JOIN`. Used to express OR when the two sides produce rows from different index scans. |
| `plan.notExistsJoin(right, on, condition)` | Anti-join—keeps left rows that have **no** match on the right. Equivalent to SQL `WHERE NOT EXISTS (...)`. Expresses NOT/exclusion. |
| `op.on(left, right)` | Specifies the join condition: which columns (or fragment IDs) to equate. |
| `op.fragmentIdCol(name)` | A special column representing the internal fragment ID of a document. Joining on fragment ID can enable "D-Node pushdown"—MarkLogic routes the join computation to the data node that owns the fragment, avoiding network hops. |
| `plan.select(columns)` | Projects (keeps) only the listed columns. Used to normalize both sides of a join to the same column set, which is required for `joinFullOuter` natural joins. |
| `plan.groupBy(keys, aggregates)` | Groups rows and applies aggregates. E.g. `groupBy(['uri'], [op.sample('dataType', ...)])` deduplicates to one row per URI. |
| `op.as(newName, expression)` | Renames/aliases a column. Critical for making child-plan columns match the parent's expected names before a join. |
| `plan.export()` | Serializes the plan to a JSON object (the plan AST). |
| `op.toSource(planJson)` | Converts a plan AST back to human-readable Optic source code. Useful for debugging. |
| `plan.result()` | Executes the plan and returns result rows. |

## Key Optic Behavior

- **`.where()` is always AND.** Calling `.where(A).where(B)` means both A and B must be true. There is no `.whereOr()`.
- **Joins are the only way to express OR and NOT between row sets.** `joinFullOuter` = union (OR). `notExistsJoin` = exclusion (NOT).
- **CTS queries can be passed into `.where()`.** This is the bridge: when a constraint is naturally expressible as CTS, the code can pass it directly instead of constructing lexicon columns and Optic expressions.
- **Fragment ID vs URI joins.** The `preferFragJoins` option controls whether joins use `op.fragmentIdCol` (potential D-Node pushdown, faster) or `op.col(uriCol)` (predictable, URI-based). Currently defaults to `false` (URI joins).

---

# Architecture Overview

```
execute(searchCriteria, searchScope)
  │
  ├─ Creates finalGroups: groupBy(['uri'], sample('dataType'))
  │
  └─ GetOpticPlan(searchCriteria, searchScope, finalGroups)
       │
       ├─ Determines logicType: 'and' | 'or' | 'not'
       │
       ├─ Initializes base lexicons: { uri, iri, dataType }
       │
       ├─ Initializes THREE CONSTRAINT BUCKETS:
       │    ├─ constraints[]       (Optic expressions)
       │    ├─ ctsConstraints[]    (CTS query objects)
       │    └─ joins[]             (join descriptors)
       │
       ├─ Iterates criteria[], for each criterion:
       │    ├─ If nested AND/OR/NOT → handle via recursive call + join
       │    └─ If search term → dispatch on patternName via switch
       │         └─ Each pattern places work into one of the three buckets
       │
       └─ ASSEMBLY PHASE (in order):
            ├─ plan = op.fromLexicons(lexicons)
            ├─ for each constraint:   plan = plan.where(constraint)
            ├─ for ctsConstraints:    plan = plan.where(ctsWrapper(ctsConstraints))
            ├─ for each join:         plan = plan[join.type](join.right, ...)
            └─ if groups:             plan = plan.groupBy(...)
```

---

# The Three Constraint Buckets (Critical Concept)

The function collects criteria into **three buckets**, then assembles the final plan at the end. Understanding *how* each bucket is assembled is the key to everything.

| Bucket | Assembly Logic | Effect |
|---|---|---|
| `constraints[]` | Sequential `.where(c)` calls | **Always AND'd**, regardless of `logicType` |
| `ctsConstraints[]` | Wrapped by `ctsWrapper` at assembly time | AND, OR, or `NOT(OR(...))` based on `logicType` |
| `joins[]` | Sequential join method calls | `joinInner`, `joinFullOuter`, or `notExistsJoin` |

## Why This Matters

- **`constraints[]` is only safe in AND context.** Because `.where()` calls are implicitly AND'd, placing a constraint here when the parent `logicType` is `'or'` would incorrectly require *all* criteria to match instead of *any*. Every pattern must check `logicType` before choosing which bucket to use.

- **`ctsConstraints[]` adapts to logicType.** The `ctsWrapper` function chosen at assembly time handles the logical combination:
  - `logicType === 'and'` → `cts.andQuery(ctsConstraints)`
  - `logicType === 'or'` → `cts.orQuery(ctsConstraints)`
  - `logicType === 'not'` → `cts.notQuery(cts.orQuery(ctsConstraints))`

- **`joins[]` carry their own join type.** Each join descriptor specifies `joinInner`, `joinFullOuter`, or `notExistsJoin`, chosen at the time the criterion is processed (not at assembly time).

## The Rule Every Pattern Follows

`propertyValue` is the clearest exemplar:

```javascript
case "propertyValue":
  if (logicType === 'and') {
    constraints.push(op.eq(op.col('dataType'), termValue));  // ← constraints bucket
  } else {
    ctsConstraints.push(cts.fieldValueQuery(...));            // ← ctsConstraints bucket
  }
```

- `indexedWord` with `_complete` AND context → `constraints[]`; `_complete` in OR/NOT, or any non-`_complete` usage (word query) → `ctsConstraints[]`. **Word queries (`cts.fieldWordQuery`) always go to `ctsConstraints`, even in AND context**, because word-match semantics (stemming, wildcards) have no native Optic equivalent.
- `indexedRange` follows the same split.
- `hopWithField` **always uses joins** because triple navigation fundamentally cannot be expressed as a single CTS constraint — the join type varies by logicType.
- `documentId` and `iri` follow the constraints/ctsConstraints split.

## Summary Table for Pattern Implementors

Use this table when implementing a new pattern to decide which bucket to target:

| Parent logicType | CTS-expressible constraint (e.g. `documentId`, `indexedWord`) | NOT CTS-expressible (e.g. `hopWithField`, `iri` with complex criteria) |
|---|---|---|
| **AND** | → `constraints[]` (direct lexicon filter via `.where()`) | → `joins[]` with `joinInner` |
| **OR** | → `ctsConstraints[]` (combined via `cts.orQuery`) | → `joins[]` with `joinFullOuter` |
| **NOT** | → `ctsConstraints[]` (wrapped by `cts.notQuery(cts.orQuery(...))`) | → `joins[]` with `notExistsJoin` |

**Decision rule:** If the constraint can be expressed as a single CTS query or Optic expression that filters the base lexicon plan, prefer `constraints` (AND only) or `ctsConstraints`. If the constraint requires its own row source (triples, a second lexicon scan, a recursive sub-plan), it must be a join.

> **Special case — patterns with no CTS equivalent whatsoever** (e.g., `annTopK`): These always go to `joins[]` for all three logicTypes. There is no fallback path. The join type follows the same rule as the "NOT CTS-expressible" column above: `joinInner` for AND, `joinFullOuter` for OR, `notExistsJoin` for NOT.

---

# Nested Conjunction Handling (The 3×3 Matrix)

When a criterion is itself an `AND`, `OR`, or `NOT` group, the code must decide how to merge the child's results with the current plan. This produces a 3×3 matrix of parent `logicType` × child conjunction type:

| Parent \ Child | Child is AND | Child is OR | Child is NOT |
|---|---|---|---|
| **Parent AND** | **Inline:** Append child items to current `criteria[]` (no join needed—already in AND) | **Inner join:** Recurse child as sub-plan, `joinInner` to keep only rows matching the child | **NotExists join:** Recurse `{ OR: child.NOT }`, `notExistsJoin` to exclude matching rows |
| **Parent OR** | **Full outer join:** Recurse child as sub-plan, `joinFullOuter` to union results | **Inline:** Append child items to current `criteria[]` (no join needed—already in OR) | **Full outer join:** Recurse child as sub-plan, `joinFullOuter` to union results |
| **Parent NOT** | **NotExists join:** Recurse child as sub-plan, `notExistsJoin` to exclude | **NotExists join:** Recurse child as sub-plan, `notExistsJoin` to exclude | **Inner join:** Double negation = AND. Recurse `{ OR: child.NOT }`, `joinInner` |

## Key Optimizations in This Matrix

- **AND-in-AND and OR-in-OR are inlined** by pushing child criteria into the parent's `criteria[]` array. This avoids unnecessary sub-plans and joins. The `for` loop uses `criteria.length` dynamically, so pushed items are processed in subsequent iterations.

- **NOT-in-AND wraps as OR then anti-joins.** `{ NOT: [A, B] }` in an AND context becomes `notExistsJoin` against `{ OR: [A, B] }`. This is logically: "exclude documents matching A OR B."

- **NOT-in-NOT is double negation.** Converts to `joinInner` against `{ OR: child.NOT }`, effectively turning two negations into an intersection.

---

# Column Naming Strategy

Every recursive call to `GetOpticPlan` receives a `parentId` (UUID or `null` for root). This produces **namespaced column names** that prevent collisions when multiple sub-plans are joined.

| Column | Root call (`parentId = null`) | Recursive call (`parentId = <uuid>`) |
|---|---|---|
| URI column | `'uri'` | `'<uuid>_uri'` |
| Fragment column | `'frag'` | `'<uuid>_frag'` |
| IRI column | `'iri'` | `'<uuid>_iri'` |

Within a single `GetOpticPlan` call, each criterion also gets its own UUID (`id = sem.uuidString()`) used for:
- Dynamically added lexicon columns: `id + '_field'`
- Triple pattern columns: `id + '_s'`, `id + '_o'`, `id + '_triFrag'`
- Lexicon reference columns: `id + '_iri'`

This ensures every column in the plan tree is globally unique.

## Join Column Alignment

When building joins (especially `joinFullOuter` for OR), both sides must produce the **same column names**. The code uses `op.as()` to rename child columns:

```javascript
const _joinCol = options.preferFragJoins
  ? op.as(fragCol, op.fragmentIdCol(id + '_frag'))   // rename child frag → parent frag
  : op.as(uriCol, op.col(id + '_uri'));               // rename child uri → parent uri

joins.push({
  type: "joinFullOuter",
  right: childPlan.select([_joinCol, "dataType"]),    // project to matching columns
  on: null,       // null on = natural join (match on shared column names)
  condition: null
});
```

---

# Pattern Implementation Details

## `text` (a.k.a., `keyword`)

> **Known issue:** This pattern is **not yet the functional equivalent** of the CTS implementation. The suspected source of the discrepancy is the `hopWithField` sub-pattern (invoked via `referencedBy`), not the `indexedWord` sub-pattern (invoked via `textNoHop`). Do not treat this as a gold standard until the issues are resolved.

**Does not produce constraints directly.** Instead, it rewrites itself into an OR of two sub-terms:

```javascript
criteria.push({
  OR: [
    { textNoHop: criterion[termName] },     // field-based full text  → indexedWord pattern
    { referencedBy: criterion[termName] }    // semantic hop           → hopWithField pattern
  ]
});
```

This pushed OR criterion will be processed on a subsequent loop iteration, where it triggers the `OR` child conjunction handler and eventually the `indexedWord` and `hopWithField` patterns.

**Implication:** The `text` pattern is a macro—it delegates entirely. The `textNoHop` and `referencedBy` terms must exist in `searchTermsConfig.mjs` for the target scope.

## `indexedWord`

Handles both fuzzy (word) and exact (value) matching, controlled by `criterion._complete`.

**AND context with `_complete` (exact/value match):**
```
→ Add field range index to lexicons{}
→ Add op.eq() to constraints[]
```
This is the most efficient path: the value check happens inside the base lexicon scan.

**OR/NOT context with `_complete` (exact/value match):**
```
→ cts.fieldValueQuery() → ctsConstraints[]
```

**All contexts — without `_complete` (word/fuzzy match):**
```
→ cts.fieldWordQuery() → ctsConstraints[]
```
Word queries **always** go to `ctsConstraints` regardless of `logicType`, because word-match semantics (stemming, wildcards) have no native Optic equivalent. There is no Optic-native word query path.

**Index requirement:** When using the `constraints` path, a **range index** must exist for the field (not just a field definition). The code accesses `termConfig.indexReferences[0]` and assumes exactly one index reference.

## `indexedRange`

Numeric/comparable range queries using operators like `>=`, `<`, etc.

**AND context:**
```
→ Add field range index to lexicons{}
→ Add comparator expression (op.ge, op.lt, etc.) to constraints[]
```

**OR/NOT context:**
```
→ cts.fieldRangeQuery() → ctsConstraints[]
```

The `comparators` map translates string operators (`">="`→`op.ge`, etc.).

## `propertyValue`

Currently only implemented for `recordType` (the `dataType` column). The simplest pattern and the best exemplar for the bucket-selection rule.

**AND context:**
```
→ op.eq(op.col('dataType'), termValue) → constraints[]
```

**OR/NOT context:**
```
→ cts.fieldValueQuery(scope + 'DataTypeName', termValue) → ctsConstraints[]
```

> **Note:** `propertyValue` does **not** pass `defaultCtsOptions` to `cts.fieldValueQuery`. This is intentional: record type is an exact, case-sensitive system value so the standard stemming/wildcard/case-insensitive options are inappropriate.

## `hopWithField`

The most complex pattern. Navigates RDF triples to find documents related via predicates, optionally filtering the hop target by field values or nested criteria.

**Always uses joins** (never `constraints` or `ctsConstraints` alone) because triple navigation requires its own row source.

### Simple hop (termValue is a string):

```
1. Build triple scan: op.fromTriples(pattern(subject, predicates, object, triFrag))
2. Build reference lexicon scan filtered by term value
3. Inner-join triples to reference lexicon on object = iri
4. Join result back to parent plan
```

### Complex hop (termValue is an object—nested criteria):

```
1. Build triple scan (same as above)
2. Recursively call GetOpticPlan on the nested criteria
3. Inner-join triples to recursive plan on subject = iri
4. Join result back to parent plan
```

**Join type depends on parent logicType:**
- AND → `joinInner` (on fragment + IRI)
- OR → special: duplicates the base lexicon, inner-joins to the triple result, then `joinFullOuter` with column alignment
- NOT → `notExistsJoin` (on fragment + IRI)

> **Fragment joins are unconditional for `hopWithField`.** `op.fromTriples` does not return URIs, so AND and NOT joins always use `op.fragmentIdCol` regardless of the `preferFragJoins` option. The code comments this explicitly.

**The OR case for hopWithField** is notably different from other patterns. Because triple results need to be combined with the parent's base lexicon via a full outer join, the code creates a **second copy of the base lexicons**, joins the triple result to it, then full-outer-joins that combined plan back. This is the "duplicate lexicon then outer join" pattern noted in the TODOs.

**Complex hop grouping:** When `termValue` is an object (nested criteria), the recursive call receives `rightGroups = { by: [id + '_iri'] }`. This groups the child sub-plan by IRI before joining to the triples, deduplicating so each subject IRI appears at most once and preventing row inflation.

## `documentId` / `iri`

The simplest value-based patterns. Both are treated identically: compare against `uriCol`.

**AND context:**
```
→ op.eq(op.col(uriCol), termValue) → constraints[]
```

**OR/NOT context:**
```
→ cts.documentQuery(termValue) → ctsConstraints[]
```

## `annTopK`

Approximate nearest-neighbor vector similarity search. Finds documents whose stored embedding vectors are closest to a query vector, measured by cosine distance. Works across all search scopes.

**Always uses joins for all logicTypes** — there is no CTS expression for vector similarity. The row source is `op.fromView` (a TDE view containing pre-computed embedding vectors), not `op.fromLexicons` or `op.fromTriples`.

### Row source

```javascript
const vecFrag = id + '_vecFrag';
const distCol = id + '_distance';
const vectorCol = termConfig.vectorColumn ?? 'main';
const queryVector = vec.vector(
  cts.doc(termValue).xpath(`vectors/${vectorCol}`).toArray()
);

const view = op.fromView('lux', 'vectors', null, op.fragmentIdCol(vecFrag));
const right = view.annTopK(
  MAX_ANN_K,
  op.col(vectorCol),
  queryVector,
  op.col(distCol),
  { distance: 'cosine', 'max-distance': termConfig.maxDistance ?? ANN_MAX_DISTANCE_DEFAULT }
);
```

The term value in the search JSON is the **URI of the document whose vector is used as the query vector** (i.e., "find documents similar to this one"). The query vector is retrieved at plan-construction time by reading the TDE view column from the document at that URI.

### Term config properties (new for this pattern)

See the extended `searchTermConfig` shape in Section 9. Relevant fields:

| Property | Type | Default | Meaning |
|---|---|---|---|
| `vectorColumn` | `string` | `'main'` | TDE column name holding the vector in the `vectors` view |
| `maxDistance` | `number` | `ANN_MAX_DISTANCE_DEFAULT` | Maximum cosine distance; rows beyond this threshold are excluded |

### `k` — the neighbor count

`k` is controlled by the `MAX_ANN_K` module constant (a build property). It is **not** controllable per search request. Rationale: correct paging requires `k ≥ page × pageLength`; allowing callers to set `k` would let them bypass server resource limits. When `execute()` gains `page`/`pageLength` parameters, `k` should be computed as `Math.min(MAX_ANN_K, page * pageLength)`.

### Distance column and the `GetOpticPlan` return type

Each `annTopK` criterion creates a UUID-namespaced distance column (`id + '_distance'`) so multiple `annTopK` criteria in the same plan do not collide. However, `execute()` wraps the plan in a `groupBy(['uri'], ...)` that drops any column not listed as a key or aggregate — which would silently discard distance values.

**Architectural implication:** `GetOpticPlan` should return `{ plan, distanceCols: string[] }` instead of a bare plan. The pattern appends `distCol` to a local `distanceCols` array. `execute()` adds `op.sample(col, op.col(col))` for each `distanceCol` to `finalGroups.agg` before calling `groupBy`. Distance columns then appear in `execute()`'s `.results` rows and are available to `SearchCriteriaProcessor`.

Implications for existing code:
- `execute()` must unwrap: `const { plan: opticPlan, distanceCols } = GetOpticPlan(...)`.
- All recursive calls to `GetOpticPlan` within `GetOpticPlan` must also unwrap and forward any `distanceCols` from child plans.

### Join pattern by logicType

Follows the same join-type rule as `hopWithField`:

| logicType | Join type | Join key |
|---|---|---|
| **AND** | `joinInner` | `op.fragmentIdCol(fragCol)` ↔ `op.fragmentIdCol(vecFrag)` |
| **OR** | `joinFullOuter` (duplicate-lexicon pattern) | natural join on aligned column names |
| **NOT** | `notExistsJoin` | `op.fragmentIdCol(fragCol)` ↔ `op.fragmentIdCol(vecFrag)` |

**OR case:** Use the same "duplicate lexicon then outer join" pattern as `hopWithField` OR. Clone the current `lexicons` into a second `op.fromLexicons` plan (using `fragCol` as its fragment column), inner-join it to the `annTopK` result on `fragmentIdCol`, then `joinFullOuter` that combined plan back to the base plan using column alignment (select to `[fragCol, 'dataType', distCol]`).

### Multiple `annTopK` criteria in the same AND

Each becomes a separate `joinInner`. Documents must rank in top-K for every criterion independently. Each criterion gets its own UUID-namespaced distance column; all are forwarded through `distanceCols` and preserved in `groupBy`. No special-casing is needed — this is identical to how any two `joinInner`-based patterns compose.

Merging multiple `annTopK` calls into a single API call is not possible: `annTopK` accepts exactly one target vector.

---

# The `execute()` Function

```javascript
function execute(searchCriteria, searchScope, includeResults = true)
```

1. Creates `finalGroups` that deduplicate to one row per URI (since lexicon scans can produce multiple rows per document).
2. Calls `GetOpticPlan` with those groups.
3. Returns an object with:
   - `results` — Array of result rows (or `null` if `includeResults` is false)
   - `planAsJson` — The plan's AST as a JSON object
   - `planAsSource` — Human-readable Optic source code (newlines stripped)
   - `debug` — Array of debug entries accumulated during plan construction

On error, dumps the debug array to console before re-throwing.

> **`debug` is module-level.** `const debug = []` is declared at module scope and is never cleared between calls. In normal MarkLogic server-side execution, modules are re-evaluated per request, so this is harmless. However, if `optic.mjs` is ever tested in a persistent Node.js environment or called multiple times within a single evaluation, debug entries will accumulate across calls.

---

# Configuration Dependencies

## Imports

| Import | Source | Purpose |
|---|---|---|
| `op` | `/MarkLogic/optic.mjs` | The Optic API module |
| `getSearchScopeTypes` | `/lib/searchScope.mjs` | Maps scope name → array of RDF type names (currently unused—commented out) |
| `getSearchTermNames` | `/config/searchTermsConfig.mjs` | Returns all term names for a scope (used to identify which JSON key is the search term) |
| `getSearchTermConfig` | `/config/searchTermsConfig.mjs` | Returns config object for a specific scope+term pair |
| `processSearchCriteria` | `/lib/searchLib.mjs` | Imported but **not used** in current code |
| `START_OF_GENERATED_QUERY` | `/lib/SearchCriteriaProcessor.mjs` | Imported but **not used** in current code |

## Search Term Config Shape

The code reads these properties from `getSearchTermConfig(scope, termName)`:

```javascript
{
  patternName: string,           // Dispatches to the switch/case: "text", "indexedWord", etc.
  indexReferences: string[],     // Field names for CTS/range queries. Code assumes [0] exists.
  scalarType: string | null,     // If set, value is cast via xs[scalarType](value)
  predicates: string[],          // For hopWithField: array of predicate expression strings
  targetScope: string,           // For hopWithField: scope of the hop target (e.g. "agent")
  // annTopK-specific (optional; ignored by all other patterns):
  vectorColumn: string,          // TDE view column holding the vector. Defaults to 'main'.
  maxDistance: number,           // Max cosine distance threshold. Defaults to ANN_MAX_DISTANCE_DEFAULT.
}
```

## RDF Prefixers

Four namespace prefixers are defined at module scope for constructing IRIs:

| Prefix | Namespace |
|---|---|
| `crm` | `http://www.cidoc-crm.org/cidoc-crm/` |
| `la` | `https://linked.art/ns/terms/` |
| `lux` | `https://lux.collections.yale.edu/ns/` |
| `skos` | `http://www.w3.org/2004/02/skos/core#` |

These are used inside `ProcessPredicates` via `xdmp.eval()` to resolve predicate strings like `lux("agentAny")` to full IRIs.

---

# The `ProcessPredicates` Helper

```javascript
function ProcessPredicates(predicates) → Array<sem.iri>
```

Converts predicate expression strings (e.g. `'lux("agentOfBeginning")'`) into resolved `sem.iri` values by evaluating them with `xdmp.eval()`.

**Security note (flagged in code):** This uses `eval` for backwards compatibility with the existing config format. The config stores predicates as JavaScript expression strings that reference the prefixer functions. The FIXME comment recommends replacing with `sem.curieExpand(curie, [mapping])`.

---

# Plan Options

```javascript
const defaultPlanOptions = {
  preferFragJoins: false
}
```

| Option | Effect when `true` | Effect when `false` (default) |
|---|---|---|
| `preferFragJoins` | Joins use `op.fragmentIdCol` — enables D-Node pushdown for potentially better distributed performance | Joins use `op.col(uriCol)` — URI-based, more predictable behavior |

This option permeates the entire recursive tree. It affects:
- Join `on` clauses (fragment vs URI)
- Select projections passed to child plans
- Column aliasing in full outer joins

## `annTopK` build constants

Two module-level constants govern `annTopK` behavior. These are **build properties** — not controllable by search request callers:

```javascript
const MAX_ANN_K = 1000;              // Maximum neighbors to retrieve. Must be ≥ page × pageLength
                                     // for correct paging. Increase if deep pagination is needed.
const ANN_MAX_DISTANCE_DEFAULT = 0.14; // Default cosine distance threshold. Individual term
                                       // configs may override via termConfig.maxDistance.
```

When `execute()` gains `page`/`pageLength` parameters, `k` should be computed as `Math.min(MAX_ANN_K, page * pageLength)` and passed into the pattern rather than using `MAX_ANN_K` directly.

---

# The `_scope` Property Override

At the start of each `GetOpticPlan` call, the effective scope is resolved as:

```javascript
const scope = planCriteria._scope ?? planScope;
```

Any criteria object — including nested ones — can carry a `_scope` key to override the search scope for that sub-plan. This is how multi-scope searches can be expressed without separate top-level calls. This override is currently listed as a TODO to verify but the mechanism is already in place.

---

# Deep-Copy via `xdmp.toJSON`

The criteria array is deep-copied at initialization:

```javascript
criteria = xdmp.toJSON(planCriteria.AND).toObject();
```

This is necessary because the loop **mutates `criteria[]`** by pushing inlined child criteria (AND-in-AND, OR-in-OR). Without the deep copy, the original input would be modified across recursive calls.

---

# The Dynamic `for` Loop

```javascript
for (let idx = 0; idx < criteria.length; idx++) {
```

This uses `criteria.length` (not a cached length) intentionally. Several code paths push new items onto `criteria[]`:

- AND-in-AND inlining: `criteria.push(...criterion.AND)`
- OR-in-OR inlining: `criteria.push(...criterion.OR)`
- `text` pattern rewriting: `criteria.push({ OR: [...] })`

These pushed items are processed in later iterations of the same loop. This is a deliberate design choice that avoids recursion for cases that can be flattened.

---

# Known Issues and TODOs

From code comments:

| Category | Detail | Location |
|---|---|---|
| **Bug** | OR queries return an extra null value from the full outer join | ~line 43 (commented example) |
| **Bug** | OR queries perform significantly worse than AND equivalents | ~line 43 |
| **Security** | `ProcessPredicates` uses `xdmp.eval()` — should migrate to `sem.curieExpand()` | `ProcessPredicates` function |
| **Feature** | Implement `values` mode for related lists (array of IRIs) | `execute()` comments |
| **Feature** | Verify multi-scope search support | `execute()` comments |
| **Feature** | Verify semantic sort + `SEMANTIC_SORT_TIMEOUT` | `execute()` comments |
| **Feature** | Implement `pageWith` with `MAXIMUM_PAGE_WITH_LENGTH = 100000` | `execute()` comments |
| **Feature** | Add support for overriding `defaultCtsOptions` | ~line 105 |
| **Feature** | Add support for views and other index types | ~line 396 |
| **Design** | `indexedRange` might be better with `fromView` for measure flexibility | `indexedRange` case |
| **Design** | OR `hopWithField` "duplicate lexicon then outer join" pattern could use a helper function | `hopWithField` OR case |
| **Assumption** | Each term config only has one index reference (`indexReferences[0]`) — several patterns depend on this | Multiple locations |
| **Feature** | `annTopK`: compute `k` dynamically as `min(MAX_ANN_K, page * pageLength)` once `execute()` accepts page/pageLength params | `annTopK` pattern, `execute()` |
| **Design** | `GetOpticPlan` return type should change from bare plan to `{ plan, distanceCols }` to support `annTopK` distance propagation | `GetOpticPlan`, `execute()` |

---

# Unimplemented Patterns

The `default` case in the switch throws:

```javascript
throw new Error(`Unimplemented pattern name: ${termConfig.patternName}.`)
```

The following patterns exist in `searchPatternsLib.mjs` but are not yet handled in `optic.mjs`:

- `dateRange` — Date range queries with start/end field pairs
- `hopInverse` — Reverse triple navigation (object→subject)
- `indexedValue` — Exact field value match (or simply `indexedWord` with `_complete`?)

The following patterns are **new to LUX** (no CTS equivalent; not in `searchPatternsLib.mjs`):

- `annTopK` — Approximate nearest-neighbor vector similarity search. Full design spec in Section 7.7.
- `transitive` — Planned.  One or two such patterns.  Distinct from existing hop patterns as existing ones are more performant but do not support transitive triples.

---

# Glossary

| Term | Meaning |
|---|---|
| **Scope** | A record type group (e.g. `item`, `agent`, `work`, `concept`, `event`, `place`, `set`). Each scope defines its own fields, predicates, and RDF types. |
| **Search Term** | A named criterion within a scope (e.g. `name`, `text`, `producedBy`, `classification`). Configured in `searchTermsConfig.mjs`. |
| **Pattern** | The implementation strategy for a search term (e.g. `indexedWord`, `hopWithField`). Determines how the term translates to Optic constructs. |
| **Criterion** | A single element in the search criteria JSON. Either a conjunction (`AND`/`OR`/`NOT` wrapping an array) or a leaf (a search term + value). |
| **logicType** | The boolean context of the current `GetOpticPlan` call: `'and'`, `'or'`, or `'not'`. Determines which constraint bucket a pattern should target. |
| **D-Node pushdown** | A MarkLogic optimization where computation is sent to the data node that stores the fragment, avoiding network transfer. Enabled by joining on fragment IDs. |
| **Fragment** | MarkLogic's internal unit of document storage. A document may be stored across one or more fragments. Fragment IDs are internal, not exposed as URIs. |
| **Lexicon** | A range index that Optic can scan to produce rows. Created from `cts.uriReference()`, `cts.iriReference()`, `cts.fieldReference()`, etc. |
| **Prefixer** | An `op.prefixer(namespace)` function that, when called with a local name, produces a full IRI. E.g. `lux("agentAny")` → `https://lux.collections.yale.edu/ns/agentAny`. |
| **TDE** | Template-Driven Extraction. A MarkLogic feature that projects document content into relational-style views using declarative templates. The `vectors` view used by `annTopK` is a TDE view. |
| **View** | A TDE-backed virtual table. Accessed via `op.fromView(schema, viewName)`. Rows correspond to TDE template matches within documents. |
| **ANN** | Approximate Nearest Neighbor. A class of algorithms that efficiently find the closest vectors in high-dimensional space without an exhaustive scan. MarkLogic's `annTopK` uses a vector index for this. |
| **Cosine distance** | A measure of similarity between two vectors: 0 = identical direction, 1 = orthogonal, 2 = opposite. Lower values mean greater similarity. Used as the distance metric in `annTopK`. |

---

# Worked Example: `{ "AND": [{ "text": "lobster" }] }`

Tracing through the code with scope `'item'`:

1. **`execute()`** creates `finalGroups = { by: ['uri'], agg: [sample('dataType')] }`.

2. **`GetOpticPlan()`** is called. `logicType = 'and'`, `criteria = [{ text: "lobster" }]`.

3. **Criterion 0:** `{ text: "lobster" }`.
   - Term name: `"text"`, pattern: `"text"`.
   - **Rewrites** by pushing `{ OR: [{ textNoHop: "lobster" }, { referencedBy: "lobster" }] }` onto `criteria[]`.

4. **Criterion 1** (pushed): `{ OR: [{ textNoHop: "lobster" }, { referencedBy: "lobster" }] }`.
   - This is a child OR inside parent AND → triggers `joinInner` path.
   - Recursively calls `GetOpticPlan({ OR: [...] }, 'item', null, <uuid>, options)`.

5. **Recursive call** with `logicType = 'or'`:
   - **Criterion 0:** `{ textNoHop: "lobster" }` — an `indexedWord` pattern.
     - OR context → `ctsConstraints.push(cts.fieldWordQuery(...))`.
   - **Criterion 1:** `{ referencedBy: "lobster" }` — a `hopWithField` pattern.
     - OR context → builds triple scan + reference lexicon, wraps in duplicate-lexicon full outer join.
   - **Assembly:** `cts.orQuery([fieldWordQuery])` for CTS constraints, then the hop full outer join.

6. **Back in parent:** The inner join constrains the base lexicon plan to only documents matching the OR sub-plan.

7. **Assembly:** Base lexicons → inner join with OR sub-plan → `groupBy(['uri'])` → `result()`.
