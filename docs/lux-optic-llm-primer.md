# LUX Optic Search Engine Primer

**Audience:** Developers and LLMs working on or extending the LUX Optic search engine.

The LUX backend uses MarkLogic's Optic API to build relational-style query plans (lexicon scans, triple joins, CTS filters) from a JSON search criteria grammar. This document covers the architecture, pattern system, engine internals, and operational lessons needed to work in this codebase.

---

# System Architecture

## Request Flow

```
Endpoint handler
  └─ SearchCriteriaProcessor (SCP)
       ├─ prepare()              ← configures scope, criteria, options
       ├─ execute()              ← full search: plan + results
       │    └─ engine.performSearch(scp)
       │         └─ engine.buildPlans(...)
       │              └─ engine.buildCriteriaAccumulator(...)   ← iterates criteria
       │                   └─ SearchPatternBase.get(name).apply(scp, searchTerm, logicType, patternOptions)
       │              └─ engine.assemblePlan(...)               ← builds Optic plan from accumulator
       │              └─ engine.collapseToResultRows(...)       ← groupBy, sort, select
       ├─ executeForValues()     ← related lists: values only, no Optic plan
       └─ buildPlans(...)        ← developer tool: returns plans without executing
```

## Key Source Files

| File | Purpose |
|---|---|
| `lib/SearchCriteriaProcessor.mjs` | Orchestrator. `prepare()` → `execute()` / `executeForValues()` / `buildPlans()`. Holds search state. |
| `lib/search/engine.mjs` | Core engine. `performSearch`, `buildPlans`, `processCriteria`, `buildCriteriaAccumulator`, `assemblePlan`, `collapseToResultRows`. |
| `lib/search/patterns/SearchPatternBase.mjs` | Base class for all patterns. Hosts the static pattern registry. |
| `lib/search/patterns/SearchPatternInterface.mjs` | Abstract interface defining required methods for pattern classes. |
| `lib/search/patterns/*.mjs` | Individual pattern implementations (10 classes). |
| `lib/search/SearchTerm.mjs` | Wraps a single search criterion with its config, value, columns, and options. |
| `lib/search/SearchTermConfig.mjs` | Wraps raw search term config; delegates metadata queries to the pattern registry. |
| `lib/search/PatternOptions.mjs` | Key-value bag threaded through pattern calls (e.g., `preferFragJoins`, `excludeSelfIri`). |
| `lib/search/SearchExecutionResult.mjs` | Return type of `performSearch`. |
| `lib/search/FacetResponses.mjs` | Wraps facet calculation results. |
| `lib/search/prefixUtils.mjs` | `expandPredicate()` / `expandPredicates()` — expands CURIE predicate strings to full IRIs. |
| `lib/searchScope.mjs` | Maps scope names → RDF types, fields, predicates. |
| `lib/appConstants.mjs` | Build-injected constants, search options arrays, and options-name lookup functions. |
| `config/searchTermsConfig.mjs` | Build-time generated search term definitions per scope. |
| `lib/relatedListsLib.mjs` | Related list execution — iterates search configs, calls `SCP.executeForValues()`. |
| `lib/searchLib.mjs` | Search endpoint logic — resolves search options, calls `SCP.execute()`. |

---

# Pattern System

## Self-Registration on SearchPatternBase

Each pattern class is defined in its own file under `lib/search/patterns/`. At module load time, each file registers a frozen singleton instance with `SearchPatternBase`:

```javascript
// Example: DateRange.mjs
const PATTERN_NAME_DATE_RANGE = 'dateRange';
SearchPatternBase.register(PATTERN_NAME_DATE_RANGE, new DateRange());
export { PATTERN_NAME_DATE_RANGE };
```

`SearchPatternBase` hosts the static registry:

```javascript
class SearchPatternBase extends SearchPatternInterface {
  static register(name, instance) { REGISTRY[name] = Object.freeze(instance); }
  static get(name)                { return REGISTRY[name]; }
  static has(name)                { return name in REGISTRY; }
  // ...base method implementations (isExposedViaSearch, acceptsGroup, etc.)
}
```

**Why this design:**
- `SearchPatternBase` is a leaf module (depends only on `SearchPatternInterface` → `errorClasses`). No circular dependency risk.
- Each pattern defines its name once. The constant and the registration use the same value.
- `engine.mjs` triggers registration via side-effect imports, then dispatches via `SearchPatternBase.get(patternName).apply(...)`.

