## **LUX Optic LLM Primer**

**File:** [/src/main/ml-modules/root/lib/search/optic.mjs](/src/main/ml-modules/root/lib/search/optic.mjs)
**Audience:** LLMs assisting developers reading, modifying, or extending this file.
**Single export:** `execute(searchCriteria, searchScope, includeResults)` — accepts the same JSON search criteria grammar used throughout LUX.

`optic.mjs` is the replacement search implementation for LUX. It expresses searches as relational-style Optic plans (lexicon scans, joins, filters) rather than CTS query strings. `searchPatternsLib.mjs` and `SearchTerm.mjs` are **not** runtime dependencies — referenced here only where their semantics explain what an Optic pattern does. The CTS-based implementation is being dismantled.


---

# MarkLogic Optic API Reference

All are server-side MarkLogic APIs.

| API | Purpose |
|---|---|
| `op.fromLexicons(map, qualifier, fragIdCol)` | Scans range indexes. Each key→column name, value→range ref (`cts.uriReference()`, `cts.fieldReference('name')`, etc.). One row per co-occurring index tuple per fragment. |
| `op.fromTriples([op.pattern(s,p,o,frag)])` | Scans triple index. Constants in pattern act as filters. **Does not return URIs.** |
| `op.fromView(schema, view, qualifier, fragIdCol)` | Scans a TDE view. Used by `annTopK`. `qualifier` namespaces columns; `fragIdCol` names the fragment column for subsequent joins. |
| `plan.annTopK(k, vectorCol, queryVec, distCol, opts)` | ANN search on a `fromView` plan. Scores rows by cosine distance, keeps `k` closest, writes distance to `distCol`. |
| `plan.where(condition)` | Filters rows. Accepts Optic expressions or CTS queries. **Multiple calls are AND'd — no `.whereOr()` exists.** |
| `plan.joinInner(right, on, cond)` | SQL INNER JOIN — AND between row sources. |
| `plan.joinFullOuter(right, on, cond)` | SQL FULL OUTER JOIN — OR between row sources. Known issue: can return extra null rows. |
| `plan.notExistsJoin(right, on, cond)` | Anti-join — NOT/exclusion. Keeps left rows with **no** match on the right. |
| `op.on(left, right)` | Join condition: equates columns or fragment IDs. |
| `op.fragmentIdCol(name)` | Fragment ID column. Enables D-Node pushdown (computation routed to the data node owning the fragment). |
| `plan.select(cols)` | Projects columns. Required to normalize both sides of `joinFullOuter` to the same column set. |
| `plan.groupBy(keys, aggs)` | Groups and aggregates. Used to deduplicate to one row per URI. |
| `op.as(newName, expr)` | Aliases a column. Critical for aligning child-plan column names before joins. |
| `plan.export()` | Serializes plan to JSON AST. |
| `op.toSource(planJson)` | Converts plan AST to readable source. Debugging only. |

**Key behaviors:**
- `.where()` is always AND. OR and NOT between row sets require joins.
- CTS queries can be passed directly into `.where()` — the bridge between CTS and Optic.
- `preferFragJoins` option (default `false`): controls whether joins use `op.fragmentIdCol` (D-Node pushdown, faster) or `op.col(uriCol)` (URI-based, more predictable). Permeates the entire recursive tree.

**MarkLogic server-side globals** (no import needed): `cts`, `fn`, `xdmp`, `sem`, `xs`, `vec`. These are injected into the SJS runtime by MarkLogic. `vec` (MarkLogic 12+) provides vector operations like `vec.vector()`.


---

# Architecture Overview

