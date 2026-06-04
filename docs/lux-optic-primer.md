## **LUX Optic Search Engine Primer**

- [Introduction](#introduction)
- [System Architecture](#system-architecture)
  - [Request Flow](#request-flow)
  - [Key Source Files](#key-source-files)
- [Pattern System](#pattern-system)
  - [Self-Registration on SearchPatternBase](#self-registration-on-searchpatternbase)
  - [Pattern Interface Contract](#pattern-interface-contract)
  - [Registered Patterns](#registered-patterns)
  - [Pattern Contributions](#pattern-contributions)
- [MarkLogic Optic API Reference](#marklogic-optic-api-reference)
- [Engine Internals](#engine-internals)
  - [The Three Constraint Buckets](#the-three-constraint-buckets)
    - [Bucket Selection Rule](#bucket-selection-rule)
  - [Nested Conjunction Handling — The 3×3 Matrix](#nested-conjunction-handling--the-33-matrix)
  - [Column Naming Strategy](#column-naming-strategy)
  - [Plan Assembly (`assemblePlan`)](#plan-assembly-assembleplan)
  - [Result Finalization (`collapseToResultRows`)](#result-finalization-collapsetoresultrows)
  - [Pagination (`paginateResults`)](#pagination-paginateresults)
  - [Term Validation in `buildLeafSearchTerm`](#term-validation-in-buildleafsearchterm)
    - [Value-type enforcement](#value-type-enforcement)
    - [Wildcard sanitization](#wildcard-sanitization)
    - [Stop-word and punctuation-only detection](#stop-word-and-punctuation-only-detection)
- [Pattern Details](#pattern-details)
  - [Bucket Decisions by Pattern](#bucket-decisions-by-pattern)
  - [`keyword` Details](#keyword-details)
  - [`hopWithField` Details](#hopwithfield-details)
  - [`hopInverse` Details](#hopinverse-details)
  - [`annTopK` Details](#anntopk-details)
- [Related Lists](#related-lists)
- [Facets](#facets)
- [Configuration Dependencies](#configuration-dependencies)
  - [Imports in engine.mjs](#imports-in-enginemjs)
  - [RDF Prefix Expansion](#rdf-prefix-expansion)
  - [Search Term Config Shape](#search-term-config-shape)
  - [PatternOptions](#patternoptions)
- [Non-obvious Behaviors](#non-obvious-behaviors)
- [Optic Gotchas \& Lessons](#optic-gotchas--lessons)
  - [Plan construction](#plan-construction)
  - [Triple navigation](#triple-navigation)
  - [AND/OR composition](#andor-composition)
  - [Other](#other)
  - [Build pipeline](#build-pipeline)
- [Glossary](#glossary)
- [LLM Operational Checklist](#llm-operational-checklist)
  - [Core Principle: Prefer Optic-Level Operations](#core-principle-prefer-optic-level-operations)
  - [When implementing a change:](#when-implementing-a-change)
    - [1. Classify the request](#1-classify-the-request)
    - [2. For new patterns](#2-for-new-patterns)
    - [3. Preserve invariants](#3-preserve-invariants)
    - [4. How to verify](#4-how-to-verify)
- [Optimizations \& Performance Investigations](#optimizations--performance-investigations)
  - [Performance Context \& Targets](#performance-context--targets)
  - [CTS vs Optic Comparisons](#cts-vs-optic-comparisons)
  - [Investigation Tooling](#investigation-tooling)
  - [Theory Index](#theory-index)
  - [Isolated Benchmark Reference (MarkLogic 12.0.1)](#isolated-benchmark-reference-marklogic-1201)
    - [Key findings](#key-findings)
    - [Warm-run gap breakdown](#warm-run-gap-breakdown)
    - [Cold-start gap breakdown](#cold-start-gap-breakdown)
  - [Benchmark Templates](#benchmark-templates)
  - [Ideas from Previous Analysis](#ideas-from-previous-analysis)
  - [Implemented Optimizations](#implemented-optimizations)
  - [Data Type Constraint Optimizations](#data-type-constraint-optimizations)
    - [Optimization 3: Reduce or eliminate redundant dataType constraints](#optimization-3-reduce-or-eliminate-redundant-datatype-constraints)
      - [Implemented: empty-groups optimization](#implemented-empty-groups-optimization)
      - [Finding: hop-side dataType constraint is required (2026-06-03)](#finding-hop-side-datatype-constraint-is-required-2026-06-03)
    - [Optimization 7: Use scope-specific dataType lexicons](#optimization-7-use-scope-specific-datatype-lexicons)
    - [Optimization 12: Scope-specific predicates to eliminate dataType constraints](#optimization-12-scope-specific-predicates-to-eliminate-datatype-constraints)
  - [Optimization 1: `plan.where()` when scores are not needed](#optimization-1-planwhere-when-scores-are-not-needed)
  - [Optimization 2: Combine OR'd keywords into a single pattern instance](#optimization-2-combine-ord-keywords-into-a-single-pattern-instance)
  - [Optimization 4: Reduce keyword pattern IRI payload](#optimization-4-reduce-keyword-pattern-iri-payload)
  - [Optimization 5: Remove unused `iri` column from `fromLexicons` for keyword-only queries](#optimization-5-remove-unused-iri-column-from-fromlexicons-for-keyword-only-queries)
  - [Optimization 6: Analyze the optimized plan for join strategy issues](#optimization-6-analyze-the-optimized-plan-for-join-strategy-issues)
  - [Optimization 8: Use `op.param` for non-CTS plan parameters](#optimization-8-use-opparam-for-non-cts-plan-parameters)
  - [Optimization 9: Lazy IRI resolution (pass Sequence, not Array)](#optimization-9-lazy-iri-resolution-pass-sequence-not-array)
  - [Optimization 10: fromTriples architecture (avoid IRIs in plan AST entirely)](#optimization-10-fromtriples-architecture-avoid-iris-in-plan-ast-entirely)
  - [Optimization 11: MarkLogic enhancement — CTS object filter in `cts.tripleRangeQuery`](#optimization-11-marklogic-enhancement--cts-object-filter-in-ctstriplerangequery)
  - [Optimization 13: Amp as Admin](#optimization-13-amp-as-admin)
  - [Optimization 14: Page-Slice Hydration](#optimization-14-page-slice-hydration)
  - [Optimization 15: CTS Fold](#optimization-15-cts-fold)
  - [Optimization 16: HopWithField CTS](#optimization-16-hopwithfield-cts)

# Introduction

The LUX backend uses MarkLogic's Optic API to build relational-style query plans (lexicon scans, triple joins, CTS filters) from a JSON search criteria grammar. This document covers the architecture, pattern system, engine internals, and operational lessons needed to work in this codebase.

It is for developers and LLMs working on or extending the LUX Optic search engine.

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
       │                   └─ buildLeafSearchTerm(...)          ← validates value-type, wildcards, stop words
       │                   └─ SearchPatternBase.get(name).apply(scp, searchTerm, logicType, patternOptions)
       │              └─ engine.assemblePlan(...)               ← builds Optic plan from accumulator
       │              └─ engine.collapseToResultRows(...)       ← groupBy, sort, select
       │         └─ plan.limit() if pageWith                   ← caps materialization
       │         └─ plan.result().toArray()                    ← executes plan
       │         └─ engine.paginateResults(...)                ← resolves page (normal or pageWith)
       ├─ executeForValues()     ← related lists: values only, no Optic plan
       └─ buildPlans(...)        ← developer tool: returns plans without executing
```

## Key Source Files

| File | Purpose |
|---|---|
| `lib/SearchCriteriaProcessor.mjs` | Orchestrator. `prepare()` → `execute()` / `executeForValues()` / `buildPlans()`. Holds search state. |
| `lib/search/engine.mjs` | Core engine. `performSearch`, `buildPlans`, `processCriteria`, `buildCriteriaAccumulator`, `assemblePlan`, `collapseToResultRows`, `paginateResults`. Also owns term validation (value-type, wildcards, stop words). |
| `lib/search/patterns/loadPatterns.mjs` | **Barrel module.** Imports all pattern files (triggering self-registration) and re-exports `SearchPatternBase` plus every `PATTERN_NAME_*` constant. All consumers should import from here, never from individual pattern files or `SearchPatternBase.mjs` directly. |
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
  // ...base method implementations (acceptsGroup, acceptsTerm, etc.)
}
```

**Why this design:**
- `SearchPatternBase` is a leaf module (depends only on `SearchPatternInterface` → `errorClasses`). No circular dependency risk.
- Each pattern defines its name once. The constant and the registration use the same value.
- `loadPatterns.mjs` is the barrel module that imports all pattern files (triggering registration) and re-exports `SearchPatternBase` and all `PATTERN_NAME_*` constants. **All consumers should import from `loadPatterns.mjs`**, never from individual pattern files or `SearchPatternBase.mjs` directly. This guarantees the registry is fully populated regardless of module cache state.
- `engine.mjs` dispatches via `SearchPatternBase.get(patternName).apply(...)`.

## Pattern Interface Contract

Every pattern class extends `SearchPatternBase` and must implement:

| Method | Purpose |
|---|---|
| `apply(scp, searchTerm, logicType, patternOptions)` | Returns a contributions object with constraints, CTS queries, joins, and/or criteria rewrites. |
| `getRequiredRuntimeSearchTermProperties()` | Array of property names (without `_` prefix) that must be present on the search term at runtime. |
| `getAllowedChildren()` | Bitmask of allowed child types: `CHILD_TYPE_GROUP` (4), `CHILD_TYPE_TERM` (2), `CHILD_TYPE_ATOMIC` (1). |
| `isConvertIdChildToIri()` | Whether `id` child terms should be converted to `iri` terms. |
| `getAllowedSearchOptionsName()` | The search options name this pattern allows (`'keyword'`, `'exact'`, or `null`). |
| `getDefaultSearchOptionsName()` | The default search options name for this pattern. |

Base class derives convenience methods from `getAllowedChildren()`: `acceptsGroup()`, `acceptsTerm()`, `acceptsAtomicValue()`, `onlyAcceptsAtomicValue()`.

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

## Pagination (`paginateResults`)

After plan execution materializes all result rows, `paginateResults` determines which page to return:

- **Normal mode** (`pageWith` not set): Uses the `page` parameter directly. Slices `allRows` by `(page-1)*pageLength` offset.
- **pageWith mode** (`pageWith` is a document ID): Finds the target document's position in the sorted result set and calculates which page contains it: `resultPage = Math.ceil((foundIndex + 1) / pageLength)`.

**Safeguards:**
- When `pageWith` is set, the plan is capped with `.limit(MAXIMUM_PAGE_WITH_LENGTH + 1)` (100,001) before execution to prevent materializing millions of rows.
- If the result set exceeds the cap, an error is thrown (the target cannot be reliably located).
- If the target document is not found in the results, an error is thrown.

**Use case:** The middle tier uses `pageWith` to render a hierarchical widget — given a specific document ID within a sorted result set, it returns the page containing that document.

## Term Validation in `buildLeafSearchTerm`

After resolving a search term's config and pattern, the engine performs three categories of validation before the pattern's `apply()` method is called:

### Value-type enforcement

The pattern's `getAllowedChildren()` bitmask determines which structural types the term accepts. The engine checks:

- If the value is an object with `AND`/`OR`/`NOT` → requires `acceptsGroupAsChild()`.
- If the value is an object with non-`_` keys (nested term) → requires `acceptsTermAsChild()`.
- If the value is atomic (string, number) → requires `acceptsAtomicValue()`.

Violations throw `InvalidSearchRequestError` with descriptive messages (e.g., "the 'text' term contains a group but is not allowed to").

### Wildcard sanitization

For keyword-pattern terms with wildcard characters (`*`, `?`):
1. Adjacent wildcards are consolidated (e.g., `**?*` → `*`).
2. Each wildcard segment must have at least 3 non-wildcard characters adjacent to it.
3. Violations throw `InvalidSearchRequestError`.

This logic lives in `engine.mjs` (`sanitizeAndValidateWildcardedStrings`). `SCP` exposes a static pass-through for use by other modules (e.g., autocomplete).

### Stop-word and punctuation-only detection

Terms composed entirely of stop words (e.g., "a the and") or punctuation-only characters are marked unusable and added to the SCP's ignored terms list. If all criteria are unusable, an error is thrown. Detection is handled by `getUnusableTermWords()` in the engine.

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

**CTS path** ([Opt 16](#optimization-16-hopwithfield-cts)): When the non-transitive term's inner criteria resolves to pure CTS (no Optic joins), the pattern emits `cts.tripleRangeQuery` as a `ctsConstraint` instead of an Optic `fromTriples` join. This eliminates the `fromTriples` scan and the `joinInner` back to the base plan. Two sub-paths:

- **Id-leaf**: `{ id: IRI }` or `{ iri: IRI }` — wraps `cts.documentQuery(childId)` inside `cts.values(cts.iriReference())` to resolve matching object IRIs.
- **Nested pure-CTS**: `{ name: "painting" }`, `{ OR: [{ id: IRI }, ...] }` — calls `processCriteriaAsCts` on the inner criteria. If the inner accumulator is pure CTS, wraps it inside `cts.values` the same way.

Both paths fall back to the Optic join path when inner criteria requires Optic contributions (e.g., `DocumentIdOrIri` under AND logic contributes `constraints`, not `ctsConstraints`).

Note: the engine's `idIndexReferences` rewrite (in `buildLeafSearchTerm`) preempts this optimization for terms that have `idIndexReferences` — those are rewritten to `IndexedValue` before `HopWithField.apply()` is called.

**Optic join path** (fallback): Triple scan via `op.fromTriples` → inner-join on object=iri. Used when inner criteria cannot be expressed as pure CTS.

**Transitive hops**: `HopWithField` supports transitive triple traversal via `#processTransitiveHopWithFieldTerm`. Intermediate IRIs are embedded as SPARQL `VALUES`. The CTS path does not apply to transitive terms.

**OR case — "duplicate lexicon then outer join"**: Because `op.fromTriples` has no URI column, the code creates a second `op.fromLexicons`, inner-joins it to the triple result, then `joinFullOuter`s back to the base plan with column alignment.

## `hopInverse` Details

Reverse triple navigation (object→subject). The outer hop in all related list searches.

**Plan-based mode** (regular search): Builds `fromTriples` pattern with the inner plan's result as the subject constraint.

**valuesOnly mode** (related lists): When `patternOptions.getReturnValues()` is true and the child criteria resolves to a literal IRI, bypasses all Optic plan construction:

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

**PatternOptions for set by related lists**:
- `excludeSelfIri` — the requesting document's URI (excluded from results).
- `maximumValues` — cap per relation --not implemented within SCP. TBD if required. Would rather no cap.
- `eagerEvaluation` — `true` for large caps, `false` for small.

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
| `eagerEvaluation` | Controls eager vs. lazy `cts.triples` evaluation. |
| `excludeSelfIri` | Exclude this IRI from related list results. |
| `maximumValues` | Cap on values per relation in related lists. |
| `preferFragJoins` | Use fragment-based joins (D-Node pushdown) instead of URI-based. |
| `returnValues` | Used by the related lists via `scp.executeForValues` to get IRIs without the full overhead of `scp.execute`. |

---

# Non-obvious Behaviors

- **Dynamic `for` loop**: `for (let idx = 0; idx < criteria.length; idx++)` reads live `.length`. AND-in-AND inlining, OR-in-OR inlining, and macro patterns push to `criteria[]` mid-loop. Deliberate — avoids recursion for flattenable cases.

- **Deep copy via `xdmp.toJSON`**: `criteria = xdmp.toJSON(planCriteria.AND).toObject()` is required because the loop mutates `criteria[]`. Without it, recursive calls would corrupt the caller's input.

- **`_scope` override**: Any criteria object can carry `_scope` to override the search scope for that sub-plan.

- **Single criteria fallback**: If `planCriteria` has no `AND`/`OR`/`NOT` key, it's treated as a single-element AND.

- **Reserved keys**: Keys starting with `_` (e.g., `_comp`, `_complete`, `_scope`, `_maxAnnK`) are reserved for options, not treated as search term names.

- **Scalar type casting**: If `termConfig.scalarType` is set, the criterion value is cast via `xs[scalarType](value)`.

- **Multi-scope search**: `_scope: 'multi'` enables searching across scopes. Requires an `OR` array where each branch declares a valid non-multi `_scope`.

- **BOOST is not supported.** The `BOOST` operator existed in the CTS-era grammar but was removed during the Optic migration. The engine does not recognize it.

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
5. Add the pattern to `lib/search/patterns/loadPatterns.mjs`: a side-effect import line and a re-export of the `PATTERN_NAME_*` constant. This is the **only** file that needs updating — consumers already import from `loadPatterns.mjs`.
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

---

# Optimizations & Performance Investigations

Unless otherwise noted, analysis and benchmarks are for a three AND'd keyword terms ("woman", "greek", "art") in the `item` scope.  This search is sometimes referred to as WGA.  Much time was spent on this one as it constitutes LUX's most common end-user search: multiple AND'd keywords.

## Performance Context & Targets

**Targets:**
- **3 seconds or less** for simple search (keyword search).
- **6 seconds or less** for advanced search.
- The goal is to approach CTS performance, but not at the cost of fixation. Hit the target durations first.

**Principles:**
- **End-user experience reigns.** The performance test and comparisons thereof should only be given so much weight. Observations may inform optimization ideas beyond search itself (e.g., consolidating facet requests — already supported by the engine but not yet by the middle tier or backend endpoints).
- **Weight actual durations over percentages.** A 434% relative change sounds horrific, yet the actual increase was 139 ms — well within customer tolerance (≥100 ms for individual query differences).

**Benchmark context:** The isolated benchmarks in this document use two extremes — fully cold (caches cleared) and fully hot (10th identical iteration). Production falls somewhere in between, but the serialized 5K-request test (Optic avg ~4,634 ms) aligns closely with isolated cold-cache measurements (~3,928–4,013 ms), indicating that under diverse query load the plan cache provides little benefit. Each distinct keyword query produces a unique plan AST (different IRIs), so warm-cache numbers (29–37 ms) apply only when the exact same query repeats before plan eviction.

**Pre-optimization WGA in the serialized 5K-request context** (back-to-back, no pause between requests):

| Implementation | Observed latency | Notes |
|---|---|---|
| CTS | ~810ms | Includes one additional criterion (different pattern); believed to add little to the gap |
| Optic | ~4,634ms | Same additional criterion omitted from isolated tests below |

**System resource observations during the 5K test:**
- CPU 85–95% idle — **not CPU-bound**; this is an I/O and cache-efficiency problem.
- Free memory dropped from ~20 GB to ~7 GB — caches filling but under eviction pressure.
- Triple cache miss spikes (~220 misses/sec) correlate with page-in spikes (~53K pages/sec). Each keyword query's `cts.tripleRangeQuery` with tens of thousands of IRIs hammers the triple cache; entries are evicted between diverse queries.
- Triple value cache miss rate peaked at ~2,626 misses/sec.
- HTTP request rate: ~5 req/sec sustained.

**Optimization target:** The customer tolerance is ≥100 ms for individual query differences. The primary goal is closing the 5.7× serialized-test gap (4,634 ms vs 810 ms), which aligns with the 6× cold-start gap in isolated testing. Hot-cache micro-benchmark gaps (179 ms vs 93 ms) are secondary — they over-state cache warmth relative to production.

## CTS vs Optic Comparisons

Disable transitive search before running functional or performance comparisons. Transitive search is Optic-only (CTS does not support it), so leaving it enabled skews both result counts and timings. Set both `transitive` properties to `false` in [searchTermsConfig.mjs](src/main/ml-modules/root/config/searchTermsConfig.mjs).

## Investigation Tooling

| Resource | Purpose |
|---|---|
| [Performance QC Workspace](/scripts/performance/Performance%20QC%20Workspace.xml) | Query Console workspace with benchmark tabs, plan inspection, and DSL execution |
| [/scripts/performance/](/scripts/performance/) | Maintained benchmark scripts and analysis tools |
| [/scratch/performance/](/scratch/performance/) | Exploratory/throwaway scripts from specific investigations |
| [getPlansFromSearchCriteria.js](/scripts/getPlansFromSearchCriteria.js) | Generates Optic plans from JSON search criteria without executing.  **Warning:** this script calls `buildPlans` which --unless since refactored-- is downstream of the [Page-slice hydration optimization](#optimization-14-page-slice-hydration) for select keyword searches. |
| [analyze-search-comparison.mjs](/scripts/performance/analyze-search-comparison.mjs) | Surface the worst performing pattern shapes from a search comparison's 200 slowest requests based on frequency and delta with CTS' performance. |
| [5k-pattern-analysis.md](/scratch/5k-pattern-analysis.md) | Breakdown of the 5K-request performance test by search pattern |
| [search-cold-start-mitigation.md](/docs/search-cold-start-mitigation.md) | [Page-slice hydration optimization](#optimization-14-page-slice-hydration) design and analysis |
| [keyword-perf-investigation.md](/scratch/performance/woman-greek-art-memberOf/keyword-perf-investigation.md) | Multi-keyword search investigation findings and theory results |

**Plan visualization:** The Query Plan Viewer in Query Console supports Optic plans. Set query type to "Optic DSL Query", then paste the `selectedPlan` value from `getPlansFromSearchCriteria.js` into the DSL tab. Add a `limit` before `select` if needed — the `op` import and `.result()` call are automatic (including either causes an error). The "Get Plan" and "DSL" tabs in the Performance QC Workspace are pre-configured for this workflow.  For more, see [Introduction to Query Console](https://docs.progress.com/bundle/marklogic-server-use-query-console-12/page/topics/intro.html) -> [Query Console Walkthrough](https://docs.progress.com/bundle/marklogic-server-use-query-console-12/page/topics/walkthru.html) -> [Viewing Query Plans](https://docs.progress.com/bundle/marklogic-server-use-query-console-12/page/topics/walkthru.html#id_27533).

**XML plan extraction:** Benchmark scripts with a `traceId` write detailed plans to `8000_ErrorLog.txt`. Find the plan that has your trace ID and includes cost attributes. To produce valid XML, strip timestamps with regex. Some LLM sessions request JSON. W3 Schools has an online [XML to JSON transformer](https://www.w3schools.com/tools/tool_xml_json.php) that preserves attributes.

## Theory Index

The following table describes various theories that were tested and are referenced in subsequent sections.  These all pertain to multiple AND'd keywords.  

| Theory | What it tests | Optimization | Status |
|---|---|---|---|
| A | `plan.where(ctsQuery)` instead of `fromSearch` + `joinInner` — eliminates score column | 1 | Confirms `where()` is faster; no scoring available |
| B | Non-semantic only via `fromSearch` — drops all IRI resolution and `tripleRangeQuery` | — | Isolates IRI payload cost from `fromSearch`/`joinInner` cost |
| C | Capped IRI count per keyword (configurable N) — tests plan AST size scaling | 4 | Confirms cold-start scales with IRI literal count |
| D | Semantic side moved to `fromTriples` joins — no IRIs in plan AST | 10 | **14× faster cold** — proves IRIs in plan AST are the bottleneck |
| E | Phase timing breakdown: IRI resolve, plan build, execute — measured separately | — | Analysis only — quantifies where time is spent |
| F | Split: `where()` for full CTS filtering, `fromSearch(OR)` for lightweight scoring | 1 | `joinLeftOuter` with broad OR scoring too expensive |
| G | Like F but `fromSearch(AND)` scoring — only text-AND matches get scores | 1 | Selective scoring works; semantic-only matches rank last |
| H | Remove `op.in(dataType)` constraint — keep dataType column for output only | 3 | Marginal gain; field-level scope specificity is sufficient for filtering |
| I | Remove both dataType constraint AND `iri` column from `fromLexicons` | 3, 5 | Best `prepare(1)` result — fewer lexicon columns, no constraint |
| J | Late-bind dataType: minimal `fromLexicons(uri)` first, join dataType after `groupBy` | 3, 12 | Tests late-projection design from Optimization 12 |
| K | Scope-specific dataType lexicon (`itemDataTypeName` instead of `anyDataTypeName`) | 7 | No gain; contradicted by 2026-06-03 finding |
| L | `fromSearch` as driving (left) side of join — lexicon probed, not scanned | — | Tests whether join direction affects optimizer's strategy |
| M | Lazy IRI resolution — pass `cts.values()` Sequence directly, skip `.toArray()` | 9 | No gain — `cts.tripleRangeQuery` materializes eagerly |
| N | `fromTriples` architecture: (text-AND) ∪ (semantic-AND) via `union` | 10 | Fast (464ms cold) but only 1.3% recall |
| N2 | Per-keyword OR via `fromLexicons(iri)` union + `fromTriples` — full recall attempt | 10 | SVC-MEMCANCELED (~8.5 GB) — 3 × `fromLexicons(iri)` over 43.9M entries |

## Isolated Benchmark Reference (MarkLogic 12.0.1)

**Important:** Early benchmarks (Theories A–L) called `plan.prepare(1)` before `.result()`, which forces re-optimization on every invocation and adds ~140ms to each warm run. The production code does NOT call `prepare()` — MarkLogic caches and reuses optimized plans automatically. The table below uses corrected numbers without `prepare()` where available.

| Approach | First run (cold) | Warm avg | Notes |
|---|---|---|---|
| CTS baseline | 662–680ms | 93–98ms | Direct `cts.search()`, re-resolves IRIs each iteration |
| Optic baseline (with `prepare(1)`) | 4,043–4,297ms | 178–203ms | Inflated by forced re-optimization each warm run |
| **Optic baseline (no `prepare()`, admin)** | **3,855–3,868ms** | **29–30ms** | **Optic 3.2× faster than CTS warm** |
| **Optic baseline (no `prepare()`, consumer)** | **3,928–4,013ms** | **32–37ms** | **With permissions; Optic 2.7× faster than CTS warm** |
| **Theory D** (non-semantic only, no `prepare()`) | **267–272ms** | **3–7ms** | No `tripleRangeQuery` in plan — **14× faster cold than baseline** |
| Theory E (phase timing, no `prepare()`) | 4,056ms total | — | IRI=136ms, build=37ms, execute=3,883ms |
| **Theory M** (lazy IRI, no `prepare()`) | **3,804–3,891ms** | **28–34ms** | No improvement — materializes eagerly |
| **Theory N** (fromTriples, text-AND ∪ sem-AND) | **464ms** | **10ms** | 127/10,105 results — fast but incomplete recall |
| Theory N2 (per-keyword OR via fromLexicons) | — | — | SVC-MEMCANCELED — 3 × fromLexicons(iri) over 43.9M entries |
| Optic `plan.where()` only (no scoring) | 3,990ms | 128ms | With `prepare(1)`; full query via `where()` |
| Optic non-semantic only (`fromSearch`) | 407ms | 136ms | With `prepare(1)`; `fieldWordQuery` AND only |

### Key findings

1. **Warm-run performance: Optic is faster than CTS.** Without `prepare()`, Optic warm avg is 29–37ms vs CTS 93–98ms (2.7–3.2× faster). The earlier 1.9× Optic-is-slower conclusion was an artifact of forced re-optimization in benchmark scripts.
2. **Cold-start gap: 5.8×** (Optic 3,928ms vs CTS 662ms). This is the dominant problem. Driven by Optic plan optimization cost for the 49K-IRI CTS query.
3. **The entire cold penalty is from 49K-IRI plan optimization.** Theory D (non-semantic only, no `tripleRangeQuery`) cold = 267ms — 14× faster than baseline, actually faster than CTS. The optimizer processing literal IRI values in the plan AST accounts for 97% of the cold-start overhead.
4. **Lazy IRI resolution doesn't help (Theory M).** `cts.tripleRangeQuery` eagerly materializes Sequence arguments into the plan AST regardless of whether input is Array or Sequence. The `.toArray()` call is not the bottleneck.
5. **`plan.where()` vs `op.fromSearch()`**: `where()` passes the CTS query by reference; `fromSearch()` incorporates it into the plan AST. With 49K IRI literals in `cts.tripleRangeQuery`, `fromSearch` adds measurable overhead. On warm runs: 128ms (`where`) vs 179ms (`fromSearch+joinInner`) — both with `prepare(1)`.
6. **Admin vs consumer permissions**: ~100ms cold, ~5ms warm — negligible factor.
7. **IRI count in the keyword pattern**: Each keyword's `apply()` eagerly resolves IRIs via `cts.values().toArray()`. For this query: woman=11,670, greek=2,456, art=34,987 — totaling 49,113 IRIs embedded as literals in `cts.tripleRangeQuery` objects.
8. **The 3.8s optimization cost doesn't disappear without `prepare()`.** It shifts from explicit `prepare()` into implicit optimization inside `.result()` on first execution. Plan cache makes subsequent warm calls fast (28–37ms).

### Warm-run gap breakdown

Applies to the `prepare(1)` numbers and is preserved for reference. Without `prepare()`, Optic warm is 32–37ms — faster than CTS (93–98ms) — so the warm-run gap is no longer the performance concern. **The cold-start gap is the primary optimization target.**

| Component | Estimated cost | Source |
|---|---|---|
| `prepare(1)` re-optimization overhead | ~140ms | Baseline with prepare (178ms) minus baseline without (37ms) |
| Optic execution (lexicon scan, groupBy, orderBy, select, fromSearch) | ~37ms | Baseline without prepare() |
| CTS baseline execution | ~98ms | CTS warm avg |

### Cold-start gap breakdown

The 5.8× cold-start gap (Optic 3,928ms vs CTS 662ms = 3,266ms overhead) breaks down as:

| Component | Estimated cost | Source |
|---|---|---|
| Plan optimization (prepare/optimize) | ~3,818ms | Theory E phase timing |
| IRI resolution (cts.values × 3 keywords) | ~134ms | Theory E phase timing (49K IRIs total) |
| Plan build (Optic API calls) | ~38ms | Theory E phase timing |
| Execution | ~302ms | Theory E phase timing (cold caches) |

**The plan optimization cost (3.8s) is 97% of the cold-start overhead.** This is the optimizer processing the plan AST which contains 49K IRI literals embedded in `cts.tripleRangeQuery` objects. Each distinct keyword query produces a unique plan that cannot be reused.

## Benchmark Templates

Reusable benchmark templates for the team:
- CTS: [/scripts/performance/benchmark-template-cts.js](/scripts/performance/benchmark-template-cts.js)
- Optic: [/scripts/performance/benchmark-template-optic.js](/scripts/performance/benchmark-template-optic.js)

**Do not call `plan.prepare()` in Optic benchmarks.** MarkLogic caches optimized plans automatically. Calling `prepare()` forces re-optimization on every invocation, adding ~140ms per warm run and producing results that do not reflect production. The production code does not call `prepare()`. See the Optic template header for details.

## Ideas from Previous Analysis

The following ideas were identified in earlier analysis (pre-Optic migration) and are not yet covered by the optimization sections below. Source: *LUX Search Criteria Processor Optimizations.docx* within [Optic and CTS Comparison](https://yaleedu.sharepoint.com/:f:/r/sites/MarkLogic/Shared%20Documents/1%20-%20LUX_ML/Optic%20and%20CTS%20Comparison?csf=1&web=1&e=hJ4fdF), along with all of that analysis' scripts and spreadsheets.

1. **Remove Unnecessary Groups** — flatten redundant nested groups of the same type (e.g., OR-in-OR, AND-in-AND) to simplify the plan and enable downstream optimizations.
2. **Selectively Join on IRIs Instead of Fragment IDs** — when IRIs are already in columns, join directly on them instead of going through the IRI lexicon to get fragment IDs. Reduced query 14 from 25s to ~3.5s warm.
3. **Consolidation is Not Always Better** — splitting `op.fromTriples` calls (one per `op.pattern`) can outperform consolidating them into fewer calls. Engineering suspects implicit vs explicit join conditions. MarkLogic-internal ticket MLE-19738.
4. **Semantic Facets** — revert CTS-defined facet configuration back to JSON search grammar when migrating to Optic, eliminating the CTS workaround from the Jan 2025 optimization (ML 365).
5. **ML 113: Resolve non-Hop-Inverse criteria as objects parameter in `cts.triples`** — constrain the objects parameter to reduce the number of triples returned.
6. **Move criteria into Hop with Field term's code** — similar to ML 113 but for `hopWithField`; push additional criteria lower.
7. **Shared `op.fromLexicons` for multiple terms on the same lexicon** — e.g., overlapping date range queries could share one lexicon scan with multiple `.where()` clauses.

## Implemented Optimizations

| Order | Optimization | Summary | Date |
|---|---|---|---|
| 1 | [Opt 3](#optimization-3-reduce-or-eliminate-redundant-datatype-constraints) | Empty-groups: skip redundant dataType constraint on same-scope sub-plans. **More may be possible:** we may be able to remove additional data type constraints but, at present, when nested criteria changes the scope, we need to apply a data type constraint at that level. | 2026-05-31 |
| 2 | [Opt 15](#optimization-15-cts-fold) | CTS Fold: fold CTS-only sub-plans into parent instead of building a join | 2026-05-31 |
| 3 | [Opt 14](#optimization-14-page-slice-hydration) | Page-Slice Hydration: CTS-based page-slice with minimal Optic hydration. **More may be possible:** see the eligibility criteria for details. | 2026-06-02 |
| 4 | [Opt 13](#optimization-13-amp-as-admin) | Amp as Admin: bypass per-document permission checks for tenant-owner requests | 2026-06-03 |
| 5 | [Opt 16](#optimization-16-hopwithfield-cts) | HopWithField CTS: emit `cts.tripleRangeQuery` instead of Optic `fromTriples` join when inner criteria is pure CTS | 2026-06-04 |

## Data Type Constraint Optimizations

The `dataType` constraint (`op.in(op.col('dataType'), [...])`) is a recurring theme across several optimization investigations. This subsection groups the three related efforts: removing redundant constraints (Opt 3), using scope-specific lexicons (Opt 7), and eliminating constraints via scope-specific predicates (Opt 12).

### Optimization 3: Reduce or eliminate redundant dataType constraints

**Status:** Partially implemented — "empty-groups" optimization in `engine.mjs`. Further removal is **blocked** by a memory blowup finding (2026-06-03).

#### Implemented: empty-groups optimization

The engine now skips the `op.in(op.col('dataType'), [...])` constraint on sub-plans when the parent plan already constrains to the same scope. This applies to nested AND/OR/NOT groups that do not cross scope boundaries.

**Where it lives:** `buildCriteriaAccumulator` in `engine.mjs` computes `scopeAlreadyConstrained`:

```javascript
const scopeAlreadyConstrained =
  !isTopLevel && !isMultiScope && parentScope === scope;
```

`createPlanAccumulator` uses this flag to skip emitting the constraint:

```javascript
constraints:
  isMultiScope || scopeAlreadyConstrained
    ? []
    : [op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false))],
```

**Propagation:** The parent passes its scope into recursive `buildCriteriaAccumulator` calls via `parentScope`. In `buildConjunctionJoin`, the condition `parentIsScopeConstrained ? scope : null` determines whether to propagate — `parentIsScopeConstrained` is true when the parent is not a multi-scope plan.

**When it fires:**
- Nested AND/OR/NOT groups processed by `buildConjunctionJoin` → `buildSubOrFold`, where the sub-plan's scope matches the parent's scope.

**When it does not fire:**
- Top-level plans (`isTopLevel = true`).
- Multi-scope plans (`isMultiScope = true`).
- Pattern recursion: `HopInverse` and `HopWithField` call `scp.processCriteria()` without passing `parentScope` (defaults to `null`). Both patterns cross scope boundaries via `termConfig.getTargetScopeName()`, so the parent scope never matches the child scope. Technically a same-scope pattern caller could opt in by passing `parentScope`, but none currently do.

#### Finding: hop-side dataType constraint is required (2026-06-03)

Removing the dataType constraint from hop sub-plans (the inner `fromLexicons` in a `hopWithField` or `hopInverse` pattern) causes MarkLogic to attempt ~8.4 GB of memory, exceeding the host limit and triggering SVC-MEMCANCELED. The constraint acts as an early selectivity filter that prevents the optimizer from materializing the full cross-product of lexicon rows × triple rows.

**Test query:** Agent-scope search with a `hopWithField` joining to item-scope documents filtered by dimension range queries (`itemDepthDimensionValue >= 100 OR itemWidthDimensionValue >= 100`). Scripts in `scratch/performance/extraneousDataTypeConstraints/`.

| Variant | Root lexicon | Root `op.in` | Hop lexicon | Hop `op.in` | Result |
|---|---|---|---|---|---|
| `any-3-dt-wheres` | `anyDataTypeName` | `['Person','Group']` | `anyDataTypeName` | `['DigitalObject','HumanMadeObject']` | **442ms cold, 26ms warm** |
| `any-2-dt-wheres` | `anyDataTypeName` | `['Person','Group']` | `anyDataTypeName` | _(removed)_ | **SVC-MEMCANCELED** (~8.4 GB) |
| `specific-2-dt-wheres` | `agentDataTypeName` | `['Person','Group']` | `itemDataTypeName` | _(removed)_ | **SVC-MEMCANCELED** (~8.4 GB) |
| `specific-3-dt-wheres` | `agentDataTypeName` | `['Person','Group']` | `itemDataTypeName` | `['DigitalObject','HumanMadeObject']` | **SVC-MEMCANCELED** (~8.4 GB) |

**Key observations:**

1. **The hop-side dataType constraint is not redundant.** Without it, the hop's `fromLexicons` scan produces an unconstrained row set that the optimizer cannot efficiently join with the triple pattern, causing memory blowup. This is true even when the hop's CTS `.where()` clause (field range queries) would eventually narrow results — the optimizer plans the lexicon-triple join before considering the CTS filter.
2. **Scope-specific lexicons are worse, not better.** Switching from `anyDataTypeName` to `agentDataTypeName`/`itemDataTypeName` causes SVC-MEMCANCELED even with the `op.in` constraint present (`specific-3-dt-wheres`). The scope-specific lexicons have different cardinality characteristics that apparently lead to a worse join plan. This contradicts the hypothesis in Optimization 7.
3. **The only working variant** uses `anyDataTypeName` for all `fromLexicons` calls with `op.in` constraints on every sub-plan — which is the current production behavior.

**Implications for further dataType removal:**
- The empty-groups optimization (same-scope sub-plans within AND/OR/NOT groups) is safe because those sub-plans share the parent's `fromLexicons` and never introduce their own lexicon scan.
- Hop patterns introduce new `fromLexicons` calls for the target scope. These **must** retain their dataType constraint to avoid memory blowup.
- Any future attempt to remove dataType constraints from hop sub-plans should be validated with memory-intensive queries, not just correctness checks.

### Optimization 7: Use scope-specific dataType lexicons

**Status:** Tested — no gain (Theory K), and now **contradicted** by the 2026-06-03 finding.

`createPlanAccumulator` always uses `cts.fieldReference('anyDataTypeName')` which indexes `/json/type` across all ~44M documents regardless of scope. Each scope has a dedicated, smaller lexicon: e.g., `itemDataTypeName` indexes only `/indexedProperties[dataType = ('HumanMadeObject', 'DigitalObject')]/dataType`. Using the scope-specific lexicon should reduce the lexicon scan cardinality and may improve join strategies. Scope-to-field mapping:

| Scope | Field | JSON path scope |
|---|---|---|
| item | `itemDataTypeName` | `HumanMadeObject`, `DigitalObject` |
| agent | `agentDataTypeName` | `Person`, `Group` |
| concept | `conceptDataTypeName` | `Type`, `Currency`, `Language`, `MeasurementUnit`, `Material` |
| event | `eventDataTypeName` | `Activity`, `Period` |
| place | `placeDataTypeName` | `Place` |
| set | `setDataTypeName` | `Set` |
| work | `workDataTypeName` | `LinguisticObject`, `VisualItem` |

The `anyDataTypeName` lexicon must remain available for multi-scope queries and the `any` scope.

**2026-06-03 update:** The `specific-3-dt-wheres` variant (scope-specific lexicons with all constraints present) caused SVC-MEMCANCELED while the equivalent `any-3-dt-wheres` (anyDataTypeName) ran in 442ms cold / 26ms warm. This indicates that scope-specific dataType lexicons can produce **worse** optimizer plans, not better — likely due to different cardinality estimates that the optimizer uses for join ordering. This optimization should be considered a **non-starter** until there is evidence of a query where scope-specific lexicons help.

### Optimization 12: Scope-specific predicates to eliminate dataType constraints

**Status:** Idea — extends Optimization 3; needs investigation. The 2026-06-03 finding (Optimization 3) adds nuance but does not invalidate this approach.

**Observation:** All lexicons used to resolve search criteria are already search scope–specific (e.g., `itemAnyText`, `agentPrimaryName`). However, the RDF predicates used in `cts.tripleRangeQuery` (e.g., `lux:itemAny`) are currently the only scope-differentiating mechanism on the semantic side. If predicates were also scope-specific — meaning a triple's predicate alone is sufficient to identify the scope — then the explicit `dataType` constraint (`op.in(op.col('dataType'), [...])`) would no longer be needed for filtering. The `dataType` lexicon would only need to appear late in the plan to project each result's type into the output row.

**Why this matters:**
- The `dataType` constraint is applied early in every plan via `constraints[]`, forcing a lexicon scan and join before the selective CTS/triple filters have narrowed the result set (see Optimization 6 plan analysis).
- Removing it as a filter would simplify the plan AST and potentially change join strategies (e.g., eliminating an early scatter-join on the dataType lexicon).
- If implemented, Optimization 7 (scope-specific dataType lexicons) would become obsolete — there would be no dataType constraint to optimize, only a late projection.

**2026-06-03 update:** The Optimization 3 finding shows that naively removing the `op.in` constraint from hop sub-plans causes SVC-MEMCANCELED. This approach would need to ensure that scope-specific predicates provide **equivalent selectivity** to the current `op.in` constraint during plan optimization. The late-join design (moving `dataType` to `collapseToResultRows`) should only be pursued if predicates alone give the optimizer enough information to avoid materializing unconstrained lexicon×triple cross-products.

**Design sketch:**
1. Verify that each scope's predicates are already exclusive (no predicate shared across scopes).
2. If not, introduce scope-specific predicate variants or confirm that field-level scope specificity is sufficient.
3. Move the `dataType` lexicon from `createPlanAccumulator`'s base lexicons to a late join in `collapseToResultRows` — join on fragment after filtering, purely for output projection.
4. Validate that result sets remain identical with the constraint removed.
5. **Critically:** Validate that memory usage does not spike on hop-heavy queries (per the `any-2-dt-wheres` finding).

## Optimization 1: `plan.where()` when scores are not needed

**Status:** Ready to implement.

When `wantScore` is false in `assemblePlan`, the engine already uses `plan.where(ctsQuery)` instead of `op.fromSearch()`. This path is confirmed faster (128ms vs 179ms warm). No code change needed — this path already exists. The optimization is to ensure callers that don't need scoring (e.g., count-only, unsorted, or non-relevance-sorted queries) do not request scores.

## Optimization 2: Combine OR'd keywords into a single pattern instance

**Status:** Proven in standalone scripts during the initial CTS and Optic comparison circa 2024 using ML 11.3.1.  Re-confirmed in 2025 with ML 12.0.0 EA.  Reference: `12.0.0-q07-cts-unfiltered-con` where "con" stands for consolidated (combined).

When the engine encounters multiple keyword terms under an OR conjunction, it currently processes each as a separate pattern `apply()` call. Each call independently resolves IRIs via `cts.values()` and builds its own `cts.tripleRangeQuery`. If combined into a single pattern invocation, the engine could:
- Issue a single `cts.values()` call with a combined word query
- Build a single `cts.tripleRangeQuery` with the union of IRIs
- Reduce the number of CTS query nodes in the plan

This applies to OR'd keywords specifically; AND'd keywords must remain separate (each constrains independently).

## Optimization 4: Reduce keyword pattern IRI payload

**Status:** Non-starter. All sub-options involve unacceptable trade-offs (semantic recall loss, reintroduced sub-plan overhead, API limitations, or data model changes).

## Optimization 5: Remove unused `iri` column from `fromLexicons` for keyword-only queries

**Status:** Idea — needs investigation.

`createPlanAccumulator` always includes `iri: cts.iriReference()` in the lexicon scan. The keyword pattern's `cts.tripleRangeQuery` uses `subjects=[]` (any subject) — it does not reference the `iri` column from the lexicon. For queries composed entirely of keyword terms, the `iri` column adds a lexicon scan dimension that produces no value. Removing it may reduce the row count from `fromLexicons` and simplify downstream joins. Patterns that DO use the `iri` column (e.g., `hopWithField`, `hopInverse`) would still include it. The engine could conditionally omit it when no pattern contributions reference it.

## Optimization 6: Analyze the optimized plan for join strategy issues

**Status:** Complete — plan captured and analyzed.

The actual plan (WGA-actual-plan.xml, captured 2026-05-28) reveals the optimizer's execution structure for the three AND'd keyword query. Key findings:

- **Join strategy:** scatter-join throughout, no bloom filters. The top scatter-join (fromSearch ⋈ lexicon chain) dominates at cost=25,585 out of total plan cost=39,009.
- **`iri` column overhead confirmed:** The optimizer splits `cts.iriReference()` into two lexicon-index scans (one `cast-to-IRI=true`, one `cast-to-IRI=false`), hash-joins them on `frag`, then scatter-joins with the dataType lexicon — yet the iri column is never projected into the output. The uri+iri lexicon reports 43.9M cardinality.
- **dataType constraint placement:** `op.in(dataType, [...])` is pushed down as a join-filter on the dataType lexicon-index (good), but the lexicon is still scanned and joined before fromSearch results are available.
- **from-search selectivity:** 10,105 estimated matching fragments — the CTS query is selective. The cost=7,849 for from-search is reasonable relative to the lexicon chain overhead.

See `scratch/performance/woman-greek-art-memberOf/WGA-actual-plan.xml` for the full plan.

## Optimization 8: Use `op.param` for non-CTS plan parameters

**Status:** Idea — needs investigation.

Optic's [`op.param`](https://docs.marklogic.com/op.param) allows parameterizing plan values so the optimizer can cache and reuse prepared plans across executions that differ only in parameter values. Currently the engine does not use `op.param` anywhere. Every distinct query builds and prepares a new plan from scratch — and `prepare()` costs up to ~1 second cold (3.8s observed for the keyword query with 49K IRIs).

**Limitation:** `op.param` cannot parameterize CTS queries (used in `op.fromSearch` and `plan.where`). Since keyword queries embed resolved IRIs in `cts.tripleRangeQuery`, the CTS query changes with every distinct keyword — so `op.param` cannot help with the dominant `prepare()` cost for keyword-only queries. MarkLogic 12.1 may address CTS query parameterization.

**Where `op.param` can help:** Non-CTS constraints that vary per query, such as:
- The `dataType` constraint: `op.in(op.col('dataType'), op.param('scopeTypes'))` — plans that differ only in scope could share a cached prepared plan.
- Offset/limit values for pagination.
- Sort column references that vary by user selection.
- Pattern join parameters (e.g., hop field values, record link IDs).

Even partial plan caching would reduce `prepare()` overhead for queries that share structural patterns but differ in scope, pagination, or facet selections — especially under concurrent load where diverse queries currently each pay the full prepare penalty.

## Optimization 9: Lazy IRI resolution (pass Sequence, not Array)

**Status:** Tested — no gain (Theory M). `cts.tripleRangeQuery` eagerly materializes all values regardless.

The CTS baseline uses `fn.insertBefore(cts.values(...), 0, sentinel)` — passing a Sequence directly to `cts.tripleRangeQuery` without `.toArray()`. Theory M tested this same approach in the Optic plan.

**Result:** Cold 3,804–3,891ms — identical to baseline (3,855–3,868ms as admin). `cts.tripleRangeQuery` eagerly materializes Sequence arguments into the plan AST regardless of input type. The `.toArray()` call in `Keyword.mjs` is not the source of plan bloat.

## Optimization 10: fromTriples architecture (avoid IRIs in plan AST entirely)

**Status:** Most promising direction — needs Theory N.

Theory D (non-semantic only, no tripleRangeQuery) proved that removing the 49K-IRI CTS query from the plan drops cold-start from 3,855ms to **267ms** (14× faster, actually faster than CTS at 662ms). The semantic `fromTriples` joins were built in Theory D but never wired into the final plan.

**Approach:** Instead of pre-resolving IRIs and embedding them as literals in `cts.tripleRangeQuery`, push the semantic matching into `op.fromTriples` with a `where(cts.fieldWordQuery('referenceName', term))` filter. The optimizer resolves this via indexes during execution without needing to process 49K literal values in the plan AST.

**Design challenge:** Reproducing the OR semantics. Per keyword, a document matches if:
- It matches the text field (`fieldWordQuery`), OR
- It's the subject of a triple (via scope predicate) pointing to an object whose `referenceName` matches

Options under consideration:
1. Per-keyword `op.union()` of text-only matches and fromTriples semantic matches, then intersect across keywords
2. `existsJoin` / `joinLeftOuter` with fromTriples per keyword — keeps non-semantic matches, adds semantic-only matches
3. Two-pass: non-semantic plan for filtering+scoring, then semantic expansion via fromTriples union

**Results so far (Theories N, N2):**

| Theory | Architecture | Cold | Warm | Result count | Notes |
|---|---|---|---|---|---|
| N | (text-AND) ∪ (semantic-AND) | 464ms | 10ms | 127 / 10,105 | Fast but only 1.3% recall — most results match some keywords via text, others via semantic |
| N2 | Per-keyword OR via fromLexicons(iri) union + fromTriples | — | — | — | MEMCANCELED (8.5GB) — 3 × fromLexicons(iri) scanning 43.9M IRIs each |

**Findings:**
- `fromTriples.where(fieldWordQuery('referenceName', term))` is fast: Theory N's Plan B (3 chained `joinInner` with `fromTriples` semantic filters) adds only ~190ms over the non-semantic baseline (464ms vs 270ms).
- Per-keyword OR between CTS text matching and `fromTriples` semantic matching cannot be expressed in a single Optic plan without hitting memory limits or API constraints: `existsJoin` causes SQL-MISMATCH (SPARQL fusion), `fromLexicons(iri)` union causes MEMCANCELED, and union-of-slices grows as 2^N.
- The root cause is that Optic has no native operator to OR a CTS fragment filter with a join-based row filter.

## Optimization 11: MarkLogic enhancement — CTS object filter in `cts.tripleRangeQuery`

**Status:** Idea — to raise with MarkLogic.

The root cause of the cold-start penalty is that `cts.tripleRangeQuery` requires pre-materialized IRI values as its object constraint. For keyword searches, this means resolving all matching IRIs via `cts.values()` (131ms) and then embedding them as literals in the plan AST (49K values), which the Optic optimizer must traverse and cost (3.8s).

**Proposed enhancement:** A variant of `cts.tripleRangeQuery` (or an additional parameter) that accepts a CTS query as the object filter instead of pre-resolved IRIs. For example:

```javascript
// Current: pre-resolve 49K IRIs, embed as literals
const iris = cts.values(cts.iriReference(), null, opts, fieldWordQuery).toArray();
cts.tripleRangeQuery([], predicate, iris, '=', [], weight);

// Proposed: pass the CTS query directly — MarkLogic resolves lazily
cts.tripleRangeQuery([], predicate, fieldWordQuery, '=', [], weight);
// or:
cts.tripleRangeQuery([], predicate, null, '=', [], weight, { objectQuery: fieldWordQuery });
```

**Why this would solve the problem:**
- The plan AST stays compact (a CTS query reference instead of 49K IRI literals).
- The optimizer processes a small, fixed-size plan node regardless of how many objects match.
- MarkLogic resolves the object filter lazily at execution time using its triple and field indexes jointly — the same work it does today, but without the plan AST bloat.
- CTS already does this efficiently: the CTS baseline (662ms cold) uses the same IRI resolution + triple matching but bypasses the Optic optimizer entirely.
- Theory N proved that `fromTriples.where(fieldWordQuery)` handles this resolution in 190ms — the capability exists in the triple index engine.

**Impact:** This single enhancement would eliminate the dominant cold-start cost (3.8s → estimated <500ms based on Theory N) while preserving the current `Keyword.mjs` architecture. It would require only a one-line change in `Keyword.mjs`: removing `.toArray()` and passing the CTS query instead of the IRI array.

## Optimization 13: Amp as Admin

**Status:** Implemented (My Collections feature disabled path only). Design for My Collections support documented in [amp-as-admin-design.md](./amp-as-admin-design.md).

MarkLogic evaluates document permissions for every candidate document when the requesting user is not an admin. For read-only endpoints where the user already has access to every matching document, this overhead is avoidable.

The implementation configures per-endpoint eligibility via `ampAsAdmin` in `endpointsConfig.mjs` (exposed as `endpointConfig.mayAmpAsAdmin()`). The enforcement point is `__handleRequest` in `securityLib.mjs` — the single function all endpoint requests pass through. When the My Collections feature is disabled and the requesting unit is the tenant owner, the request is executed via `libWrapper['execute_with_admin']`, an amp'd function that grants the `admin` role for the duration of the call. This bypasses per-document permission evaluation.

**Why tenant-owner only:** Individual units (service accounts) are restricted to a subset of documents via their permissions. Amping them to admin would expose documents outside their unit's scope.

**Benchmark results** (woman-greek-art, item scope, MarkLogic 12.0.1):

| Metric | Page-Slice only | Page-Slice and Amp as Admin | Difference |
|---|---|---|---|
| Cold avg (n=3) | 1,510 ms | 1,404 ms | −106 ms |
| Cold stddev | 874 ms | 890 ms | — |
| Warm avg (n=10) | 215 ms | 210 ms | −5 ms |
| Warm stddev | 3 ms | 4 ms | — |

The warm-path gain (~5 ms) is modest for this query but expected to compound under concurrent load where permission checks are more expensive.

## Optimization 14: Page-Slice Hydration

**Status:** Implemented. Behind build-time toggle (`searchPageSliceEnabled`), scoped to simple keyword-only searches. See [search-cold-start-mitigation.md](./search-cold-start-mitigation.md) for the full analysis.

For keyword searches, the engine builds a `cts.tripleRangeQuery` containing up to 49K IRI literals. Optic wraps this in a plan AST that the optimizer must walk, cost, and rewrite — taking ~2.4 seconds on a cold cache even though the index has already determined the matches and computed the scores. The page-slice path bypasses this overhead:

1. Build the same CTS query the standard path would build.
2. Execute it directly via `cts.search` (lazy, pre-sorted by relevance).
3. Slice to the requested page (e.g., 20 URIs for page 1).
4. Hand the small slice to a tiny Optic plan whose only job is to attach the `dataType` column.
5. Use `cts.estimate` for the displayed total.

No results are hidden, no scores are altered. The technique works because Optic's only remaining contribution for this class of query is materializing and paginating — work that `cts.search` already does natively.

**Eligibility criteria** — all must be true for the page-slice path to activate:
- All search criteria are keyword terms (no hops, ranges, geospatial, etc.).
- Sort is relevance (the default). `cts.search` returns results pre-sorted by relevance; other sort orders would require full materialization.
- Search scope is not `multi`. Multi-scope searches require per-scope plan assembly.
- The request is for search results, not a facet request. Facets require aggregation over the full result set — page slicing would omit the unsliced documents.
- `pageWith` is not requested. `pageWith` requires locating a specific document's position in the full result set, which is incompatible with slicing.

The page-slice technique is not inherently limited to keyword searches. Any query whose criteria are entirely CTS-expressible (no joins) could benefit. See [Why This Is Not Specific To Keyword Search — And Why We Aren't Applying It Globally](./search-cold-start-mitigation.md#4-why-this-is-not-specific-to-keyword-search--and-why-we-arent-applying-it-globally) for the analysis.

**Benchmark results** (woman-greek-art, item scope, MarkLogic 12.0.1):

| Metric | Standard Optic | Page-Slice | Difference |
|---|---|---|---|
| Cold avg (n=3) | 4,350 ms | 1,562 ms | **−2,788 ms / 2.8× faster** |
| Cold stddev | 302 ms | 877 ms | Higher variance (small n) |
| Warm avg (n=10) | 217 ms | 233 ms | +16 ms (equivalent) |
| Warm stddev | 44 ms | 14 ms | **3× more consistent** |

**5K search performance test:** Neither Opt 13 nor Opt 14 moved the serialized 5K-request test needle. The 5K test's emphasis is being reconsidered: its relative-change metric inflates absolute differences, and it does not mimic end-user activity (back-to-back serialized requests with no pause). The current performance targets are: under 3 seconds for simple search, under 6 seconds for advanced search, and — time permitting — closing the remaining gap to CTS.

## Optimization 15: CTS Fold

**Status:** Implemented.

When a nested conjunction (AND/OR/NOT group) produces a sub-accumulator that contains *only* `ctsConstraints` — no joins, no patternJoins, no andOrSubPlans — the engine folds the CTS query directly into the parent's `ctsConstraints` instead of building a full sub-plan. This eliminates the sub-plan's `fromLexicons` scan, UUID-namespaced columns, and the join back to the parent.

[Optimization 3: Reduce or eliminate redundant dataType constraints](#optimization-3-reduce-or-eliminate-redundant-datatype-constraints) is a prerequisite for this optimization.

Before both:
```javascript
op.fromLexicons().where(dataTypeConstraint).joinInner(op.fromLexicons().where(dataTypeConstraint).where(keywordConstraint))
```

After Optimization 3 and before Optimization 15:
```javascript
op.fromLexicons().where(dataTypeConstraint).joinInner(op.fromLexicons().where(keywordConstraint))
```

After both:

```javascript
op.fromLexicons().where(dataTypeConstraint).where(keywordConstraint)
```

The fold is implemented in `buildSubOrFold` inside `buildConjunctionJoin`. After building the sub-accumulator, `accContainsOnly(acc, 'ctsConstraints')` checks whether the sub contributed only CTS queries. When true, the sub's CTS queries are wrapped per their own `logicType` (via `wrapCtsByLogicType`) and returned as a `{ ctsConstraint }` that the parent pushes into its own `ctsConstraints` array. The parent's assembly then wraps all its `ctsConstraints` together — the folded sub's query becomes a peer of the parent's other CTS queries with no join involved.

Folding is eligible when the parent `logicType` is `and` or `or`. NOT parents are excluded because negation composition (inverting the sub's logic) is not a simple peer push. A `negateFold` flag handles the AND-encounters-NOT case: the engine rewrites `{ NOT: [...] }` as `{ OR: [...] }` for the sub-plan, and when the sub folds, wraps the result as `cts.notQuery(...)` to preserve negation semantics.

The optimization fires for the common case of nested groups whose children are all CTS-expressible patterns (keyword, indexedWord, geospatial, etc.). It does not fire when any child contributes a patternJoin (e.g., hop patterns) or a nested conjunction that itself requires a join.

## Optimization 16: HopWithField CTS

**Status:** Implemented.

**Prerequisite:** [Opt 15 (CTS Fold)](#optimization-15-cts-fold) must be in place — the fold mechanism is what makes inner criteria produce pure-CTS accumulators.

When a non-transitive `hopWithField` term's inner criteria resolves to pure CTS, the pattern emits `cts.tripleRangeQuery` as a `ctsConstraint` instead of building an Optic `fromTriples` join. This eliminates the `fromTriples` row source, the `joinInner` to the field plan, and the `joinInner` back to the base plan.

Before (Optic join):
```javascript
op.fromLexicons(...)
  .where(dataTypeConstraint)
  .joinInner(
    op.fromTriples([pattern(s, predicates, o)])
      .joinInner(op.fromSearch(cts.andQuery(innerCts))),
    op.on(iri, s)
  )
```

After (CTS path):
```javascript
op.fromLexicons(...)
  .where(dataTypeConstraint)
  .where(
    cts.tripleRangeQuery(
      [],
      expandPredicates(predicates),
      fn.insertBefore(
        cts.values(cts.iriReference(), '', ['eager', 'concurrent'], innerCts),
        0, sem.iri('/does/not/exist')
      ),
      '=', [], 1
    )
  )
```

The `cts.values(cts.iriReference(), ..., innerCts)` call resolves the set of document IRIs matching the inner CTS query, and `cts.tripleRangeQuery` constrains the parent to documents whose triples have one of those IRIs as the object. The `sem.iri('/does/not/exist')` sentinel is prepended via `fn.insertBefore` because `cts.tripleRangeQuery` requires at least one value when the object argument is a Sequence.

**Implementation:** Three paths in `#processHopWithFieldTerm`:
1. **Id-leaf** (`childId` is set, no `termValue`): wraps `cts.documentQuery(childId)` inside `cts.values`.
2. **Nested pure-CTS** (no `termValue`, no `childId`): calls `scp.processCriteriaAsCts()` — if it returns non-null, wraps the result inside `cts.values`.
3. **Fallback**: original Optic `fromTriples` + `joinInner` path.

`processCriteriaAsCts` (added to `engine.mjs`) is a variant of `processCriteria` that builds the inner accumulator with `parentScope: planScope` (to skip the dataType constraint) and returns the CTS query only if `accContainsOnly(acc, 'ctsConstraints')` is true.

**Scope:** Non-transitive `hopWithField` terms without `idIndexReferences`. Terms with `idIndexReferences` are rewritten to `IndexedValue` by the engine before `HopWithField.apply()` is called. Transitive terms always use SPARQL embedding.

**5k pattern analysis:** This optimization resolves the majority of severe regressions identified in `scratch/5k-pattern-analysis.md`. The most common regression shape — a single `hopWithField` with `{ id: IRI }` inner criteria on a term lacking `idIndexReferences` — is fully covered by the id-leaf path.

**Benchmark (Shape 2, MarkLogic 12.0.1):** `OR(classification{OR}, language{OR}, aboutConcept{id})` — three hops, two of which use the CTS path.

| Metric | Baseline | Optimized | Improvement |
|---|---|---|---|
| Cold avg (ms) | 1,699 | 344 | ~5× faster |
| Cold min (ms) | 401 | 287 | 1.4× |
| Cold max (ms) | 4,290 | 457 | 9.4× |
| Cold stddev | 1,832 | 80 | 23× less variance |
| Warm avg (ms) | 45 | 2 | ~22× faster |
| Warm min (ms) | 43 | 1 | 43× |
| Warm max (ms) | 53 | 2 | 26× |

**5k performance test results (5,000 searches, MarkLogic 12.0.1):** Unlike previous optimizations, Opt 16 moved the 5k performance test needle. Compared against the Optic baseline without Opt 16, p90 and p95 improved ~30% while p50 was unchanged (those searches don't hit HopWithField). p99/p99.9 regressed, likely due to cold-start variance in the small tail population.

*Optic with Opt 16 vs. Optic without Opt 16:*

| Percentile | Baseline (ms) | Current (ms) | Change (ms) | Relative Change |
|---|---|---|---|---|
| p50 | 176 | 176 | +0 | +0% |
| p90 | 297 | 196 | -101 | -34% |
| p95 | 309 | 216.65 | -92.35 | -29.9% |
| p99 | 349.93 | 502.93 | +153 | +43.7% |
| p99.9 | 940.95 | 1,002.69 | +61.73 | +6.6% |

The remaining gap to CTS is concentrated in the median — searches that don't benefit from Opt 16 (keyword-only, `indexedValue`, etc.) still carry the Optic overhead. Searches that do benefit (p90–p95 range) are approaching CTS latency.

*Optic with Opt 16 vs. CTS baseline:*

| Percentile | CTS Baseline (ms) | Optic Current (ms) | Change (ms) | Relative Change |
|---|---|---|---|---|
| p50 | 32 | 176 | +144 | +450% |
| p90 | 46 | 196 | +150 | +326.1% |
| p95 | 54 | 216.65 | +162.65 | +301.2% |
| p99 | 132.55 | 502.93 | +370.38 | +279.4% |
| p99.9 | 285.6 | 1,002.69 | +717.09 | +251.1% |