## Pattern Interface Contract

Every pattern class extends `SearchPatternBase` and must implement:

| Method | Purpose |
|---|---|
| `apply(scp, searchTerm, logicType, patternOptions)` | Returns a contributions object with constraints, CTS queries, joins, and/or criteria rewrites. |
| `getRequiredRuntimeSearchTermProperties()` | Array of property names (without `_` prefix) that must be present on the search term at runtime. |
| `getAllowedChildren()` | Bitmask of allowed child types: `CHILD_TYPE_GROUP` (4), `CHILD_TYPE_TERM` (2), `CHILD_TYPE_ATOMIC` (1), `CHILD_TYPE_NONE` (0). |
| `isConvertIdChildToIri()` | Whether `id` child terms should be converted to `iri` terms. |
| `getAllowedSearchOptionsName()` | The search options name this pattern allows (`'keyword'`, `'exact'`, or `null`). |
| `getDefaultSearchOptionsName()` | The default search options name for this pattern. |

Base class derives convenience methods from `getAllowedChildren()`: `isExposedViaSearch()`, `acceptsGroup()`, `acceptsTerm()`, `acceptsAtomicValue()`, `onlyAcceptsAtomicValue()`.

## Registered Patterns

| Pattern name | Class | File | Children | Search options | Notes |
|---|---|---|---|---|---|
| `annTopK` | AnnTopK | `AnnTopK.mjs` | ATOMIC | none | Vector similarity via TDE view. |
| `dateRange` | DateRange | `DateRange.mjs` | ATOMIC | none | Start/end date range queries. |
| `documentId` | DocumentIdOrIri | `DocumentIdOrIri.mjs` | ATOMIC | none | Same class registered under two names. |
| `iri` | DocumentIdOrIri | `DocumentIdOrIri.mjs` | ATOMIC | none | Alias for `documentId`. |
| `geospatial` | Geospatial | `Geospatial.mjs` | ATOMIC | none | Geospatial point queries. |
| `hopInverse` | HopInverse | `HopInverse.mjs` | GROUP+TERM | none | Reverse triple navigation (object→subject). Has `cts.triples` valuesOnly mode. |
| `hopWithField` | HopWithField | `HopWithField.mjs` | GROUP+TERM | keyword | Forward triple navigation (subject→object). Supports transitive hops. |
| `indexedRange` | IndexedRange | `IndexedRange.mjs` | ATOMIC | keyword | Field range queries with comparators. |
| `indexedValue` | IndexedValue | `IndexedValue.mjs` | ATOMIC | keyword | Exact-match field value queries. |
| `indexedWord` | IndexedWord | `IndexedWord.mjs` | ATOMIC | keyword | Word/stemmed field queries. |
| `keyword` | Keyword | `Keyword.mjs` | ATOMIC | keyword | Full-text keyword: non-semantic field query OR semantic triple-range query. |

**Note:** `relatedList` appears as a `patternName` in search term configs but has no pattern class — it is a configuration-only marker used by deployment scripts and `relatedListsLib.mjs`.

## Pattern Contributions

A pattern's `apply()` method returns a plain object with any combination of:

```javascript
{
  lexicons: {},           // Additional lexicon columns for fromLexicons
  constraints: [],        // Optic expressions for .where() — AND context only
  ctsConstraints: [],     // CTS query objects — wrapped by logicType at assembly
  patternJoins: [],       // Join descriptors: { right, on, extraCols }
  criteria: [],           // Criteria to push back onto the iteration queue (macro expansion)
}
```

---

# MarkLogic Optic API Reference

All are server-side MarkLogic APIs.