```
execute(searchCriteria, searchScope, includeResults)
  |
  |-- Creates finalGroups: groupBy(['uri'], sample('dataType'))
  |
  +-- GetOpticPlan(searchCriteria, searchScope, finalGroups)
       |     returns { plan, distanceCols }
       |
       |-- Determines logicType: 'and' | 'or' | 'not'
       |
       |-- Initializes base lexicons: { uri, iri, dataType }
       |
       |-- Initializes THREE CONSTRAINT BUCKETS:
       |    |-- constraints[]       (Optic expressions)
       |    |-- ctsConstraints[]    (CTS query objects)
       |    +-- joins[]             (join descriptors)
       |
       |-- Initializes distanceCols[] (for annTopK distance propagation)
       |
       |-- Iterates criteria[] (dynamic length — see Non-obvious Behaviors):
       |    |-- If nested AND/OR/NOT -> handle via 3×3 matrix (recursive call + join)
       |    +-- If search term -> dispatch on patternName via switch
       |         +-- Each pattern places work into one of the three buckets
       |
       +-- ASSEMBLY PHASE (in order):
            |-- plan = op.fromLexicons(lexicons)
            |-- for each constraint:   plan = plan.where(constraint)
            |-- for ctsConstraints:    plan = plan.where(ctsWrapper(ctsConstraints))
            |-- for each join:         plan = plan[join.type](join.right, ...)
            +-- if groups:             plan = plan.groupBy(groups.by, agg)
                                       (agg includes distanceCols via op.sample)
```

`execute()` post-processes results when `distanceCols` is non-empty (collates distance columns, filters pure-similarity queries) and returns `{ results, planAsJson, planAsSource, distanceCols, debug }`. On error, dumps `debug` to console before re-throwing.


---

# The Three Constraint Buckets (Critical Concept)

Criteria are collected into three buckets during the iteration phase, then assembled at the end.

| Bucket | Assembly | Effect |
|---|---|---|
| `constraints[]` | Sequential `.where(c)` calls | **Always AND'd**, regardless of `logicType` |
| `ctsConstraints[]` | `ctsWrapper` at assembly time | `cts.andQuery` / `cts.orQuery` / `cts.notQuery(cts.orQuery(...))` based on `logicType` |
| `joins[]` | Sequential join method calls | Each descriptor carries its own join type, chosen at criterion-processing time |

**`constraints[]` is only safe in AND context.** Placing a constraint here in OR/NOT context incorrectly ANDs it with all other criteria. Every pattern must check `logicType` before choosing a bucket.

## Bucket Selection Rule

| Parent logicType | CTS/Optic-expressible (single filter on base plan) | Requires own row source (triples, sub-plan, vector index) |
|---|---|---|
| **AND** | `constraints[]` | `joins[]` with `joinInner` |
| **OR** | `ctsConstraints[]` | `joins[]` with `joinFullOuter` |
| **NOT** | `ctsConstraints[]` | `joins[]` with `notExistsJoin` |

Patterns with **no CTS equivalent** (e.g., `annTopK`): always `joins[]` for all logicTypes. Join type follows the right column above.

### Exemplar — `propertyValue`

```javascript
case "propertyValue":
  if (logicType === 'and') {
    constraints.push(op.eq(op.col('dataType'), termValue));  // <-- constraints bucket
  } else {
    ctsConstraints.push(cts.fieldValueQuery(...));            // <-- ctsConstraints bucket
  }
```


---

# Nested Conjunction Handling — The 3×3 Matrix

When a criterion is itself an `AND`/`OR`/`NOT` group, the code merges the child's results with the current plan. Parent logicType × child conjunction type:

| Parent \ Child | AND | OR | NOT |
|---|---|---|---|
| **AND** | Inline (push to `criteria[]`) | `joinInner` on child sub-plan | `notExistsJoin` on `{ OR: child.NOT }` |
| **OR** | `joinFullOuter` on child sub-plan | Inline (push to `criteria[]`) | `joinFullOuter` on child sub-plan |
| **NOT** | `notExistsJoin` on child sub-plan | `notExistsJoin` on child sub-plan | `joinInner` on `{ OR: child.NOT }` (double negation = AND) |

**Inlining** (AND-in-AND, OR-in-OR): push child items onto `criteria[]`. The dynamic `for` loop picks them up in subsequent iterations — no join, no recursion needed.
**NOT-in-AND**: wraps as `{ OR: child.NOT }` then `notExistsJoin` — "exclude docs matching A OR B."
**NOT-in-NOT**: double negation → `joinInner` against `{ OR: child.NOT }`.


---

# Column Naming Strategy

Every `GetOpticPlan` call receives a `parentId` (UUID or `null` for root), producing namespaced columns that prevent collisions across sub-plans.

| Column | Root (`parentId=null`) | Recursive (`parentId=<uuid>`) |
|---|---|---|
| URI | `'uri'` | `'<uuid>_uri'` |
| Fragment | `'frag'` | `'<uuid>_frag'` |
| IRI | `'iri'` | `'<uuid>_iri'` |

Within a call, each criterion also gets its own UUID (`id = sem.uuidString()`):
- Lexicon columns: `id + '_field'`
- Triple columns: `id + '_s'`, `id + '_o'`, `id + '_triFrag'`
- IRI ref columns: `id + '_iri'`
- ANN columns: `id + '_vecFrag'`, `id + '_distance'`, `id + '_vectorUri'`

## Join Column Alignment

`joinFullOuter` requires identical column sets on both sides. Use `op.as()` to rename, then `select()` to project:

```javascript
const _joinCol = options.preferFragJoins
  ? op.as(fragCol, op.fragmentIdCol(id + '_frag'))   // rename child frag → parent frag
  : op.as(uriCol, op.col(id + '_uri'));               // rename child uri → parent uri

joins.push({
  type: "joinFullOuter",
  right: childPlan.select([_joinCol, "dataType"]),    // project to matching columns
  on: null,       // null = natural join on shared column names
  condition: null
});
```


---

# Pattern Implementation Details

## Bucket decisions by pattern

| Pattern | AND | OR/NOT | Non-obvious notes |
|---|---|---|---|
| `propertyValue` | `constraints[]` (`op.eq`) | `ctsConstraints[]` (`cts.fieldValueQuery`) | No `defaultCtsOptions` — record type is a case-sensitive exact system value, so stemming/wildcards are inappropriate. |
| `indexedValue` | `constraints[]` + lexicon (`op.eq`) | `ctsConstraints[]` (`cts.fieldValueQuery`) | Shares `case` block with `indexedWord`. Always takes the exact-match path (equivalent to `_complete`). Uses `indexReferences[0]`. |
| `indexedWord` + `_complete` | `constraints[]` + lexicon (`op.eq`) | `ctsConstraints[]` (`cts.fieldValueQuery`) | Requires range index (not just field def). Uses `indexReferences[0]`. |
| `indexedWord` no `_complete` | `ctsConstraints[]` | `ctsConstraints[]` | Word queries **always** go to `ctsConstraints` — no Optic-native word query (stemming, wildcards). |
| `indexedRange` | `constraints[]` + lexicon (comparator expr) | `ctsConstraints[]` (`cts.fieldRangeQuery`) | `comparators` map: `">="` → `op.ge`, `"<"` → `op.lt`, etc. |
| `documentId` / `iri` | `constraints[]` (`op.eq(uriCol, v)`) | `ctsConstraints[]` (`cts.documentQuery`) | Treated identically. |
| `hopWithField` | `joins[]` `joinInner` | `joins[]` `joinFullOuter` / `notExistsJoin` | Always joins — triples require own row source. See details below. |
| `annTopK` | `joins[]` `joinInner` | `joins[]` `joinFullOuter` / `notExistsJoin` | Always joins for all logicTypes. See details below. |
| `text` | — macro — | — macro — | Rewrites to `{ OR: [{ textNoHop: v }, { referencedBy: v }] }`, pushes to `criteria[]`. Known issue: not yet functionally equivalent to CTS implementation. |

## `hopWithField` details

Always joins — triple navigation requires its own row source (`op.fromTriples`). Fragment joins are **unconditional** for `hopWithField`: `op.fromTriples` does not return URIs, so `op.fragmentIdCol` must be used for AND/NOT joins regardless of `preferFragJoins`.

**Simple hop** (string `termValue`): triple scan → reference lexicon filtered by value → inner-join on object=iri → join result to parent plan. Supports `_complete` flag: if set, uses exact-match (`op.eq`) on a range lexicon; otherwise, uses `cts.fieldWordQuery`.