| API | Purpose |
|---|---|
| `op.fromLexicons(map, qualifier, fragIdCol)` | Scans range indexes. Each key→column name, value→range ref (`cts.uriReference()`, `cts.fieldReference('name')`, etc.). One row per co-occurring index tuple per fragment. |
| `op.fromTriples([op.pattern(s,p,o,frag)])` | Scans triple index. Constants in pattern act as filters. **Does not return URIs.** |
| `op.fromView(schema, view, qualifier, fragIdCol)` | Scans a TDE view. Used by `annTopK`. |
| `plan.annTopK(k, vectorCol, queryVec, distCol, opts)` | ANN search on a `fromView` plan. Scores rows by cosine distance, keeps `k` closest. |
| `plan.where(condition)` | Filters rows. Accepts Optic expressions or CTS queries. **Multiple calls are AND'd — no `.whereOr()` exists.** |
| `plan.joinInner(right, on, cond)` | SQL INNER JOIN — AND between row sources. |
| `plan.joinLeftOuter(right, on, cond)` | SQL LEFT OUTER JOIN — preserves unmatched left rows. |
| `plan.joinFullOuter(right, on, cond)` | SQL FULL OUTER JOIN — OR between row sources. Can return extra null rows. |
| `plan.notExistsJoin(right, on, cond)` | Anti-join — NOT/exclusion. Keeps left rows with **no** match on the right. |
| `op.on(left, right)` | Join condition: equates columns or fragment IDs. |
| `op.fragmentIdCol(name)` | Fragment ID column. Enables D-Node pushdown. |
| `plan.select(cols)` | Projects columns. Required to normalize both sides of `joinFullOuter`. |
| `plan.groupBy(keys, aggs)` | Groups and aggregates. Used to deduplicate to one row per URI. |
| `op.as(newName, expr)` | Aliases a column. Critical for aligning child-plan column names. |
| `plan.orderBy(keys)` | Sorts rows. |
| `plan.export()` | Serializes plan to JSON AST. |
| `op.toSource(planJson)` | Converts plan AST to readable source (debugging). |

**Key behaviors:**
- `.where()` is always AND. OR and NOT between row sets require joins.
- CTS queries can be passed directly into `.where()` — the bridge between CTS and Optic.
- Optic plans are **immutable** — every method returns a NEW plan. `plan.where(...)` without reassignment silently discards the result.

**MarkLogic server-side globals** (no import needed): `cts`, `fn`, `xdmp`, `sem`, `xs`, `vec`. Injected into the SJS runtime by MarkLogic. `vec` (MarkLogic 12+) provides vector operations.

**Key Optic functions for data transformation:**
- `op.least()` / `op.greatest()` — Min/max across columns in same row
- `op.case()` — Conditional expressions
- `op.coalesce()` — First non-null value
- `op.as()` — Column aliasing and transformation
- Aggregation: `op.min()`, `op.max()`, `op.sum()`, `op.avg()`, `op.sample()`

---

# Engine Internals

## The Three Constraint Buckets

During criteria iteration, pattern contributions are collected into three buckets, then assembled into the final plan:

| Bucket | Assembly | Effect |
|---|---|---|
| `constraints[]` | Sequential `.where(c)` calls | **Always AND'd**, regardless of `logicType` |
| `ctsConstraints[]` | `ctsWrapper` at assembly time | `cts.andQuery` / `cts.orQuery` / `cts.notQuery(cts.orQuery(...))` based on `logicType` |
| `patternJoins[]` | Join method calls in `assemblePlan` | Each descriptor carries join metadata; join type is selected by `logicType` at assembly time |

Additionally, `conjunctionJoins[]` holds pre-built join descriptors from nested AND/OR/NOT groups, and `andOrSubPlans[]` holds deferred AND-encounters-OR sub-plans.

**`constraints[]` is only safe in AND context.** Placing a constraint here in OR/NOT context incorrectly ANDs it with all other criteria.

### Bucket Selection Rule

| Parent logicType | CTS/Optic-expressible (single filter on base plan) | Requires own row source (triples, sub-plan, vector index) |
|---|---|---|
| **AND** | `constraints[]` | `patternJoins[]` → assembled as `joinInner` |
| **OR** | `ctsConstraints[]` | `patternJoins[]` → assembled as `joinFullOuter` |
| **NOT** | `ctsConstraints[]` | `patternJoins[]` → assembled as `notExistsJoin` |

Patterns with **no CTS equivalent** (e.g., `annTopK`): always `patternJoins[]` for all logicTypes.

## Nested Conjunction Handling — The 3×3 Matrix

When a criterion is itself an AND/OR/NOT group, `buildConjunctionJoin` resolves it:

| Parent \ Child | AND | OR | NOT |
|---|---|---|---|
| **AND** | Inline (push to `criteria[]`) | Deferred sub-plan (combined in `assemblePlan`) | `notExistsJoin` on `{ OR: child.NOT }` |
| **OR** | `joinFullOuter` on child sub-plan | Inline (push to `criteria[]`) | `joinFullOuter` on child sub-plan |
| **NOT** | `notExistsJoin` on child sub-plan | `notExistsJoin` on child sub-plan | `joinInner` on `{ OR: child.NOT }` (double negation) |

**Inlining** (AND-in-AND, OR-in-OR): child items are pushed onto `criteria[]`. The dynamic `for` loop picks them up in subsequent iterations — no join, no recursion.

**AND-encounters-OR** is deferred: sub-plans are accumulated and combined off the outer fragment in `assemblePlan`. Chaining 2+ directly as `joinInner` against the same outer fragment triggers SPARQL fusion that silently zeroes results or blows memory.

## Column Naming Strategy

Every `buildCriteriaAccumulator` call receives a `parentId` (UUID or `null` for root). Columns are namespaced to prevent collisions:

| Column | Root (`parentId=null`) | Recursive (`parentId=<uuid>`) |
|---|---|---|
| URI | `'uri'` | `'<uuid>_uri'` |
| Fragment | `'frag'` | `'<uuid>_frag'` |
| IRI | `'iri'` | `'<uuid>_iri'` |
| DataType | `'dataType'` | `'<uuid>_dataType'` |

Within a call, each criterion gets its own UUID (`id = sem.uuidString()`):
- Lexicon columns: `id + '_field'`
- Triple columns: `id + '_s'`, `id + '_o'`, `id + '_triFrag'`
- ANN columns: `id + '_vecFrag'`, `id + '_distance'`, `id + '_vectorUri'`

`joinFullOuter` requires identical column sets on both sides — use `op.as()` to rename, then `select()` to project.

## Plan Assembly (`assemblePlan`)

After all criteria are processed, `assemblePlan` builds the plan in order:

1. `op.fromLexicons(lexicons, null, op.fragmentIdCol(fragCol))` — base plan with scope lexicons.
2. Apply each `constraint` as `.where(constraint)` — Optic expressions, always AND'd.
3. Apply `ctsConstraints` as `.where(ctsWrapper(ctsConstraints))` — wrapped per `logicType`.
4. Apply each `conjunctionJoin` by calling `plan[join.type](join.right, join.on, join.condition)`.
5. Fold `andOrSubPlans`: combine sub-plans to each other first, then join the combined result to the outer plan once.
6. Apply `patternJoins` based on `logicType`:
   - **AND**: `joinInner` for each.
   - **OR**: First join is `joinInner` if no other constraints exist; subsequent use the "duplicate lexicon → inner join → full outer join" pattern.
   - **NOT**: `notExistsJoin` for each.

## Result Finalization (`collapseToResultRows`)

Applied at the top level after assembly:
1. `groupBy(['uri'], [sample('dataType')])` — deduplicates to one row per document.
2. Optional `orderBy` — applies sort criteria.
3. `select([as('id', col('uri')), as('type', col('dataType'))])` — renames columns for the API response.

---

# Pattern Details

## Bucket Decisions by Pattern

| Pattern | AND | OR/NOT | Notes |
|---|---|---|---|
| `indexedValue` | `constraints[]` + lexicon (`op.eq`) | `ctsConstraints[]` (`cts.fieldValueQuery`) | Exact-match on `indexReferences[0]`. |
| `indexedWord` + `_complete` | `constraints[]` + lexicon (`op.eq`) | `ctsConstraints[]` (`cts.fieldValueQuery`) | Requires range index. |
| `indexedWord` (no `_complete`) | `ctsConstraints[]` | `ctsConstraints[]` | Word queries always use CTS — no Optic-native stemming/wildcards. |
| `indexedRange` | `constraints[]` + lexicon (comparator) | `ctsConstraints[]` (`cts.fieldRangeQuery`) | Comparator map: `">="` → `op.ge`, `"<"` → `op.lt`, etc. |
| `dateRange` | `constraints[]` + lexicon | `ctsConstraints[]` (`cts.fieldRangeQuery`) | Start/end date pair with comparators. |
| `documentId` / `iri` | `constraints[]` (`op.eq(uriCol, v)`) | `ctsConstraints[]` (`cts.documentQuery`) | Treated identically. |
| `keyword` | `ctsConstraints[]` | `ctsConstraints[]` | Always CTS — combines non-semantic field query OR semantic triple-range query. |
| `geospatial` | `ctsConstraints[]` | `ctsConstraints[]` | CTS geospatial queries. |
| `hopWithField` | `patternJoins[]` | `patternJoins[]` | Always joins — triples require own row source. |
| `hopInverse` | `patternJoins[]` | `patternJoins[]` | Always joins. Has valuesOnly optimization for related lists. |
| `annTopK` | `patternJoins[]` | `patternJoins[]` | Always joins — vector index requires own row source. |