**Complex hop** (object `termValue` / nested criteria): triple scan → recursive `GetOpticPlan` on nested criteria → inner-join on object=iri → join result to parent plan. Recursive call receives `rightGroups = { by: [id+'_iri'] }` to deduplicate by IRI before joining (prevents row inflation).

**OR case — "duplicate lexicon then outer join":** Because `op.fromTriples` has no URI column, the triple result cannot be directly outer-joined to the base plan. The code creates a **second copy** of the base `op.fromLexicons`, inner-joins it to the triple result on `fragmentIdCol`, then `joinFullOuter`s that combined plan back to the base plan with column alignment (`select` to `[uriCol or fragCol, "dataType"]`).

**AND/NOT join condition** uses two `op.on` keys: `[fragmentIdCol, iriCol ↔ id+'_s']`. This joins on both fragment and IRI, ensuring the correct subject is matched.

## `annTopK` details

Approximate nearest-neighbor vector similarity search. Term value is the **URI of a seed document** — its stored vector becomes the query vector, read at plan-construction time via `vec.vector(cts.doc(termValue).xpath('vectors/<col>').toArray())`. (`vec` is a MarkLogic 12+ server-side global; no import needed.)

**Validation:** The pattern throws if:
- The seed document does not exist (`fn.docAvailable` check).
- The vector data is missing for the specified column.

**Row source:** `op.fromView('lux', 'vectors', id, op.fragmentIdCol(vecFrag))` — the `id` UUID is used as the qualifier to namespace columns.

**k resolution** *(volatile — verify in source)*:
```
Math.min(criterion._maxAnnK ?? termConfig.defaultMaxAnnK ?? ANN_K_DEFAULT, ANN_K_MAX)
```
`ANN_K_DEFAULT` and `ANN_K_MAX` are imported from `appConstants.mjs` (Gradle-injected build properties with fallback defaults).

**Seed-document exclusion:** For single similarity queries, the seed URI is excluded via `op.ne(op.col('uri'), termValue)`. For multi-OR similarity queries (`isMultipleSimilarity` heuristic: checks whether there are multiple criteria in the OR), the seed is kept to allow cross-matching.

**Column handling:** The view's `uri` column is renamed to `id + '_vectorUri'` via `op.as()` to avoid collision with the main lexicon's `uri`. The plan selects `[id+'_vectorUri', vecFrag, distCol]`.

**Distance column registration:** `distanceCols.push(distCol)` for AND/OR contexts. NOT context is excluded — `notExistsJoin` only keeps left-side rows so distance is irrelevant.

| logicType | Join type | Join key | OR detail |
|---|---|---|---|
| AND | `joinInner` | `fragCol ↔ vecFrag` | — |
| OR | `joinFullOuter` | natural join (aligned columns) | Same "duplicate lexicon then outer join" pattern as `hopWithField` OR: creates a fresh `fromLexicons`, inner-joins it to `annPlan` on `fragCol ↔ vecFrag`, then `joinFullOuter` back to base plan. Select: `[fragCol, 'dataType', distCol]`. |
| NOT | `notExistsJoin` | `fragCol ↔ vecFrag` | — |

**Multiple `annTopK` in AND:** Each becomes a separate `joinInner`. Documents must rank in top-K for every criterion independently. Each criterion has its own UUID-namespaced distance column; all are forwarded through `distanceCols` and preserved by `groupBy`.


---

# The `execute()` Function

```javascript
function execute(searchCriteria, searchScope, includeResults = true)
```

**Steps:**

1. Creates `finalGroups` that deduplicate to one row per URI:
   `{ by: ['uri'], agg: [op.sample('dataType', op.col('dataType'))] }`.

2. Calls `GetOpticPlan(searchCriteria, searchScope, finalGroups)`, destructuring `{ plan: opticPlan, distanceCols }`.

3. Exports the plan to JSON (`planAsJson`), optionally executes `.result()`.

4. Converts `Sequence`/`ValueIterator` results to a plain array (MarkLogic `.result()` may return either).