## `keyword` Details

The `keyword` pattern replaces the old `text` macro pattern. Instead of rewriting to `{ OR: [keywordNoHop, referencedBy] }` (which produced an OR sub-plan with a triple hop), it now executes a single CTS query that combines:

1. **Non-semantic**: `cts.fieldWordQuery` (or `fieldValueQuery` for exact match) against the scope's field(s).
2. **Semantic**: Pre-resolves matching IRIs via `cts.values(cts.iriReference(), ...)` against the related field, then builds a `cts.tripleRangeQuery` over the scope's predicates.

The result is a single `cts.orQuery([nonSemanticQuery, tripleRangeQuery])` placed into `ctsConstraints[]` — no joins, no sub-plans.

## `hopWithField` Details

Always joins — triple navigation requires its own row source (`op.fromTriples`).

**Simple hop** (string `termValue`): Triple scan → reference lexicon filtered by value → inner-join on object=iri.

**Complex hop** (object `termValue` / nested criteria): Triple scan → recursive `processCriteria` on nested criteria → inner-join on object=iri.

**Literal IRI optimization**: When the child criteria is `{ iri: value }` or `{ id: value }`, `SCP.getChildId()` extracts the IRI string and uses `sem.iri(value)` directly as the object in the `op.fromTriples` pattern. This eliminates one `fromLexicons` + one `joinInner` per such term. This optimization applies to both regular search and related lists.

**Transitive hops**: `HopWithField` supports transitive triple traversal via `#processTransitiveHopWithFieldTerm`. Intermediate IRIs are embedded as SPARQL `VALUES`.

**OR case — "duplicate lexicon then outer join"**: Because `op.fromTriples` has no URI column, the code creates a second `op.fromLexicons`, inner-joins it to the triple result, then `joinFullOuter`s back to the base plan with column alignment.

## `hopInverse` Details

Reverse triple navigation (object→subject). The outer hop in all related list searches.

**Plan-based mode** (regular search): Builds `fromTriples` pattern with the inner plan's result as the subject constraint.

**valuesOnly mode** (related lists): When `OPTION_NAME_RETURN_VALUES` is set and the child criteria resolves to a literal IRI, bypasses all Optic plan construction:

1. **Phase 1 (inner hop)**: `cts.triples([], childPredicates, sem.iri(childId))` — find subjects matching the child IRI.
2. **Phase 2 (outer hop)**: `cts.triples(innerSubjects, outerPredicates, [])` — navigate from those subjects to find related IRIs.

Results are deduplicated via `Set`, the self-IRI excluded, and values appended via `scp.appendValues()`.

**Why this is fast**: `cts.triples` performs the same triple index lookup as `op.fromTriples` but with zero plan/SPARQL compilation overhead. For related lists with 50 searches, this eliminates ~2,250ms of compilation time.

| Metric | CTS baseline | Optic (before) | Optic (after) |
|---|---|---|---|
| Time (50 searches) | ~300 ms | 8,926 ms | **269 ms** |

See [optic-related-list-performance.md](optic-related-list-performance.md) for the full analysis.

## `annTopK` Details

Approximate nearest-neighbor vector similarity search. Term value is the **URI of a seed document** — its stored vector becomes the query vector.

**Validation**: Throws if the seed document doesn't exist or is missing vector data for the specified column.

**Row source**: `op.fromView('lux', 'vectors', id, op.fragmentIdCol(vecFrag))`.

**Seed-document exclusion**: Excluded for single similarity queries; kept for multi-OR similarity (cross-matching).

**Column handling**: The view's `uri` column is renamed to `id + '_vectorUri'` to avoid collision with the main lexicon.

| logicType | Join type | OR detail |
|---|---|---|
| AND | `joinInner` on `fragCol ↔ vecFrag` | — |
| OR | `joinFullOuter` (duplicate lexicon pattern) | Same pattern as `hopWithField` OR. |
| NOT | `notExistsJoin` on `fragCol ↔ vecFrag` | — |