5. **Post-processing** (when `distanceCols` is non-empty):
   - **Distance collation:** Maps each result row, collects all UUID-namespaced distance column values, picks the minimum non-null value, and writes it as a single `distance` property. Removes the original UUID-namespaced columns.
   - **Pure-similarity filtering** *(volatile)*: If the top-level criteria is an OR where every criterion key is `'similar'` or `'annTopK'`, filters out result rows with null/undefined distance (these are artifacts of `joinFullOuter`).

6. Returns:
   ```javascript
   {
     results,          // Array<object> | null
     planAsJson,       // object — the plan AST
     planAsSource,     // string — human-readable Optic source (newlines stripped)
     distanceCols,     // string[] — UUID-namespaced distance column names (empty if no annTopK)
     debug,            // Array — debug entries accumulated during plan construction
   }
   ```

On error, dumps `debug` to console before re-throwing.


---

# Non-obvious Behaviors

- **Dynamic `for` loop:** `for (let idx = 0; idx < criteria.length; idx++)` reads live `.length`. AND-in-AND inlining, OR-in-OR inlining, and `text` rewriting all push to `criteria[]` mid-loop. Deliberate — avoids recursion for flattenable cases.

- **Deep copy via `xdmp.toJSON`:** `criteria = xdmp.toJSON(planCriteria.AND).toObject()` is required because the loop mutates `criteria[]`. Without it, recursive calls would corrupt the caller's input.

- **`_scope` override:** Any criteria object (including nested) can carry `_scope` to override the search scope for that sub-plan: `const scope = planCriteria._scope ?? planScope`. Mechanism is in place; verified behavior is a TODO.

- **`debug` is module-level:** `const debug = []` is never cleared between calls. Harmless in MarkLogic (modules re-evaluated per request) but accumulates across calls in persistent Node.js environments.

- **`ProcessPredicates` uses `xdmp.eval()`:** Evaluates predicate expression strings (e.g., `'lux("agentAny")'`) against module-scope prefixer functions (`crm`, `la`, `lux`, `skos`). Security FIXME in code — migrate to `sem.curieExpand()`.

- **`vec` is a MarkLogic built-in global** (MarkLogic 12+), not imported. Provides vector operations like `vec.vector()`. Will fail in any non-MarkLogic runtime.

- **Single criteria fallback:** If `planCriteria` has no `AND`/`OR`/`NOT` key, it's treated as a single-element AND: `criteria = [xdmp.toJSON(planCriteria).toObject()]; logicType = 'and';`.

- **Term name lookup:** `Object.keys(criterion).find((k) => k[0] !== '_' && searchTermNames.includes(k))` — keys starting with `_` (e.g., `_comp`, `_complete`, `_scope`, `_maxAnnK`) are reserved for options, not treated as search term names.

- **Scalar type casting:** If `termConfig.scalarType` is set, the criterion value is cast via `xs[scalarType](value)` before use.


---

# Configuration Dependencies

## Imports

| Import | Source | Purpose |
|---|---|---|
| `op` | `/MarkLogic/optic.mjs` | The Optic API module |
| `getSearchScopeTypes` | `/lib/searchScope.mjs` | Maps scope name → array of RDF type names (currently unused — commented out) |
| `getSearchTermNames` | `/config/searchTermsConfig.mjs` | Returns all term names for a scope (used to identify which JSON key is the search term) |
| `getSearchTermConfig` | `/config/searchTermsConfig.mjs` | Returns config object for a specific scope+term pair |
| `ANN_K_DEFAULT` | `/lib/appConstants.mjs` | Default neighbor count for `annTopK` (Gradle-injected, fallback: 50) |
| `ANN_K_MAX` | `/lib/appConstants.mjs` | Hard ceiling for `annTopK` k value (Gradle-injected, fallback: 1000) |
| `ANN_MAX_DISTANCE_DEFAULT` | `/lib/appConstants.mjs` | Default cosine distance threshold (Gradle-injected, fallback: 0.14) |
| `processSearchCriteria` | `/lib/searchLib.mjs` | Imported but **not used** in current code |
| `START_OF_GENERATED_QUERY` | `/lib/SearchCriteriaProcessor.mjs` | Imported but **not used** in current code |

> **Note:** `getSearchTermNames` and `getSearchTermConfig` are **build-time generated**. The source file exports stub (`dummy`) functions; real implementations are injected by the `generateRemainingSearchTerms` Gradle task at deployment.

## RDF Prefixers

Four namespace prefixers defined at module scope, used by `ProcessPredicates`:

| Prefix | Namespace |
|---|---|
| `crm` | `http://www.cidoc-crm.org/cidoc-crm/` |
| `la` | `https://linked.art/ns/terms/` |
| `lux` | `https://lux.collections.yale.edu/ns/` |
| `skos` | `http://www.w3.org/2004/02/skos/core#` |


---

# Search Term Config Shape

Properties read from `getSearchTermConfig(scope, termName)`:

```javascript
{
  patternName: string,        // switch dispatch: "text", "indexedWord", "indexedValue",
                              //   "indexedRange", "propertyValue", "hopWithField",
                              //   "documentId", "iri", "annTopK"
  indexReferences: string[],  // [0] assumed to exist; multiple references not supported
  scalarType: string | null,  // if set, value is cast via xs[scalarType](value)
  predicates: string[],       // hopWithField: predicate expression strings for ProcessPredicates
  targetScope: string,        // hopWithField: scope of the hop target (e.g., "agent")
  vectorColumn: string,       // annTopK only; default 'main'
  maxDistance: number,        // annTopK only; default ANN_MAX_DISTANCE_DEFAULT
  defaultMaxAnnK: number,    // annTopK only; default ANN_K_DEFAULT (can be overridden per-request via _maxAnnK)
}
```

## Plan Options

```javascript
const defaultPlanOptions = {
  preferFragJoins: false
}
```

| Option | `true` | `false` (default) |
|---|---|---|
| `preferFragJoins` | Joins use `op.fragmentIdCol` — D-Node pushdown, potentially faster | Joins use `op.col(uriCol)` — URI-based, more predictable |

Affects: join `on` clauses, `select` projections, column aliasing in full outer joins. Threaded through the entire recursive tree via `options`.


---

# Unimplemented Patterns

The `default` case in the switch throws: `throw new Error('Unimplemented pattern name: ...')`.

From `searchPatternsLib.mjs`, not yet in `optic.mjs`:
- `dateRange` — date range queries with start/end field pairs
- `hopInverse` — reverse triple navigation (object→subject)

New to LUX (no CTS equivalent):
- `transitive` — planned; distinct from `hopWithField` in that it supports transitive triple traversal


---

# Known Issues / TODOs

| Category | Detail |
|---|---|
| Bug | OR queries return an extra null row from `joinFullOuter` |
| Bug | OR queries perform significantly worse than AND equivalents |
| Security | `ProcessPredicates`: `xdmp.eval()` → migrate to `sem.curieExpand()` |
| Design | OR `hopWithField` "duplicate lexicon then outer join" pattern → extract helper function |
| Design | `indexedRange` may be better with `fromView` for measure flexibility |
| Feature | `values` mode for related lists (array of IRIs) |
| Feature | Verify multi-scope search, semantic sort + `SEMANTIC_SORT_TIMEOUT`, `pageWith` (max 100,000) |
| Feature | Add support for overriding `defaultCtsOptions` |
| Feature | Add support for views and other index types |
| Assumption | `indexReferences[0]` assumed to exist throughout; multiple index references not supported |


---

# Worked Example: `{ "AND": [{ "text": "lobster" }] }`

Tracing through the code with scope `'item'`:

1. **`execute()`** creates `finalGroups = { by: ['uri'], agg: [sample('dataType')] }`.

2. **`GetOpticPlan()`** is called with `finalGroups`. `logicType = 'and'`, `criteria = [{ text: "lobster" }]`.

3. **Criterion 0:** `{ text: "lobster" }`.
   - Term name: `"text"`, pattern: `"text"`.
   - **Rewrites** by pushing `{ OR: [{ textNoHop: "lobster" }, { referencedBy: "lobster" }] }` onto `criteria[]`.