---

# Related Lists

Related lists find entities related to a given entity via triple navigation. Each related list term (e.g., `agent.relatedToAgent`) has a `searchConfigs` array defining individual two-hop searches.

**Execution flow** (`relatedListsLib.mjs`):
1. Iterates `searchConfigs` for the requested related list.
2. For each, creates an `SCP`, calls `prepare()`, then `executeForValues()`.
3. `executeForValues()` runs `processCriteria` (triggering `HopInverse.#processValuesOnly`), then returns the collected values without building or executing a full Optic plan.
4. Results are aggregated by URI, sorted by relationship count, and paginated.

**PatternOptions for related lists**:
- `OPTION_NAME_EXCLUDE_SELF_IRI` — the requesting document's URI (excluded from results).
- `OPTION_NAME_MAXIMUM_VALUES` — cap per relation.
- `OPTION_NAME_EAGER_EVALUATION` — `true` for large caps, `false` for small.

---

# Facets

Facets are calculated after the main search executes. The implementation:
1. Extracts URIs from the search results.
2. For each facet request, builds a `fromSearch(cts.documentQuery(uriList))` plan.
3. Joins to the facet's index (lexicon-based or semantic) and groups/counts.
4. Supports semantic facets via triple-based joins with a projection barrier.

---

# Configuration Dependencies

## Imports in engine.mjs

| Import | Source | Purpose |
|---|---|---|
| `op` | `/MarkLogic/optic.mjs` | The Optic API module |
| `getSearchScopeTypes`, `isSearchScopeName` | `searchScope.mjs` | Maps scope name → RDF types; validates scope names |
| `getSearchTermNames`, `getSearchTermConfig` | `searchTermsConfig.mjs` | Build-time generated search term definitions |
| `SearchPatternBase` | `patterns/SearchPatternBase.mjs` | Pattern registry: `get()`, `has()` |
| `PatternOptions` | `PatternOptions.mjs` | Options bag threaded through pattern calls |
| `expandPredicate` | `prefixUtils.mjs` | Expands CURIE predicate strings to full IRIs |
| Pattern side-effect imports | `patterns/*.mjs` | Trigger self-registration of all 10 pattern classes |

> **Note:** `getSearchTermNames` and `getSearchTermConfig` are **build-time generated**. The source file exports stubs; real implementations are injected by the `generateRemainingSearchTerms` Gradle task at deployment.

## RDF Prefix Expansion

`prefixUtils.mjs` provides `expandPredicate(predicateStr)` and `expandPredicates(arr)`. These replace the old `xdmp.eval()`-based `ProcessPredicates` approach. Supported prefixes:

| Prefix | Namespace |
|---|---|
| `crm` | `http://www.cidoc-crm.org/cidoc-crm/` |
| `la` | `https://linked.art/ns/terms/` |
| `lux` | `https://lux.collections.yale.edu/ns/` |
| `skos` | `http://www.w3.org/2004/02/skos/core#` |

## Search Term Config Shape

```javascript
{
  patternName: string,        // Dispatches to registered pattern class
  indexReferences: string[],  // [0] assumed to exist; multiple not supported
  scalarType: string | null,  // If set, value is cast via xs[scalarType](value)
  predicates: string[],       // Hop patterns: CURIE predicate strings
  targetScope: string,        // Hop patterns: scope of the hop target
  idIndexReferences: string[],// hopWithField: field references for ID-based lookup
  forceExactMatch: boolean,   // Forces exact search options
  hopInverseName: string,     // Cross-references between hop/hopInverse pairs
  transitive: boolean,        // hopWithField: enables transitive traversal
  generated: boolean,         // True for terms auto-generated at deploy time
}
```

## PatternOptions

`PatternOptions` is a key-value bag passed through the pattern chain:

| Option | Purpose |
|---|---|
| `OPTION_NAME_PREFER_FRAG_JOINS` | Use fragment-based joins (D-Node pushdown) instead of URI-based. |
| `OPTION_NAME_EXCLUDE_SELF_IRI` | Exclude this IRI from related list results. |
| `OPTION_NAME_MAXIMUM_VALUES` | Cap on values per relation in related lists. |
| `OPTION_NAME_EAGER_EVALUATION` | Controls eager vs. lazy `cts.triples` evaluation. |