4. **Criterion 1** (pushed): `{ OR: [{ textNoHop: "lobster" }, { referencedBy: "lobster" }] }`.
   - This is a child OR inside parent AND → triggers `joinInner` path (3×3 matrix: AND×OR = `joinInner`).
   - Recursively calls `GetOpticPlan({ OR: [...] }, 'item', null, <uuid>, options)`.

5. **Recursive call** with `logicType = 'or'`:
   - **Criterion 0:** `{ textNoHop: "lobster" }` — an `indexedWord` pattern.
     - OR context → `ctsConstraints.push(cts.fieldWordQuery(...))`.
   - **Criterion 1:** `{ referencedBy: "lobster" }` — a `hopWithField` pattern.
     - OR context → builds triple scan + reference lexicon, wraps in duplicate-lexicon full outer join.
   - **Assembly:** `plan.where(cts.orQuery([fieldWordQuery]))` for CTS constraints, then the hop full outer join.
   - Returns `{ plan, distanceCols: [] }`.

6. **Back in parent:** The inner join constrains the base lexicon plan to only documents matching the OR sub-plan.

7. **Assembly:** Base lexicons → inner join with OR sub-plan → `groupBy(['uri'], [sample('dataType')])`.

8. **`execute()`:** No `distanceCols`, so no post-processing. Returns `{ results, planAsJson, planAsSource, distanceCols: [], debug }`.


---

# Glossary

| Term | Meaning |
|---|---|
| **Scope** | A record type group (e.g. `item`, `agent`, `work`, `concept`, `event`, `place`, `set`). Each scope defines its own fields, predicates, and RDF types. |
| **Search Term** | A named criterion within a scope (e.g. `name`, `text`, `producedBy`, `classification`). Configured in `searchTermsConfig.mjs`. |
| **Pattern** | The implementation strategy for a search term (e.g. `indexedWord`, `hopWithField`). Determines how the term translates to Optic constructs. The `patternName` field in the term config dispatches to the `switch/case` in `GetOpticPlan`. |
| **Criterion** | A single element in the search criteria JSON. Either a conjunction (`AND`/`OR`/`NOT` wrapping an array) or a leaf (a search term + value). |
| **logicType** | The boolean context of the current `GetOpticPlan` call: `'and'`, `'or'`, or `'not'`. Determines which constraint bucket a pattern should target. |
| **D-Node pushdown** | A MarkLogic optimization where computation is sent to the data node that stores the fragment, avoiding network transfer. Enabled by joining on fragment IDs instead of URIs. |
| **Fragment** | MarkLogic's internal unit of document storage. Fragment IDs are internal, not exposed as URIs. |
| **Lexicon** | A range index that Optic can scan to produce rows. Created from `cts.uriReference()`, `cts.iriReference()`, `cts.fieldReference()`, etc. |
| **Prefixer** | An `op.prefixer(namespace)` function that, when called with a local name, produces a full IRI. E.g. `lux("agentAny")` → `https://lux.collections.yale.edu/ns/agentAny`. |
| **TDE** | Template-Driven Extraction. A MarkLogic feature that projects document content into relational-style views. The `vectors` view used by `annTopK` is a TDE view. |
| **ANN** | Approximate Nearest Neighbor. A class of algorithms that efficiently find the closest vectors in high-dimensional space. MarkLogic's `annTopK` uses a vector index for this. |
| **Cosine distance** | A measure of similarity between two vectors: 0 = identical direction, 1 = orthogonal, 2 = opposite. Lower = more similar. Used as the distance metric in `annTopK`. |


---

# LLM Operational Checklist

## When implementing a developer request against `optic.mjs`:

### 1. Classify the request

- [ ] New pattern (new `case` in the switch)?
- [ ] Modify existing pattern behavior?
- [ ] Change `execute()` (post-processing, return type, options)?
- [ ] Change plan options or constants?
- [ ] Change conjunction handling (3×3 matrix)?

### 2. Understand the scope of change

- [ ] Read the relevant `case` block(s) in `GetOpticPlan`.
- [ ] Identify which bucket(s) the pattern uses: `constraints[]`, `ctsConstraints[]`, or `joins[]`.
- [ ] Check all three logicType branches (`'and'`, `'or'`, `'not'`).
- [ ] If the pattern uses joins, check the column naming and join alignment.
- [ ] If the pattern produces metadata columns (like distance), check `distanceCols` propagation.

### 3. For new patterns — follow the template

- [ ] Determine: Is the constraint CTS/Optic-expressible, or does it need its own row source?
- [ ] Consult the **Bucket Selection Rule** table.
- [ ] For AND: use `constraints[]` (if expressible) or `joins[]` with `joinInner`.
- [ ] For OR: use `ctsConstraints[]` (if expressible) or `joins[]` with `joinFullOuter` (requires column alignment via `select` + `op.as`).
- [ ] For NOT: use `ctsConstraints[]` (if expressible) or `joins[]` with `notExistsJoin`.
- [ ] Use `id = sem.uuidString()` for all new column names to prevent collisions.
- [ ] If the pattern returns metadata columns, add them to `distanceCols[]` and handle in `execute()` post-processing.

### 4. Preserve invariants

- [ ] Never place constraints in `constraints[]` for OR/NOT context.
- [ ] Always deep-copy criteria if you mutate the array.
- [ ] Ensure column uniqueness via UUID namespacing.
- [ ] If adding a `joinFullOuter`, both sides must `select` to the same column set.
- [ ] Forward `distanceCols` through `groupBy` via `op.sample()`.
- [ ] Validate inputs at system boundaries (as `annTopK` validates seed document existence).
- [ ] If recursing `GetOpticPlan`, destructure `{ plan, distanceCols }` — do not treat the return as a bare plan.

### 5. How to verify

1. **Plan inspection:** Call `execute(criteria, scope, false)` (no results) and examine `planAsSource`. Look for:
   - Correct join types (`join-inner` vs `full-outer-join` vs `not-exists-join`)
   - Correct column names in join conditions
   - Expected CTS queries in `.where()` clauses

2. **Result inspection:** Call `execute(criteria, scope, true)` and check:
   - Result count is plausible
   - No unexpected `null` values (especially in OR queries — known `joinFullOuter` issue)
   - `dataType` column is present and correct
   - `distance` column appears when expected (`annTopK` patterns)

3. **Regression check:** Run the same query through both the old CTS pipeline and the new Optic pipeline (where applicable) and compare result URIs.

4. **Debug array:** Inspect `debug` for unexpected entries or error messages.


---

# Volatile Details Appendix

The following details are implementation-specific and may change. An LLM should **re-read the relevant source code** before relying on them.

| Detail | Where to verify | Current value/behavior |
|---|---|---|
| ANN constant values (`ANN_K_DEFAULT`, `ANN_K_MAX`, `ANN_MAX_DISTANCE_DEFAULT`) | `appConstants.mjs` and `gradle.properties` | Fallbacks: 50, 1000, 0.14 (Gradle may inject different values) |
| `k` resolution chain | `annTopK` case in `GetOpticPlan` | `Math.min(criterion._maxAnnK ?? termConfig.defaultMaxAnnK ?? ANN_K_DEFAULT, ANN_K_MAX)` |
| Seed-document exclusion heuristic | `annTopK` case, `isMultipleSimilarity` variable | Excludes for single similarity; keeps for multi-OR |
| Pure-similarity OR filter in `execute()` | `execute()` post-processing block | Checks criterion keys for `'similar'` or `'annTopK'` |
| `execute()` return shape | `execute()` return statement | `{ results, planAsJson, planAsSource, distanceCols, debug }` |
| `GetOpticPlan` return shape | `GetOpticPlan` return statement | `{ plan, distanceCols }` |
| `annTopK` OR join pattern | `annTopK` case, `logicType === 'or'` branch | Same "duplicate lexicon then outer join" pattern as `hopWithField` OR — fresh `fromLexicons` → `joinInner` to annPlan → `joinFullOuter` back to base |
| Search term config stubs | `searchTermsConfig.mjs` | Functions are Gradle-generated at build time; source shows `dummy` exports |
| Unused imports | Top of `optic.mjs` | `processSearchCriteria`, `START_OF_GENERATED_QUERY` |