---

# Non-obvious Behaviors

- **Dynamic `for` loop**: `for (let idx = 0; idx < criteria.length; idx++)` reads live `.length`. AND-in-AND inlining, OR-in-OR inlining, and macro patterns push to `criteria[]` mid-loop. Deliberate — avoids recursion for flattenable cases.

- **Deep copy via `xdmp.toJSON`**: `criteria = xdmp.toJSON(planCriteria.AND).toObject()` is required because the loop mutates `criteria[]`. Without it, recursive calls would corrupt the caller's input.

- **`_scope` override**: Any criteria object can carry `_scope` to override the search scope for that sub-plan.

- **Single criteria fallback**: If `planCriteria` has no `AND`/`OR`/`NOT` key, it's treated as a single-element AND.

- **Reserved keys**: Keys starting with `_` (e.g., `_comp`, `_complete`, `_scope`, `_maxAnnK`) are reserved for options, not treated as search term names.

- **Scalar type casting**: If `termConfig.scalarType` is set, the criterion value is cast via `xs[scalarType](value)`.

- **Multi-scope search**: `_scope: 'multi'` enables searching across scopes. Requires an `OR` array where each branch declares a valid non-multi `_scope`.

---

# Optic Gotchas & Lessons

## Plan construction

- **Optic plans are immutable.** Every method (`.joinInner()`, `.where()`, `.select()`, etc.) returns a NEW plan. `plan.where(...)` without `plan = plan.where(...)` silently discards the result.

- **`assembleOpticPlan` is cheap to call twice.** It only constructs an Optic plan from a pre-populated accumulator. The expensive work (pattern contributions, transitive hop inner-query executions) is already captured in `acc`. Safe for producing variant plans (e.g., with/without sort lexicons).

- **Sort lexicons contaminate the base plan.** Adding sort field references to `acc.lexicons` before assembly constrains results to documents that have those index values. Solution: build the constraint plan from the original accumulator, then shallow-copy `acc.lexicons` with sort fields for a separate sorted plan.

## Triple navigation

- **Triple co-location**: Triples are always stored on their subject document. `fromTriples` fragment ID identifies the subject. Two patterns with the same subject column in one `fromTriples` call are constrained to the same document.

- **`cts.iriReference()` only returns IRIs for documents that are triple subjects** — never for objects. Use `sem.iri(literalValue)` as the triple object in `op.fromTriples`.

- **`sem.iri` uses reference equality, not string equality.** Use `fn.string(sem.iri(...))` before comparing with `===` or `Set`/`Array.includes`.

- **`cts.triples` beats Optic plans for repeated triple lookups.** The bottleneck for related lists was plan/SPARQL compilation overhead (~45ms each), not data volume. `cts.triples` performs the same index lookup with zero compilation.

- **Null predicates in `op.fromTriples` match ALL triples**, causing massive result inflation. Guard against null.

## AND/OR composition

- **AND'd keyword OR-wraps must use uniquely-named columns.** Per-branch unique naming is critical: shared column names give the SPARQL merger something to fuse on. Reduce each OR-wrap to a single column with a per-branch unique name, dedup with `groupBy`, then combine with `joinInner`.

- **`op.fromSearch`/`fromSearchDocs` in chained shape causes SPARQL fusion → MEMCANCEL.** The entire multi-branch plan fuses into one SPARQL block. Set aside for now.

- **`intersect` works but is strict set semantics** — same column name and value on both sides. Cannot carry per-branch scores. Use `joinInner` when scoring is needed.

## Other

- **`outputCols` rename must be root-only.** `op.as('id', op.col('uri'))` fails in recursive calls where column is `parentId + '_uri'`. Gate with `if (isTopLevel)`.

- **OR pattern join wrapping needs `uriCol`** so `groupBy(['uri'])` sees documents entering only through that path.

- **`xdmp.eval` inside `xdmp.invokeFunction` returns null for `sem.iri`.** Fix: use module-level prefixers directly with regex parsing (now handled by `prefixUtils.mjs`).

## Build pipeline

- Port 8003 uses `lux-modules`, port 8010 uses `lux-test-modules`.
- `resetTestModulesDatabase` copies main→test, `deleteTestModulesFromMain` cleans up.
- Module divergence is a common source of "works in tests, fails in Postman."

---

# Glossary

| Term | Meaning |
|---|---|
| **Scope** | A record type group (e.g., `item`, `agent`, `work`, `concept`, `event`, `place`, `set`). Each defines its own fields, predicates, and RDF types. |
| **Search Term** | A named criterion within a scope (e.g., `name`, `producedBy`, `classification`). Configured in `searchTermsConfig.mjs`. |
| **Pattern** | The implementation strategy for a search term (e.g., `indexedWord`, `hopWithField`). Each pattern is a class extending `SearchPatternBase`, registered by name, and dispatched via `SearchPatternBase.get(patternName).apply(...)`. |
| **Criterion** | A single element in the search criteria JSON. Either a conjunction (`AND`/`OR`/`NOT` wrapping an array) or a leaf (a search term + value). |
| **logicType** | The boolean context of the current processing call: `'and'`, `'or'`, or `'not'`. Determines bucket selection and join types. |
| **SCP** | `SearchCriteriaProcessor` — the orchestrator class that holds search state and delegates to the engine. |
| **D-Node pushdown** | A MarkLogic optimization where computation is sent to the data node owning the fragment, avoiding network transfer. Enabled by joining on fragment IDs. |
| **Fragment** | MarkLogic's internal unit of document storage. Fragment IDs are internal, not exposed as URIs. |
| **Lexicon** | A range index that Optic can scan to produce rows. Created from `cts.uriReference()`, `cts.iriReference()`, `cts.fieldReference()`, etc. |
| **TDE** | Template-Driven Extraction. Projects document content into relational-style views. The `vectors` view used by `annTopK` is a TDE view. |
| **ANN** | Approximate Nearest Neighbor. `annTopK` uses a vector index with cosine distance (0 = identical, 1 = orthogonal, 2 = opposite). |
| **PatternOptions** | A key-value bag threaded through the pattern call chain. Carries options like `preferFragJoins`, `excludeSelfIri`, `maximumValues`. |
| **CURIE** | Compact URI — a prefixed form like `lux:agentAny` expanded to a full IRI by `prefixUtils.mjs`. |

---

# LLM Operational Checklist

## Core Principle: Prefer Optic-Level Operations

**ALWAYS prioritize Optic-native operations over JavaScript post-processing.** Post-processing should be a last resort when the Optic API genuinely cannot handle the operation.

## When implementing a change:

### 1. Classify the request

- [ ] New pattern? → Create a new class extending `SearchPatternBase`, implement the interface, self-register.
- [ ] Modify existing pattern? → Read the pattern's `apply()` method and understand its bucket decisions for all three `logicType` values.
- [ ] Change engine behavior? → Read `buildCriteriaAccumulator`, `assemblePlan`, `collapseToResultRows`.
- [ ] Change search orchestration? → Read `SearchCriteriaProcessor.mjs`.

### 2. For new patterns

1. Create `lib/search/patterns/YourPattern.mjs` extending `SearchPatternBase`.
2. Implement all interface methods: `apply()`, `getRequiredRuntimeSearchTermProperties()`, `getAllowedChildren()`, `isConvertIdChildToIri()`, `getAllowedSearchOptionsName()`, `getDefaultSearchOptionsName()`.
3. Self-register: `SearchPatternBase.register('yourPatternName', new YourPattern());`
4. Export: `export { PATTERN_NAME_YOUR_PATTERN };`
5. Add side-effect import in `engine.mjs`: `import './patterns/YourPattern.mjs';`
6. Consult the **Bucket Selection Rule** table for where to place contributions.

### 3. Preserve invariants

- [ ] Never place constraints in `constraints[]` for OR/NOT context.
- [ ] Always deep-copy criteria if you mutate the array.
- [ ] Ensure column uniqueness via UUID namespacing (`sem.uuidString()`).
- [ ] If adding a `joinFullOuter`, both sides must `select` to the same column set.
- [ ] Forward metadata through `groupBy` via `op.sample()` if needed.
- [ ] Validate inputs at system boundaries.

### 4. How to verify

1. **Plan inspection**: Use `SCP.buildPlans()` or the `getPlansFromSearchCriteria.js` script to examine `planAsSource` without executing.
2. **Result inspection**: Execute and check result counts, null values, column presence.
3. **Debug array**: Inspect for unexpected entries.
