## **LUX Optic Search Engine Primer**

- [Introduction](#introduction)
- [System Architecture](#system-architecture)
  - [Two-Pass Criteria Pipeline](#two-pass-criteria-pipeline)
  - [Request Flow](#request-flow)
    - [Engine Entry Points](#engine-entry-points)
  - [Key Source Files](#key-source-files)
- [Pass 1: `analyzeCriteria` — Analysis and the Criteria Tree IR](#pass-1-analyzecriteria--analysis-and-the-criteria-tree-ir)
  - [Criteria Tree Data Model](#criteria-tree-data-model)
    - [`AnalysisResult` — top-level return value](#analysisresult--top-level-return-value)
    - [`GroupNode` — conjunction (AND/OR/NOT)](#groupnode--conjunction-andornot)
    - [`LeafNode` — single search term](#leafnode--single-search-term)
    - [Example tree](#example-tree)
  - [`analyzeCriteria` Flow](#analyzecriteria-flow)
  - [Key Helpers](#key-helpers)
    - [`parseCriteriaAndLogicType`](#parsecriteriaandlogictype)
    - [`analyzeConjunction`](#analyzeconjunction)
    - [`buildLeafSearchTerm`](#buildleafsearchterm)
    - [`tokenizeTermValue`](#tokenizetermvalue)
  - [Normalization Guarantees](#normalization-guarantees)
- [Pattern System](#pattern-system)
  - [Self-Registration on SearchPatternBase](#self-registration-on-searchpatternbase)
  - [Pattern Interface Contract](#pattern-interface-contract)
  - [Registered Patterns](#registered-patterns)
  - [Pattern Contributions](#pattern-contributions)
- [MarkLogic Optic API Reference](#marklogic-optic-api-reference)
- [Engine Internals](#engine-internals)
  - [The Three Constraint Buckets](#the-three-constraint-buckets)
    - [Bucket Selection Rule](#bucket-selection-rule)
  - [Nested Conjunction Handling — The 7-Case Matrix](#nested-conjunction-handling--the-7-case-matrix)
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
    - [LLM Kickoff](#llm-kickoff)
      - [Example Performance Investigation Prompt](#example-performance-investigation-prompt)
      - [Example Project Context Prompt](#example-project-context-prompt)
  - [Theory Index](#theory-index)
  - [Isolated Benchmark Reference (MarkLogic 12.0.1)](#isolated-benchmark-reference-marklogic-1201)
    - [Key findings](#key-findings)
    - [Warm-run gap breakdown](#warm-run-gap-breakdown)
    - [Cold-start gap breakdown](#cold-start-gap-breakdown)
  - [Benchmark Templates](#benchmark-templates)
  - [Ideas from Previous Analysis](#ideas-from-previous-analysis)
  - [Ideas Above the Backend](#ideas-above-the-backend)
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
  - [Optimization 14: Page-Slice Hydration (Abandoned)](#optimization-14-page-slice-hydration-abandoned)
  - [Optimization 15: CTS Fold](#optimization-15-cts-fold)
  - [Optimization 16: HopWithField CTS](#optimization-16-hopwithfield-cts)
  - [Optimization 17: Select barrier on nested sub-plans](#optimization-17-select-barrier-on-nested-sub-plans)
    - [Benchmark (MarkLogic 12.0.1)](#benchmark-marklogic-1201)
    - [Analysis](#analysis)
  - [Optimization 18: cts.estimate with offset/limit for join-free queries](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries)
    - [Problem](#problem)
    - [When cts.estimate with offset/limit applies](#when-ctsestimate-with-offsetlimit-applies)
    - [Pattern CTS Conversions](#pattern-cts-conversions)
    - [Benchmark (MarkLogic 12.0.1)](#benchmark-marklogic-1201-1)
    - [Key findings](#key-findings-1)
  - [Optimization 19: DataType-split estimate for non-CTS-foldable searches](#optimization-19-datatype-split-estimate-for-non-cts-foldable-searches)
    - [Problem](#problem-1)
    - [Observation](#observation)
    - [Design sketch](#design-sketch)
    - [Scope leakage](#scope-leakage)
    - [Constraints](#constraints)
  - [Optimization 20: Eliminate fromLexicons for join-free queries](#optimization-20-eliminate-fromlexicons-for-join-free-queries)
    - [Problem](#problem-2)
    - [Approach](#approach)
    - [Eligibility](#eligibility)
    - [Implementation summary](#implementation-summary)
    - [What this does NOT address](#what-this-does-not-address)
    - [Benchmark](#benchmark)
      - [Prototype (single query, MarkLogic 12.0.1)](#prototype-single-query-marklogic-1201)
      - [10k-3 performance test (2026-06-28, commit 2211d13)](#10k-3-performance-test-2026-06-28-commit-2211d13)
    - [Relationship to other optimizations](#relationship-to-other-optimizations)
  - [Optimization 21: CTS-native facet computation](#optimization-21-cts-native-facet-computation)
    - [Problem](#problem-3)
    - [Validation results](#validation-results)
      - [Non-semantic facets (`itemTypeId`, 55K matches, `cts.fieldWordQuery('itemAnyText', 'painting')`)](#non-semantic-facets-itemtypeid-55k-matches-ctsfieldwordqueryitemanytext-painting)
      - [Semantic facets (`responsibleCollections`, 2.5M matches)](#semantic-facets-responsiblecollections-25m-matches)
      - [Performance test results (2026-07-03)](#performance-test-results-2026-07-03)
    - [Implementation](#implementation)
      - [`performSearch` execution paths (engine.mjs)](#performsearch-execution-paths-enginemjs)
      - [`calculateFacets` dispatch (calculateFacets.mjs)](#calculatefacets-dispatch-calculatefacetsmjs)
      - [Semantic facet configuration (semanticFacetsConfig.mjs)](#semantic-facet-configuration-semanticfacetsconfigmjs)
      - [Source files](#source-files)
  - [Optimization 22: annTopK post-filter for HNSW index usage](#optimization-22-anntopk-post-filter-for-hnsw-index-usage)
    - [Problem](#problem-4)
    - [Root cause](#root-cause)
    - [Benchmark (2026-06-29)](#benchmark-2026-06-29)
    - [Fix](#fix)
    - [When Opt 22 applies](#when-opt-22-applies)
    - [Limitations](#limitations)
    - [Additional engine optimization](#additional-engine-optimization)
  - [Optimization 23: Scope-specific QBVs for annTopK graph partitioning](#optimization-23-scope-specific-qbvs-for-anntopk-graph-partitioning)
    - [Problem](#problem-5)
    - [Approach](#approach-1)
    - [Constraints](#constraints-1)
    - [Open question](#open-question)
    - [Next step](#next-step)
  - [Optimization 24: HopInverse CTS fast path](#optimization-24-hopinverse-cts-fast-path)
    - [Problem](#problem-6)
    - [Why HopInverse cannot use cts.tripleRangeQuery](#why-hopinverse-cannot-use-ctstriplerangequery)
    - [Approach](#approach-2)
    - [Implementation](#implementation-1)
    - [Benchmark](#benchmark-1)
      - [Single query](#single-query)
      - [10k performance test (2026-07-05)](#10k-performance-test-2026-07-05)
    - [Scope and limitations](#scope-and-limitations)

# Introduction

The LUX backend uses MarkLogic's Optic API to build relational-style query plans (lexicon scans, triple joins, CTS filters) from a JSON search criteria grammar. This document covers the architecture, pattern system, engine internals, and operational lessons needed to work in this codebase.

It is for developers and LLMs working on or extending the LUX Optic search engine.

---

# System Architecture

## Two-Pass Criteria Pipeline

Search criteria processing is split into two passes with an intermediate representation (the **criteria tree**) between them:

| Pass | Module | Responsibility | Output |
|---|---|---|---|
| **Pass 1** — Analysis | `analyzeCriteria.mjs` | Traverse raw JSON criteria, validate, normalize, tokenize, detect stop words, resolve patterns. No Optic API calls. | Frozen criteria tree + analysis summary |
| **Pass 2** — Construction | `engine.mjs` | Walk the criteria tree, call `pattern.apply()`, collect accumulator buckets, build Optic plan. | Executable Optic plan |

**Why two passes:**
- Engine-level optimizations become possible — the engine can inspect the full criteria tree (structure, scoring flags, join-free status) before building the plan, enabling strategy decisions like Opt 18/20 that require global knowledge unavailable during incremental construction.
- Patterns can know more about the search criteria/request than just their own search term. The analysis result exposes scope, scoring status, and tree shape to Pass 2 callers.
- Separation of concern — validation/normalization logic is isolated from plan construction. Optimizations can be implemented in the ideal location rather than being forced by execution order.
- The criteria tree is an immutable, inspectable artifact: useful for testing, debugging, and future analysis (e.g., query complexity estimation).
- Same-type nesting (AND-in-AND, OR-in-OR) is eliminated during analysis. Pass 2 never encounters it — reducing the 3×3 conjunction matrix to 7 cases and preventing a class of inlining bugs.
- Score-contributing status is computed once per node and frozen. Pass 2 reads it without re-traversal, eliminating propagation bugs.

## Request Flow

```
Endpoint handler
  └─ SearchCriteriaProcessor (SCP)
       ├─ prepare()                    ← configures scope, criteria, options
       ├─ execute()                    ← full search: plan + results
       │    └─ engine.performSearch(scp)
       │         └─ engine.buildPlans(...)             [top-level entry point]
       │              ├─ Pass 1: analyzeCriteria(...)         ← produces criteria tree
       │              │    └─ buildLeafSearchTerm(...)        ← validates, resolves pattern, tokenizes
       │              │    └─ analyzeConjunction(...)         ← flattens same-type nesting
       │              ├─ Pass 2: buildAccumulator(...)        ← walks tree, calls pattern.apply()
       │              │    └─ buildConjunction(...)           ← resolves 7-case matrix (sub-groups)
       │              │    └─ pattern.apply(...)              ← may call processNestedCriteria ↓
       │              ├─ assemblePlan(...)                    ← builds Optic plan from accumulator
       │              └─ collapseToResultRows(...)            ← groupBy, sort, select
       │         └─ plan.limit() if pageWith                 ← caps materialization
       │         └─ plan.result().toArray()                   ← executes plan
       │         └─ engine.paginateResults(...)               ← resolves page (normal or pageWith)
       ├─ executeForValues()           ← related lists: values only, no Optic plan
       │    └─ engine.traverseCriteria(...)            [side-effects-only entry point]
       │         ├─ Pass 1: analyzeCriteria(...)
       │         └─ Pass 2: buildAccumulator(...)             ← fires pattern.apply() for side effects
       │              (no assemblePlan — no plan built or returned)
       └─ buildPlans(...)              ← developer tool: returns plans without executing
```

### Engine Entry Points

The engine exports three entry points that each use the two-pass pipeline differently. Understanding which one is called — and why — prevents confusion about where plans are built vs. where side effects fire.

| Entry point | Called by | Pass 1 | Pass 2 | Plan built? | Returns |
|---|---|---|---|---|---|
| `buildPlans` | `performSearch` (top-level) | Yes | Yes + `assemblePlan` + `collapseToResultRows` | Yes — full plan with finalization | `{ sortedResultsPlan, unsortedResultsPlan, scopedCtsQuery, selectedPlan, ctsExecutionEligible, isFromSearchPlan }` |
| `processNestedCriteria` | Pattern classes (`HopWithField`, `HopInverse`) | Yes | Yes + `assemblePlan` + select barrier | Yes — sub-plan projected to `[iriCol, fragCol]` | Optic plan (two columns) |
| `processNestedCriteriaAsCts` | `HopWithField` (CTS optimization path) | Yes | Yes (accumulator only) | No — returns CTS query or null | `ctsQuery \| null` |
| `traverseCriteria` | `SCP.executeForValues()` (related lists) | Yes | Yes (accumulator only) | No — side effects only | `undefined` |

**Key distinction:** `buildPlans` is the top-level entry — it calls `collapseToResultRows` (groupBy + sort + select) to produce the final result shape. `processNestedCriteria` is for sub-plans within a pattern — it calls `assemblePlan` but applies a select barrier (`.select([iriCol, fragCol])`) instead of finalization, because the caller will join the sub-plan into a larger plan. `traverseCriteria` skips plan construction entirely — it only runs the pipeline so that `pattern.apply()` can fire side effects like `scp.appendValues()`.

Patterns that navigate to a nested scope (e.g., `HopWithField` processing the inner `{ producedBy: { id: ... } }`) call `scp.processNestedCriteria()`, which re-enters the engine: Pass 1 analyzes the inner criteria into its own criteria tree, Pass 2 walks that tree and builds a sub-plan, and the select barrier projects it down before returning it to the pattern's join logic.

## Key Source Files

| File | Purpose |
|---|---|
| `lib/SearchCriteriaProcessor.mjs` | Orchestrator. `prepare()` → `execute()` / `executeForValues()` / `buildPlans()`. Holds search state. |
| `lib/search/analyzeCriteria.mjs` | **Pass 1.** Traverses raw criteria JSON, validates, normalizes, and produces the frozen criteria tree. No Optic API calls. |
| `lib/search/criteriaNodes.mjs` | Node factories and type constants for the criteria tree (`createLeafNode`, `createGroupNode`, `createAnalysisResult`). |
| `lib/search/engine.mjs` | **Pass 2 + orchestration.** Entry points: `performSearch`, `buildPlans` (top-level), `processNestedCriteria` (sub-plans with select barrier), `processNestedCriteriaAsCts` (CTS-only sub-plans), `traverseCriteria` (side-effects only). Internals: `buildAccumulator`, `buildAccumulatorFromGroup`, `assemblePlan`, `collapseToResultRows`, `paginateResults`. |
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

# Pass 1: `analyzeCriteria` — Analysis and the Criteria Tree IR

`analyzeCriteria` ([analyzeCriteria.mjs](/src/main/ml-modules/root/lib/search/analyzeCriteria.mjs)) is the sole Pass 1 entry point. It accepts raw search criteria JSON and produces an immutable **criteria tree** — the intermediate representation (IR) that Pass 2 consumes. No Optic API calls are made; this is pure validation, normalization, and tree construction.

**Scope boundary:** `analyzeCriteria` processes criteria within the current search scope only. When a hop pattern's criteria contains nested criteria targeting a different scope (e.g., `{ memberOf: { aboutConcept: { name: "blue" } } }` — `memberOf` is in item scope but its inner criteria targets set scope), the nested object is stored as-is on the leaf's `SearchTerm`. It is **not** recursively analyzed during this invocation. Instead, it gets its own `analyzeCriteria` call during Pass 2, when the pattern's `apply()` method invokes `processNestedCriteria` or `processNestedCriteriaAsCts`.

This means top-level analysis flags — `hasScoreContributingCriteria`, `usableLeafCount` — reflect only the outer scope's criteria. A scoring leaf inside a nested hop (e.g., a keyword term inside a `memberOf` sub-criteria) will not be visible to the top-level result. This is sufficient for current engine optimizations (Opt 1/18/20), which use only top-level flags. If a future optimization requires cross-scope visibility, a deeper pre-scan could be added to `analyzeCriteria` without changing its return type.

## Criteria Tree Data Model

All nodes are created via factory functions in [criteriaNodes.mjs](/src/main/ml-modules/root/lib/search/criteriaNodes.mjs) and frozen with `Object.freeze`.

### `AnalysisResult` — top-level return value

| Property | Type | Description |
|---|---|---|
| `criteriaTree` | `GroupNode` | Root of the criteria tree (always a group, even for single-leaf queries) |
| `scope` | `string` | Resolved scope name (`'item'`, `'agent'`, etc.) |
| `isMultiScope` | `boolean` | `true` when `_scope: 'multi'` |
| `hasScoreContributingCriteria` | `boolean` | `true` if any leaf **in the current scope** contributes relevance scores. Leaves inside nested hop criteria (different scope) are not reflected — see scope boundary above. |
| `usableLeafCount` | `number` | Leaves that survived stop-word/validation checks |

### `GroupNode` — conjunction (AND/OR/NOT)

| Property | Type | Description |
|---|---|---|
| `type` | `'group'` | Node type discriminator (`NODE_TYPE_GROUP`) |
| `id` | `string \| null` | UUID (dashes→underscores). `null` for the top-level group. |
| `conjunctionType` | `'and' \| 'or' \| 'not'` | Boolean context of this group |
| `scope` | `string` | Scope name for this group's children |
| `children` | `(GroupNode \| LeafNode)[]` | Frozen array of child nodes |
| `columns` | `{ uriCol, fragCol, iriCol, dataTypeCol }` | Column names for Pass 2 plan construction |
| `isTopLevel` | `boolean` | `true` only for the root group |
| `hasScoreContributingCriteria` | `boolean` | Propagated upward — `true` if any descendant contributes scores |

### `LeafNode` — single search term

| Property | Type | Description |
|---|---|---|
| `type` | `'leaf'` | Node type discriminator (`NODE_TYPE_LEAF`) |
| `id` | `string` | UUID (dashes→underscores) |
| `name` | `string` | Search term name (e.g. `'text'`, `'producedBy'`, `'classification'`) |
| `scope` | `string` | Scope name |
| `searchTerm` | `SearchTerm` | Carries value, config, options, parent columns, runtime properties |
| `patternInstance` | `SearchPatternBase` | Frozen singleton from the pattern registry |
| `contributesScore` | `boolean` | `patternInstance.contributesRelevanceScore()` |

### Example tree

Input:
```json
{ "_scope": "item", "AND": [{ "text": "Pablo" }, { "producedBy": { "id": "https://..." } }] }
```

Output (conceptual):
```
GroupNode { conjunctionType: 'and', isTopLevel: true, hasScoreContributingCriteria: true }
├── LeafNode { name: 'text', contributesScore: true, patternInstance: Keyword }
└── LeafNode { name: 'producedById', contributesScore: false, patternInstance: IndexedValue }
```

Note: `producedBy: { id }` was rewritten to `producedById` with the `indexedValue` pattern via the `idIndexReferences` shortcut (see `buildLeafSearchTerm`).

## `analyzeCriteria` Flow

The function uses a **dynamic loop** — new entries can be pushed into the `criteria` array during iteration (by tokenization and conjunction inlining). The loop processes each criterion through one of four branches:

```
for each criterion in criteria[]:
  ├─ Is conjunction (AND/OR/NOT)?
  │    └─ analyzeConjunction(...)
  │         ├─ Same-type nesting? → { inlineCriteria } → push children, continue
  │         ├─ Sub-group empty?   → { skip: true } → continue
  │         └─ Otherwise          → { groupNode } → push to children[]
  │
  └─ Is leaf term?
       └─ buildLeafSearchTerm(...)
            ├─ Not usable (stop word)?   → continue
            ├─ Tokenizable (multi-word)? → push { AND: tokens } back into criteria[], continue
            └─ Valid leaf                 → push LeafNode to children[]
```

After the loop completes, two post-processing steps fire:

1. **Single-branch OR→AND collapse:** If the group is `'or'` but has only one usable branch, it becomes `'and'`. This avoids `joinFullOuter` for degenerate single-branch ORs.

2. **Post-collapse re-flattening:** After the OR→AND rewrite, a surviving child group whose `conjunctionType` matches the new parent type is inlined (children promoted). This guarantees same-type nesting never reaches Pass 2.

Finally, the function creates and returns the frozen `GroupNode` wrapped in an `AnalysisResult`.

## Key Helpers

### `parseCriteriaAndLogicType`

Extracts the criteria array and logic type from raw input JSON. Deep-copies via `xdmp.toJSON(...).toObject()` because the dynamic loop may mutate the array (tokenization/inlining push new entries).

| Input shape | `logicType` | `criteria` |
|---|---|---|
| `{ AND: [...] }` | `'and'` | deep copy of the array |
| `{ OR: [...] }` | `'or'` | deep copy of the array |
| `{ NOT: [...] }` | `'not'` | deep copy of the array |
| `{ text: "Pablo" }` (bare term) | `'and'` | `[deep copy of the object]` |

### `analyzeConjunction`

Handles nested conjunction criteria within the parent's loop. Three possible outcomes:

| Condition | Return | Effect |
|---|---|---|
| Same-type nesting (AND-in-AND, OR-in-OR) | `{ inlineCriteria: [...] }` | Parent pushes raw children into its own loop — they'll be analyzed as if they were siblings |
| Sub-group produced no usable criteria (all stop words) | `{ skip: true }` | Parent skips this child entirely |
| Otherwise | `{ groupNode }` | Recursively calls `analyzeCriteria` with a new `parentId`, returns the frozen sub-tree |

The inlining path is why `criteria` must be a mutable array — same-type children are appended and processed in subsequent loop iterations.

### `buildLeafSearchTerm`

Constructs a `SearchTerm` instance for a single criterion. This is the heaviest helper — it performs all leaf-level processing:

1. **Config resolution.** Looks up `SearchTermConfig` for the term name in the current scope.
2. **Runtime properties.** Extracts `_`-prefixed keys from the criterion (e.g., `_comp: '>='`) and attaches them as properties.
3. **Pattern requirement validation.** Checks that all `getRequiredRuntimeSearchTermProperties()` are present.
4. **Value-type validation.** Confirms the pattern accepts the structural type of the value (atomic, term, or group).
5. **`idIndexReferences` rewrite.** If the value is `{ id: IRI }` and the term config has `idIndexReferences` (and is not transitive), rewrites the term to use the `indexedValue` pattern with `forceExactMatch`. This is a major optimization — it converts a hop pattern into a direct field lookup.
6. **Scalar type casting.** If `termConfig.scalarType` is set (e.g., `'long'`), casts the value via `xs[scalarType](value)`.
7. **Search options resolution.** Resolves keyword/exact options from config, request overrides, and instance overrides.
8. **Wildcard sanitization.** For keyword-type terms with `*` or `?`, consolidates redundant wildcards and validates minimum qualifying character count (≥3 non-wildcard chars adjacent to the wildcard).
9. **Stop-word detection.** If all words in the value are stop words or punctuation-only, marks the term as unusable and records the ignored terms on the SCP.

### `tokenizeTermValue`

Splits multi-word string values into individual AND'd terms. Called for patterns where `mayTokenizeValue()` returns `true` (primarily `keyword`/`indexedWord`).

**Guards** (returns `null` if any are true):
- Value is not a string
- Term is marked `_complete` (exact phrase match)
- Term is already `_tokenized` (prevents infinite recursion)
- Pattern does not allow tokenization
- Value has no spaces, or is a quoted phrase (`"..."` or `'...'`)
- `splitHonoringPhrases` produces ≤1 token

**When it fires:** Returns `{ AND: [{ termName: token1, _tokenized: true }, ...], _scope }`. The caller pushes this conjunction back into the `criteria` array — on the next loop iteration, `analyzeConjunction` will inline the AND (same-type flattening), and each token will be processed as an independent leaf.

**Example:** `{ text: "woman greek art" }` → `{ AND: [{ text: "woman", _tokenized: true }, { text: "greek", _tokenized: true }, { text: "art", _tokenized: true }] }`

## Normalization Guarantees

After `analyzeCriteria` completes, the criteria tree satisfies these invariants:

| Guarantee | Mechanism |
|---|---|
| No same-type nesting (AND-in-AND, OR-in-OR) | `analyzeConjunction` inlines same-type children; post-loop re-flattening catches any introduced by OR→AND collapse |
| No single-branch OR groups | OR with one usable branch is collapsed to AND |
| All leaves are valid and usable | Stop words, punctuation-only, and invalid wildcards are filtered out |
| Multi-word values are tokenized | `tokenizeTermValue` splits them into AND groups before leaf creation |
| `hasScoreContributingCriteria` propagates upward | `||=` accumulates from children to parent; frozen on each node. Propagation is within the current scope only — nested hop criteria (different scope) is deferred to Pass 2. |
| `idIndexReferences` rewrites are applied | Hop terms with `{ id }` children become `indexedValue` lookups |
| Tree is immutable | All nodes frozen via `Object.freeze` |
| Column names are unique per nesting level | UUID-based prefixes for non-top-level columns |

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

## Nested Conjunction Handling — The 7-Case Matrix

Pass 1 (`analyzeCriteria`) eliminates same-type nesting: AND-in-AND and OR-in-OR children are flattened into the parent's children array before the criteria tree is frozen. Pass 2 therefore never encounters those cases. The remaining 7 combinations are resolved by `buildConjunction` in `engine.mjs`:

| Parent \ Child | AND | OR | NOT |
|---|---|---|---|
| **AND** | _(eliminated by Pass 1)_ | Deferred sub-plan (combined in `assemblePlan`) or CTS fold | `notExistsJoin` on `{ OR: child.NOT }` rewrite, or CTS fold |
| **OR** | `joinFullOuter` on child sub-plan, or CTS fold | _(eliminated by Pass 1)_ | `joinFullOuter` on child sub-plan, or CTS fold |
| **NOT** | `notExistsJoin` on child sub-plan, or CTS fold | `notExistsJoin` on child sub-plan, or CTS fold | `joinInner` on `{ OR: child.NOT }` (double negation), or CTS fold |

**CTS fold** ([Opt 15](#optimization-15-cts-fold)): Every case first checks whether the sub-group's accumulator is pure CTS (no joins). If so, the sub's CTS query is folded directly into the parent's `ctsConstraints[]` — no sub-plan, no join. The fold is the common path for groups whose children are all CTS-expressible patterns.

**AND-encounters-OR** (when not foldable): sub-plans are accumulated and combined off the outer fragment in `assemblePlan`. Chaining 2+ directly as `joinInner` against the same outer fragment triggers SPARQL fusion that silently zeroes results or blows memory.

## Column Naming Strategy

Every `buildAccumulatorFromGroup` call receives a scope and optional `parentId`. Columns are namespaced to prevent collisions:

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

After resolving a search term's config and pattern, Pass 1 performs three categories of validation before constructing the leaf node:

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

This logic lives in `analyzeCriteria.mjs` (`sanitizeAndValidateWildcardedStrings`). `SCP` exposes a static pass-through for use by other modules (e.g., autocomplete).

### Stop-word and punctuation-only detection

Terms composed entirely of stop words (e.g., "a the and") or punctuation-only characters are marked unusable and added to the SCP's ignored terms list. If all criteria are unusable, an error is thrown. Detection is handled by `getUnusableTermWords()` in `analyzeCriteria.mjs`.

---

# Pattern Details

## Bucket Decisions by Pattern

| Pattern | AND | OR/NOT | Notes |
|---|---|---|---|
| `indexedValue` | `constraints[]` + lexicon (`op.eq`) | `ctsConstraints[]` (`cts.fieldValueQuery`) | Exact-match on `indexReferences[0]`. |
| `indexedWord` + `_complete` | `constraints[]` + lexicon (`op.eq`) | `ctsConstraints[]` (`cts.fieldValueQuery`) | Requires range index. |
| `indexedWord` (no `_complete`) | `ctsConstraints[]` | Same as AND | Word queries always use CTS — no Optic-native stemming/wildcards. |
| `indexedRange` | `ctsConstraints[]` (`cts.fieldRangeQuery`) | Same as AND | Converted from Optic comparators to CTS for CTS Fold ([Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries)) and cts.estimate/offset-limit ([Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries)) eligibility. |
| `dateRange` | `ctsConstraints[]` (`cts.fieldRangeQuery`) | Same as AND | Converted from Optic column comparisons to CTS for CTS Fold ([Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries)) and cts.estimate/offset-limit ([Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries)) eligibility. |
| `documentId` / `iri` | `ctsConstraints[]` (`cts.documentQuery`) | Same as AND | Converted from `op.eq(uriCol, v)` to CTS for CTS Fold ([Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries)) and cts.estimate/offset-limit ([Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries)) eligibility. |
| `keyword` | `ctsConstraints[]` | Same as AND | Always CTS — combines non-semantic field query OR semantic triple-range query. |
| `geospatial` | `ctsConstraints[]` | Same as AND | CTS geospatial queries. |
| `hopWithField` | `patternJoins[]` or `ctsConstraints[]` | Same as AND | Emits `cts.tripleRangeQuery` when inner criteria is pure CTS ([Opt 16](#optimization-16-hopwithfield-cts)); otherwise joins. |
| `hopInverse` | `patternJoins[]` | Same as AND | Always joins. Has valuesOnly optimization for related lists. |
| `annTopK` | `patternJoins[]` | Same as AND | Always joins — vector index requires own row source. |

## `keyword` Details

The `keyword` pattern replaces the old `text` macro pattern. Instead of rewriting to `{ OR: [keywordNoHop, referencedBy] }` (which produced an OR sub-plan with a triple hop), it now executes a single CTS query that combines:

1. **Non-semantic**: `cts.fieldWordQuery` (or `fieldValueQuery` for exact match) against the scope's field(s).
2. **Semantic**: Pre-resolves matching IRIs via `cts.values(cts.iriReference(), ...)` against the related field, then builds a `cts.tripleRangeQuery` over the scope's predicates.

The result is a single `cts.orQuery([nonSemanticQuery, tripleRangeQuery])` placed into `ctsConstraints[]` — no joins, no sub-plans.

## `hopWithField` Details

**CTS path** ([Opt 16](#optimization-16-hopwithfield-cts)): When the non-transitive term's inner criteria resolves to pure CTS (no Optic joins), the pattern emits `cts.tripleRangeQuery` as a `ctsConstraint` instead of an Optic `fromTriples` join. This eliminates the `fromTriples` scan and the `joinInner` back to the base plan. Two sub-paths:

- **Id-leaf**: `{ id: IRI }` or `{ iri: IRI }` — wraps `cts.documentQuery(childId)` inside `cts.values(cts.iriReference())` to resolve matching object IRIs.
- **Nested pure-CTS**: `{ name: "painting" }`, `{ OR: [{ id: IRI }, ...] }` — calls `processNestedCriteriaAsCts` on the inner criteria. If the inner accumulator is pure CTS, wraps it inside `cts.values` the same way.

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

**HNSW index vs brute-force:** MarkLogic 12's `annTopK` uses the HNSW vector index only when no pre-filters are pushed inside the `plan:template-view` node. The current implementation applies `op.in(dataTypeCol, ...)` and `op.ne(uriCol, ...)` as `.where()` clauses before `annTopK` — the optimizer pushes these inside, forcing `plan:ann-result indexed="false"` (brute-force kNN). Over 20M item-scope vectors this causes 10+ minute timeouts. Moving filters to post-annTopK reduces latency to ~1s with `indexed="true"`. See [Optimization 22](#optimization-22-anntopk-post-filter-for-hnsw-index-usage).

---

# Related Lists

Related lists find entities related to a given entity via triple navigation. Each related list term (e.g., `agent.relatedToAgent`) has a `searchConfigs` array defining individual two-hop searches.

**Execution flow** (`relatedListsLib.mjs`):
1. Iterates `searchConfigs` for the requested related list.
2. For each, creates an `SCP`, calls `prepare()`, then `executeForValues()`.
3. `executeForValues()` calls `engine.traverseCriteria` — this runs both passes (analysis + accumulator walk) to fire `pattern.apply()` for side effects (e.g., `HopInverse.#processValuesOnly` appending IRIs via `scp.appendValues()`), but does not build or return an Optic plan.
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
| `getSearchScopeTypes` | `searchScope.mjs` | Maps scope name → RDF types |
| `SearchPatternBase` | `patterns/loadPatterns.mjs` | Pattern registry: `get()`, `has()` |
| `expandPredicate` | `prefixUtils.mjs` | Expands CURIE predicate strings to full IRIs |
| `NODE_TYPE_GROUP` | `criteriaNodes.mjs` | Node type discriminator for tree walking |
| `analyzeCriteria` | `analyzeCriteria.mjs` | Pass 1 entry point — produces the criteria tree |

> **Note:** `getSearchTermNames` and `getSearchTermConfig` are **build-time generated** (imported by `analyzeCriteria.mjs`). The source file exports stubs; real implementations are injected by the `generateRemainingSearchTerms` Gradle task at deployment.

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

- **Same-type flattening in Pass 1**: `analyzeCriteria` flattens AND-in-AND and OR-in-OR children into the parent's children array. After single-branch OR→AND collapse, a post-collapse sweep re-checks for any same-type children introduced by the rewrite. This guarantees same-type nesting never reaches Pass 2.

- **Deep copy via `xdmp.toJSON`**: `criteria = xdmp.toJSON(planCriteria.AND).toObject()` is required in `analyzeCriteria` because the analysis loop can append to `criteria[]` (via `inlineCriteria` from `analyzeConjunction`). Without it, recursive calls would corrupt the caller's input.

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

- **`assemblePlan` is cheap to call twice.** It only constructs an Optic plan from a pre-populated accumulator. The expensive work (pattern contributions, transitive hop inner-query executions) is already captured in `acc`. Safe for producing variant plans (e.g., with/without sort lexicons).

- **Sort lexicons contaminate the base plan.** Adding sort field references to `acc.lexicons` before assembly constrains results to documents that have those index values. Solution: build the constraint plan from the original accumulator, then shallow-copy `acc.lexicons` with sort fields for a separate sorted plan.

- **Score propagation must be stored on nodes, not re-derived.** `hasScoreContributingCriteria` is set on each group node during Pass 1 and frozen. Pass 2 reads it directly from the analysis result. Re-traversing the tree in Pass 2 to detect scoring leaves is fragile — nested ORs containing scoring leaves failed to propagate before this was fixed.

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
| **Criteria Tree** | The immutable intermediate representation produced by Pass 1 (`analyzeCriteria`). A tree of group nodes (conjunctions) and leaf nodes (resolved search terms). Frozen via `Object.freeze`. Pass 2 walks this tree to build the Optic plan. |
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
- [ ] Change engine behavior? → Read `buildAccumulatorFromGroup`, `assemblePlan`, `collapseToResultRows`.
- [ ] Change analysis/validation behavior? → Read `analyzeCriteria.mjs`.

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
| [getPlansFromSearchCriteria.js](/scripts/getPlansFromSearchCriteria.js) | Generates Optic plans from JSON search criteria without executing. |
| [analyze-search-comparison.mjs](/scripts/performance/analyze-search-comparison.mjs) | Surface the worst performing pattern shapes from a search comparison's 200 slowest requests based on frequency and delta with CTS' performance. |
| [5k-pattern-analysis.md](/scratch/5k-pattern-analysis.md) | Breakdown of the 5K-request performance test by search pattern |

**Plan visualization:** The Query Plan Viewer in Query Console supports Optic plans. Set query type to "Optic DSL Query", then paste the `selectedPlan` value from `getPlansFromSearchCriteria.js` into the DSL tab. Add a `limit` before `select` if needed — the `op` import and `.result()` call are automatic (including either causes an error). The "Get Plan" and "DSL" tabs in the Performance QC Workspace are pre-configured for this workflow.  For more, see [Introduction to Query Console](https://docs.progress.com/bundle/marklogic-server-use-query-console-12/page/topics/intro.html) -> [Query Console Walkthrough](https://docs.progress.com/bundle/marklogic-server-use-query-console-12/page/topics/walkthru.html) -> [Viewing Query Plans](https://docs.progress.com/bundle/marklogic-server-use-query-console-12/page/topics/walkthru.html#id_27533).

**XML plan extraction:** Benchmark scripts with a `traceId` write detailed plans to `8000_ErrorLog.txt`. Find the plan that has your trace ID and includes cost attributes. To produce valid XML, strip timestamps with regex. Some LLM sessions request JSON. W3 Schools has an online [XML to JSON transformer](https://www.w3schools.com/tools/tool_xml_json.php) that preserves attributes.

### LLM Kickoff

Use this flow to start a performance investigation with an LLM.

1. Create an investigation directory under [/scratch/performance/](/scratch/performance/).  This is where you will save files created by the following steps, as well as where the LLM can generate variant scripts.
2. Save the search's criteria as `criteria.json`.
3. Create `optic.js` and `cts.js` using Get Plan and Get CTS found in the [Performance QC Workspace](/scripts/performance/Performance%20QC%20Workspace.xml).  *Get Plan is a copy of [getPlansFromSearchCriteria.js](/scripts/getPlansFromSearchCriteria.js).*
4. Copy [benchmark-template-optic.js](/scripts/performance/benchmark-template-optic.js) as `optic-benchmark.js`, then copy the plan from `optic.js` as the value of this script's `plan` variable.
5. Copy `optic-benchmark.js` into QC.
6. Run once with the default settings: 3 cold runs + 10 warm runs.  Copy the output for inclusion in the prompt.
7. Obtain Optic's optimized plan:
    - Still in QC, change the `traceId` variable from null to a unique string, and run again.
    - Download and save `8000_ErrorLog.txt` into the investigation folder.
    - Search for your unique string then "cost".
    - Starting with that plan's `<plan:plan>` start tag, copy from there to the end tag.
    - Create `actual-plan.xml` and paste therein.
    - Replace all instances of `.*Info:\+` with an empty string.  Save.
8.  Create / finalize your prompt.
    - See the [Example Performance Investigation Prompt](#example-performance-investigation-prompt) below, as well as [Example Project Context Prompt](#example-project-context-prompt) for brand new LLM sessions.
    - Ask for variant scripts first that can be tested in QC; do not modify engine code or search patterns yet.
    - Require each variant to include its own metrics output.
    - Include the [variant-template.js](/scripts/performance/variant-template.js).  *It includes additional instructions directed to the LLM.*
9.  Run variants, share results, then shortlist candidates for template benchmarking.  This is where a lot of discussion and discovery can happen.  Review the variants, apply your knowledge, and provide any additional insights that could help the collaboration.
10. Only after a variant proves out:
    - Implement in main code base and measure its impact using a performance test.
    - If the optimization is to be adopted, add unit tests and document herein.

#### Example Performance Investigation Prompt

*If your LLM session isn't already orientated to the project and initiative, consider adding the [Example Project Context Prompt](#example-project-context-prompt) prompt to the beginning of your performance investigation prompt.*

> I am investigating a frequent query from the `searchWillMatch` performance test that consistently takes 2.9s-3.1s in Optic.
>
> Artifacts:
> - `criteria.json`: the exact search criteria for one representative failing case (contains one of many `id` values seen in the test).
> - `optic.js`: generated Optic plan.
> - `cts.js`: CTS equivalent (about 29ms).
> - `actual-plan.xml`: optimizer output captured from the server trace.
>
> Context:
> - This shape is contributing to a large overall gap in `searchWillMatch` (about 300 minutes Optic vs 20 minutes CTS for 10K requests).
> - I want to evaluate optimization ideas as standalone variant scripts first, before changing engine code.
>
> Request:
> 1. Identify the likely slowest stage(s) in the current Optic path using these artifacts.
> 2. Propose concrete variant hypotheses, prioritized by expected impact and implementation risk.
> 3. Generate variant scripts using `variant-template.js` and preserve per-variant metrics output.
> 4. Add any additional metrics that help explain where time is spent (build vs optimize vs execute, if available).
>
> Baseline benchmark for current Optic variant:
>
> `12.0.1-optic-curated-containingItem-id coldRuns=3 coldMin=2894 coldMax=3201 coldAvg=3026 coldStddev=129 warmRuns=10 warmMin=2618 warmMax=3200 warmAvg=2812 warmStddev=158 totalItemsRead=13`
>
> Please list any assumptions, then tell me what additional data would most improve your recommendations.

I haven't tried to see if the LLM can execute the scripts directly (e.g., [MarkLogic Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=mlxprs.mlxprs)).  That could enable the LLM to work more autonomously.

#### Example Project Context Prompt

When starting a new LLM session, consider including the following at the beginning of your opening prompt.  Present both referenced Markdown files.

> Review lux-optic-primer.md and optic-lessons.md.  They will give you background on the application's Optic-based search implementation.  We are migrating from cts.search but, as you will see, are still using CTS queries in some search patterns.

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

1. **Remove Unnecessary Groups** — ✅ Implemented in the two-pass pipeline. Pass 1 (`analyzeCriteria`) flattens redundant nested groups of the same type (AND-in-AND, OR-in-OR) and collapses single-branch OR→AND. Pass 2 never encounters same-type nesting.
2. **Selectively Join on IRIs Instead of Fragment IDs** — when IRIs are already in columns, join directly on them instead of going through the IRI lexicon to get fragment IDs. Reduced query 14 from 25s to ~3.5s warm.
3. **Consolidation is Not Always Better** — splitting `op.fromTriples` calls (one per `op.pattern`) can outperform consolidating them into fewer calls. Engineering suspects implicit vs explicit join conditions. MarkLogic-internal ticket MLE-19738.
4. **Semantic Facets** — revert CTS-defined facet configuration back to JSON search grammar when migrating to Optic, eliminating the CTS workaround from the Jan 2025 optimization (ML 365).
5. **ML 113: Resolve non-Hop-Inverse criteria as objects parameter in `cts.triples`** — constrain the objects parameter to reduce the number of triples returned.
6. **Move criteria into Hop with Field term's code** — similar to ML 113 but for `hopWithField`; push additional criteria lower.
7. **Shared `op.fromLexicons` for multiple terms on the same lexicon** — e.g., overlapping date range queries could share one lexicon scan with multiple `.where()` clauses.

## Ideas Above the Backend

Performance opportunities that could be implemented above the backend (mostly).

1. **Defer facet requests until search results arrive** — the frontend should not make any facet requests until receiving at least one search result.
2. **Consolidate facet requests** — a minority subset of the most used or typically fastest-to-calculate facets could be requested in advance of or in parallel with the rest. The `SearchCriteriaProcessor` supports requesting zero or more facets at the same time as the search results, or one or more facets without search results. To expose the former, the search endpoint would need to accept facet requests. To expose the latter, the facets endpoint would need to once again support multiple facets.

## Implemented Optimizations

| Order | Optimization | Summary | Date |
|---|---|---|---|
| 1 | [Opt 3](#optimization-3-reduce-or-eliminate-redundant-datatype-constraints) | Empty-groups: skip redundant dataType constraint on same-scope sub-plans. **More may be possible:** we may be able to remove additional data type constraints but, at present, when nested criteria changes the scope, we need to apply a data type constraint at that level. | 2026-05-31 |
| 2 | [Opt 15](#optimization-15-cts-fold) | CTS Fold: fold CTS-only sub-plans into parent instead of building a join | 2026-05-31 |
| 3 | [Opt 14](#optimization-14-page-slice-hydration-abandoned) | Page-Slice Hydration: **Abandoned.** Produced incorrect total counts for many searches and did not demonstrate sufficient performance improvement to justify investigating the functional differences. | 2026-06-02 |
| 4 | [Opt 13](#optimization-13-amp-as-admin) | Amp as Admin: bypass per-document permission checks for tenant-owner requests | 2026-06-03 |
| 5 | [Opt 16](#optimization-16-hopwithfield-cts) | HopWithField CTS: emit `cts.tripleRangeQuery` instead of Optic `fromTriples` join when inner criteria is pure CTS | 2026-06-04 |
| 6 | [Opt 1](#optimization-1-planwhere-when-scores-are-not-needed) | Score gate: use `plan.where()` instead of `op.fromSearch` when scores are not needed (3-condition gate) | 2026-06-24 |
| 7 | [Opt 17](#optimization-17-select-barrier-on-nested-sub-plans) | Select barrier: `.select([iriCol, fragCol])` on nested sub-plans prevents optimizer from fusing join trees across nesting levels (764× warm improvement on 3-level hops) | 2026-06-24 |
| 8 | [Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries) | cts.estimate with offset/limit: when CTS Fold ([Opt 15](#optimization-15-cts-fold)) is applicable, use `cts.estimate` for total count and `.offset().limit()` for the requested page's results. Avoids materializing all rows. | 2026-06-26 |
| 9 | [Opt 20](#optimization-20-eliminate-fromlexicons-for-join-free-queries) | avoidLexicons: replace `fromLexicons` with `op.fromSearch` + `joinDocAndUri` after pagination. For the reference query, this optimization eliminated 3 lexicon scans (43.9M entries each) and dedup groupBy. Mean dropped from 231% to 31% of CTS (3.2× faster). | 2026-06-28 |
| 10 | [Opt 22](#optimization-22-anntopk-post-filter-for-hnsw-index-usage) | annTopK post-filter: move scope/self-exclusion filters to after `annTopK` so the HNSW index is used (`indexed="true"`). Pre-filters caused brute-force kNN — 800× slower on 20M vectors. Also extends Opt 20 to skip `fromLexicons` for annTopK-only queries. | 2026-06-29 |
| 11 | [Opt 21](#optimization-21-cts-native-facet-computation) | CTS-native facet computation: three-way dispatch in `calculateFacets`. Semantic facets use CTS enumerate + estimate (1,044× faster than Optic triple joins at 2.5M scale). Non-semantic facets use `op.fromSearch(scopedCtsQuery)` (32× faster than URI-list approach). Removes facet guard from `isCtsExecutionEligible`, enabling Opt 18/20 when facets are co-requested. Depends on [Opt 15](#optimization-15-cts-fold). | 2026-07-02 |
| 12 | [Opt 24](#optimization-24-hopinverse-cts-fast-path) | HopInverse CTS fast path: when inner criteria resolves to pure CTS, apply `.where(innerCts)` directly on `fromTriples` instead of building a `fromLexicons` plan and fragment-joining. Eliminates per-hop IRI lexicon scans (~43.9M rows). Representative query: 2,649ms → 121ms (22×). | 2026-07-05 |

## Data Type Constraint Optimizations

The `dataType` constraint (`op.in(op.col('dataType'), [...])`) is a recurring theme across several optimization investigations. This subsection groups the three related efforts: removing redundant constraints (Opt 3), using scope-specific lexicons (Opt 7), and eliminating constraints via scope-specific predicates (Opt 12).

### Optimization 3: Reduce or eliminate redundant dataType constraints

**Status:** Partially implemented — "empty-groups" optimization in `engine.mjs`. Further removal is **blocked** by a memory blowup finding (2026-06-03).

#### Implemented: empty-groups optimization

The engine now skips the `op.in(op.col('dataType'), [...])` constraint on sub-plans when the parent plan already constrains to the same scope. This applies to nested AND/OR/NOT groups that do not cross scope boundaries.

**Where it lives:** `buildAccumulatorFromGroup` in `engine.mjs` computes `scopeAlreadyConstrained`:

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

**Propagation:** The parent passes its scope into recursive `buildAccumulatorFromGroup` calls via `parentScope`. In `buildConjunction`, the condition `parentIsScopeConstrained ? scope : null` determines whether to propagate — `parentIsScopeConstrained` is true when the parent is not a multi-scope plan.

**When it fires:**
- Nested AND/OR/NOT groups processed by `buildConjunction` → `buildSubOrFold`, where the sub-plan's scope matches the parent's scope.

**When it does not fire:**
- Top-level plans (`isTopLevel = true`).
- Multi-scope plans (`isMultiScope = true`).
- Pattern recursion: `HopInverse` and `HopWithField` call `scp.processNestedCriteria()` without passing `parentScope` (defaults to `null`). Both patterns cross scope boundaries via `termConfig.getTargetScopeName()`, so the parent scope never matches the child scope. Technically a same-scope pattern caller could opt in by passing `parentScope`, but none currently do.

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

**Status:** Implemented.

The engine uses `op.fromSearch()` + `joinInner` only when all three conditions are met:
1. `sortCriteria.areScoresRequired()` — the sort order is relevance-based.
2. `hasScoreContributingCriteria === true` — at least one leaf in the criteria tree contributes a relevance score (currently only `Keyword` and `IndexedWord` patterns).
3. `acc.ctsConstraints.length > 0` — there are CTS constraints to score against.

When any condition is false, the engine uses `plan.where(ctsQuery)` instead. This avoids incorporating the CTS query into the plan AST (which `fromSearch` does) and eliminates the `score`/`fragmentId` columns and the `joinInner` back to the base plan.

The `hasScoreContributingCriteria` flag is computed during Pass 1 and stored on each group node. It propagates upward: if any leaf in a sub-group contributes scores, the parent group's flag is set. This ensures that scoring leaves inside nested ORs correctly trigger `fromSearch` at the top level.

**Performance context (from investigation, not current implementation):** Theory A confirmed `where()` is faster than `fromSearch+joinInner` in isolation (128ms vs 179ms warm, both with `prepare(1)`). The current implementation has not been independently benchmarked — the score gate activates only for non-relevance-sorted queries, which are a subset of the 5K test population. The simpler plan AST (no `score`/`fragmentId` columns, no extra `joinInner`) is expected to modestly benefit the optimizer on cold runs.

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

| Metric | Without Amp as Admin | With Amp as Admin | Difference |
|---|---|---|---|
| Cold avg (n=3) | 1,510 ms | 1,404 ms | −106 ms |
| Cold stddev | 874 ms | 890 ms | — |
| Warm avg (n=10) | 215 ms | 210 ms | −5 ms |
| Warm stddev | 3 ms | 4 ms | — |

The warm-path gain (~5 ms) is modest for this query but expected to compound under concurrent load where permission checks are more expensive.

*Note: These benchmarks were captured while the since-abandoned [page-slice hydration optimization](#optimization-14-page-slice-hydration-abandoned) was active. The absolute values reflect that context but the relative Amp as Admin improvement is independent.*

## Optimization 14: Page-Slice Hydration (Abandoned)

**Status:** Abandoned on 2026-06-26 due to the following reasons.  There may potential to trying this again in the future but not at this time.

- **Incorrect totals.** Produced incorrect total counts for ~100 searches in one of the 10K tests. Investigating and reconciling this was not justified given the other limitations.
- **Insufficient performance gain.** The performance gain demonstrated in isolation with the reference query (4.4s → 1.6s) did not move the needle in the scripting test context.
- **Narrow applicability.** Only eligible for keyword-only, relevance-sorted, single-scope, no-facet, no-pageWith requests. Most real searches include hops, ranges, or facets.
- **Maintenance cost.** Two parallel execution paths that must stay semantically synchronized — every engine change required reasoning about both paths.

**Approach:** For keyword-only searches sorted by relevance, bypass Optic entirely: run `cts.search` directly, slice to the requested page, hydrate the slice via a tiny Optic plan (attaching `dataType` only), and use `cts.estimate` for the displayed total.

**The underlying problem remains.** The keyword search pattern produces a `cts.tripleRangeQuery` containing up to 49K IRI literals. The Optic optimizer walks, costs, and rewrites the plan AST containing these literals — taking ~2.4s on a cold cache. This is the dominant cold-start cost. Native `cts.search` with the same query runs in ~1.6s because it bypasses the Optic optimizer entirely.

**Cold-start gap breakdown** (woman-greek-art, item scope, MarkLogic 12.0.1):

| Component | Cost | Source |
|---|---|---|
| Plan optimization (AST traversal of 49K IRI literals) | ~3,818 ms | Phase timing measurement |
| IRI resolution (`cts.values` × 3 keywords) | ~134 ms | 49K IRIs total |
| Plan build (Optic API calls) | ~38 ms | Negligible |
| Execution (index scan + materialization) | ~302 ms | Cold caches |
| **Total Optic cold** | **~3,928 ms** | |
| **CTS cold (same query, no Optic)** | **~662 ms** | Direct `cts.search` |

Plan optimization accounts for 97% of the cold-start overhead. Each distinct keyword query produces a unique plan AST (different IRIs), so the plan cache provides minimal benefit under diverse production load.

**What was learned:**
- Warm-path Optic (29–37 ms) is actually 2.7× faster than CTS warm (93–98 ms). The cold-start gap is the sole problem.
- Lazy IRI resolution (passing `cts.values` Sequence directly instead of `.toArray()`) makes no difference — `cts.tripleRangeQuery` eagerly materializes all values into the plan AST regardless.
- Removing `tripleRangeQuery` entirely (non-semantic only) drops cold-start to 267 ms — 14× faster, actually faster than CTS. The semantic portion of the keyword query is the entire cost.

**Support ticket planned.** We are preparing a support ticket for Progress Engineering to determine whether ML 12.1.0 can address the underlying optimizer cost — specifically: CTS query parameterization within Optic (enabling plan cache reuse), and whether `cts.tripleRangeQuery` could accept a CTS query to define object IRIs instead of requiring pre-materialized literal values.

## Optimization 15: CTS Fold

**Status:** Implemented.

When a nested conjunction (AND/OR/NOT group) produces a sub-accumulator that contains *only* `ctsConstraints` — no joins, no patternJoins, no andOrSubPlans — the engine folds the CTS query directly into the parent's `ctsConstraints` instead of building a full sub-plan. This eliminates the sub-plan's `fromLexicons` scan, UUID-namespaced columns, and the join back to the parent.

[Optimization 3: Reduce or eliminate redundant dataType constraints](#optimization-3-reduce-or-eliminate-redundant-datatype-constraints) is a prerequisite for this optimization (the sub-plan must have no `constraints[]` — which the empty-groups optimization achieves by skipping the redundant dataType constraint on same-scope sub-plans).

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

The fold is implemented in `buildSubOrFold` inside `buildConjunction`. After building the sub-accumulator, `accContainsOnly(acc, 'ctsConstraints')` checks whether the sub contributed only CTS queries. When true, the sub's CTS queries are wrapped per their own `logicType` (via `wrapCtsByLogicType`) and returned as a `{ ctsConstraint }` that the parent pushes into its own `ctsConstraints` array. The parent's assembly then wraps all its `ctsConstraints` together — the folded sub's query becomes a peer of the parent's other CTS queries with no join involved.

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
2. **Nested pure-CTS** (no `termValue`, no `childId`): calls `scp.processNestedCriteriaAsCts()` — if it returns non-null, wraps the result inside `cts.values`.
3. **Fallback**: original Optic `fromTriples` + `joinInner` path.

`processNestedCriteriaAsCts` (added to `engine.mjs`) is a variant of `processNestedCriteria` that builds the inner accumulator with `parentScope: planScope` (to skip the dataType constraint) and returns the CTS query only if `accContainsOnly(acc, 'ctsConstraints')` is true.

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

## Optimization 17: Select barrier on nested sub-plans

**Status:** Implemented.

**Discovery query:** A three-level nested hop in the `event` scope:

```json
{
  "_scope": "event",
  "used": {
    "containingItem": {
      "producedBy": {
        "id": "https://lux.collections.yale.edu/data/person/e17df9e9-7254-409f-98c3-7c2fb3e73cd1"
      }
    }
  }
}
```

This query was consistently 8+ seconds — warm or cold — despite returning only 11 results. The optimizer's plan revealed that it was seeing all columns from every nested join level, flattening the join tree into a single optimization scope, and choosing cross-product hash-joins with catastrophic cardinality estimates (as low as 4e-14). The intermediate row explosion consumed ~8 GB of memory.

**Root cause:** When `processNestedCriteria` returned a full sub-plan with all its columns (uri, iri, dataType, frag, plus any pattern-specific columns), the parent plan's `joinInner` exposed all those columns to the optimizer. With three nesting levels, the optimizer saw the combined column set from all levels simultaneously, fused the joins into a single optimization block, and selected a strategy that materialized millions of intermediate rows.

**Fix:** `processNestedCriteria` now appends `.select([iriCol, fragCol])` to the sub-plan before returning it. These are the only two columns that hop patterns actually join on. By projecting away all other columns, the optimizer is forced to plan each nesting level independently — it can no longer see across the barrier to flatten the join tree.

**Why both columns:** The `PREFER_FRAG_JOINS` option controls whether hop patterns join on fragment ID or URI. The select barrier projects both `iriCol` and `fragCol` to cover either join strategy. Projecting only the one currently in use would break if the option were toggled.

**Why not also remove extraneous lexicons:** The `uri` column from `fromLexicons` is referenced by `assemblePlan`'s OR `fullOuterJoin` path in its `.select(...)`. Removing `uri` from sub-plan lexicons would break that edge case. The select barrier alone provides the dominant improvement — variant A (minimal lexicons, no barrier) achieved 533ms cold while variant C (barrier, full lexicons) achieved 245ms cold / 11ms warm.

### Benchmark (MarkLogic 12.0.1)

All variants use the discovery query above. Each execution returned 11 results (`totalItemsRead=143` ÷ 13 runs), confirmed identical across all variants.

| Variant | Cold avg (ms) | Cold stddev | Warm avg (ms) | Warm stddev | Description |
|---|---|---|---|---|---|
| **Baseline** | 8,594 | 9 | 8,404 | 86 | No optimization. Full column set visible across all nesting levels. |
| **A — Minimal lexicons** | 533 | 11 | 292 | 3 | Removed `uri` and `dataType` columns from sub-plan `fromLexicons`. Fewer columns = smaller optimization scope, but still no hard barrier. |
| **B — Inside-out assembly** | 8,569 | 59 | 8,251 | 48 | Reversed plan assembly order (innermost first). No improvement — the optimizer fuses join trees regardless of assembly order. |
| **C — Select barrier** | **245** | 9 | **11** | 1 | `.select([iriCol, fragCol])` after `assemblePlan` in `processNestedCriteria`. **Implemented.** |

### Analysis

- **Baseline vs. C (select barrier):** 764× warm improvement (8,404ms → 11ms), 35× cold improvement (8,594ms → 245ms). The warm improvement is larger because the optimizer's plan cache retains the catastrophic strategy — even cached, the bad plan takes 8+ seconds to execute.
- **A (minimal lexicons):** 16× cold improvement over baseline (8,594ms → 533ms). Reducing the column count shrinks the optimization scope enough to avoid the worst cross-product strategies, but without a hard projection barrier the optimizer can still see more columns than necessary. Warm runs (292ms) remain ~26× slower than the barrier approach.
- **B (inside-out assembly):** No improvement. Confirms the problem is optimizer join fusion, not plan construction order. The optimizer freely reorders joins regardless of how the application builds them.
- **Why the barrier dominates:** Variant A improves cold starts by reducing column count, but the optimizer can still reason across the join boundary. The select barrier (variant C) creates an opaque wall — the optimizer treats each sub-plan as a black box returning exactly two columns. This prevents cross-level fusion entirely, which explains the additional 2× cold improvement and 26× warm improvement over variant A.

## Optimization 18: cts.estimate with offset/limit for join-free queries

**Status:** Implemented.

This is an extension of the CTS Fold [(Opt 15)](#optimization-15-cts-fold) optimization.  When that optimization is applicable to a search request, this one can be as well.

### Problem

`performSearch` in `engine.mjs` materializes **all** matching rows into a JavaScript array to compute `total`:

```javascript
const rows = useThisPlan.result().toArray();
total = rows.length;
const page = rows.slice(offset, offset + pageLength);
```

For queries with large result sets (e.g., `item.memberOf` returning 2.5M rows), this costs 15 seconds — regardless of requested page size. The Optic plan itself (with `.offset().limit()`) takes only 3–4 seconds for the same query. The more results a search matches, the more this optimization pays off — materialization cost scales linearly with row count while `cts.estimate` is O(1).

Original search that got us looking at this:

```json
{
  "_scope": "item",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/set/d1b8a867-8be7-4325-ad78-1f3abda76056"
  }
}
```

The above ID resolved to "Sterling Memorial Library, Yale University Library" at the time.

### When cts.estimate with offset/limit applies

The logic of when cts.estimate with offset/limit applies is defined in [engine.mjs](/src/main/ml-modules/root/lib/search/engine.mjs)'s `isCtsExecutionEligible` (called within `buildPlans` to determine the execution strategy).  All of the following must be true:

1. **The top-level accumulator is join-free** (`isAccumulatorJoinFree`): no `patternJoins`, no `andOrSubPlans`, no `conjunctionJoins`, at least one `ctsConstraint`, and no pattern-added Optic `constraints` beyond the initial dataType constraint.
2. **The request includes search results** (`includeSearchResults` is true). Facet-only requests take a different path.
3. **No `pageWith`** is requested. `pageWith` requires locating a specific document's position in the full result set.
4. **`buildScopedCtsQuery` returns non-null.** This composes the CTS query with a scope dataType filter (`cts.fieldValueQuery('anyDataTypeName', scopeTypes)`) so cross-scope fields like `anyAnyText` don't overcount.

*Note:* The original implementation also required no facet requests. [Opt 21](#optimization-21-cts-native-facet-computation) removed that guard — `calculateFacets` now works directly with `scopedCtsQuery`, so facets are compatible with the CTS execution path.

### Pattern CTS Conversions

While implementing this optimization, patterns were reviewed to see if they could enable the CTS Fold [(Opt 15)](#optimization-15-cts-fold) and cts.estimate with offset/limit [(Opt 18)](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries) optimizations to apply to more searches.

We were able to do so to three patterns: `DateRange`, `DocumentIdOrIri`, and `IndexedRange`.

The only patterns that still produce non-CTS contributions are `hopWithField` (when inner criteria requires Optic joins or when transitive), `hopInverse`, and `annTopK` — all of which inherently require Optic joins for triple navigation or vector search.

### Benchmark (MarkLogic 12.0.1)

Multiple ways to get the estimate were benchmarked using the `item.memberOf` query — 2,553,512 matching rows.

| # | Approach | Estimate | Cold (ms) | Warm avg (ms) | Notes |
|---|---|---|---|---|---|
| 1 | `.result().toArray().length` (baseline) | 2,553,512 | 15,158 | 15,049 | Full materialization |
| 2 | `fn.count(plan.result())` | 2,553,512 | 4,376 | 4,420 | No array allocation; iterates lazily |
| 3 | `plan.groupBy(null, op.count('total'))` | 2,553,512 | 35,744 | 35,436 | Optimizer picks catastrophic aggregation plan |
| 4 | `plan.explain()` → `estimated-count` | 218,955 | 402 | 379 | Off by 11.6× — unusable |
| 5 | `cts.estimate(ctsQuery)` | 2,553,512 | <1 | ~0 | **Exact match**, O(1) from indexes |
| 6 | Two-pass: `cts.estimate` + `.offset().limit()` | 2,553,512 | 3,863 | 3,594 | **4.2× faster than baseline** |

### Key findings

1. **`cts.estimate` is exact for this query shape.** The 2,553,512 count matches full materialization. No dedup gap because `groupBy(['uri'])` deduplicated nothing — each matching URI appears once per field value match.
2. **`cts.estimate` is free.** Sub-millisecond cold, effectively zero warm.
3. **The two-pass approach is the clear winner.** `cts.estimate` for total + `.offset(n).limit(m).result()` for the page: 3.6s vs 15s.
4. **V8 array allocation is the dominant cost.** `fn.count` (lazy iteration) is 3.4× faster than `.toArray().length` — the 2.5M-object heap allocation costs ~10s alone.
5. **`groupBy(null, count)` is catastrophically slow.** The optimizer chooses a worse plan for the count-only aggregation than for full row retrieval.
6. **`plan.explain()` estimates are wildly inaccurate** — 8.6% of true count for this query. Not usable.

## Optimization 19: DataType-split estimate for non-CTS-foldable searches

**Status:** Idea — needs investigation and benchmarking.

### Problem

cts.estimate with offset/limit (Opt 18) only fires when the top-level accumulator is join-free — i.e., every pattern contribution is pure CTS. Searches involving `hopWithField` (when inner criteria requires Optic joins), `hopInverse`, or `annTopK` produce `patternJoins` that make the accumulator non-join-free. These searches still materialize all rows to compute `total`, which is the dominant cost for large result sets.

### Observation

The `dataType` column serves two purposes in the current pipeline:

1. **Filtering** — `op.in(op.col('dataType'), scopeTypes)` constrains `fromLexicons` to the correct scope.
2. **Output projection** — `collapseToResultRows` renames `dataType` → `type` in the final `select()` so the caller knows each result's record type.

For the *count*, only filtering matters — we need to know *how many* URIs match, not *what type* they are. For the *page*, both matter — each result row includes `{ id, type }`.

### Design sketch

Split `performSearch`'s else-branch into two executions when cts.estimate with offset/limit is ineligible:

1. **Page results (with dataType):** Execute the full plan with `.offset().limit()` to get the requested page. This includes the `dataType` lexicon, constraint, and `groupBy` aggregation — producing `{ id, type }` rows. Cost: proportional to page size (e.g., 20 rows), not total result count.

2. **Estimate (without dataType):** Build a parallel "count plan" that omits the `dataType` lexicon and `op.in` constraint entirely. Execute it with `fn.count(plan.result())` (lazy iteration, no array allocation) or `.groupBy(null, op.count('total'))`. Cost: avoids the `anyDataTypeName` lexicon scan (44M entries) and the early-join filter, at the expense of cross-scope false positives.

```javascript
// Conceptual — not production-ready
if (canEstimate) {
  // ... existing Opt 18 path ...
} else if (includeSearchResults && !pageWith && !facetRequests?.length) {
  // Page results with dataType
  searchResults = useThisPlan.offset(offset).limit(pageLength).result().toArray();
  // Estimate without dataType (may overcount by including other scopes' documents)
  total = fn.count(countOnlyPlan.result());
} else {
  // Full materialization (facets, pageWith, etc.)
  const rows = useThisPlan.result().toArray();
  // ...
}
```

### Scope leakage

Omitting the `dataType` constraint from the count plan means results from other search scopes could be included in the rows being counted for the "estimate".  This could only happen when there are no scope-specific constraints (e.g., scope-specific fields and predicates).  Optimization ideas [Opt 12 (scope-specific predicates)](#optimization-12-scope-specific-predicates-to-eliminate-datatype-constraints) could reduce or eliminate the leakage. 

Scope leakage may be acceptable for estimates, especially if for a minority subset of searches.

### Constraints

- **Not for facets.** Facet computation requires the full row set with correct scope filtering — an overcounting estimate would silently corrupt facet totals.
- **Not for `pageWith`.** The `pageWith` path needs to locate a specific document's position in the full result set.
- **Plan construction cost.** Building a second plan (without dataType) doubles the `buildPlans` work. This may be mitigable by sharing the analysis pass and only diverging at `createPlanAccumulator`.
- **Memory safety.** The Opt 3 investigation showed that removing the dataType constraint from hop sub-plans caused SVC-MEMCANCELED. The count plan would remove it only from the *top-level* accumulator — hop sub-plans would retain their constraints. This distinction needs validation.

## Optimization 20: Eliminate fromLexicons for join-free queries

**Status:** Implemented.

### Problem

When [cts.estimate with offset/limit (Opt 18)](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries) is eligible, the engine already trusts `cts.estimate` for the total count and applies `.offset().limit()` to cap materialization. However, the Optic plan still begins with `op.fromLexicons` scanning three range indexes — `uri` (43.9M entries), `iri` (43.9M entries split into two sub-scans), and `dataType` (43.9M entries) — joined together via scatter-join and hash-join. For the reference query returning 2.5M matches, this plan:

1. Scans three lexicons over 43.9M entries each
2. Hash-joins the two IRI scans by fragment
3. Scatter-joins the result with the dataType lexicon
4. Applies the CTS constraint filter
5. Sorts and groups 2.5M rows to dedup (required because `iri` multiplies rows)
6. **Only then** applies `limit(20)`

The limit cannot be pushed below `groupBy`, so all 2.5M rows are materialized, sorted, and grouped before the top 20 are selected. Result: 3.8–4.6s cold vs 125ms for the equivalent CTS query.

The `iri` column is unused (no hop patterns joined), the `groupBy` exists only to dedup rows inflated by `iri`, and the `dataType` lexicon scan exists only to project the record type into the output — work that could be done for 20 rows instead of 2.5M.

### Approach

Replace `fromLexicons` with `op.fromSearch(ctsQuery)` + `.limit(pageLength)` + `joinDocAndUri()` when the query is CTS-execution-eligible. This eliminates all lexicon scans and lets the CTS index do filtering, ordering, and pagination directly.

**Prototype** (`scratch/performance/memberOf/memberOf-optic-opt-20.js`):

```javascript
op.fromSearch(q, ['fragmentId', 'score'])
  .limit(resultLimit)
  .joinDocAndUri('doc', 'uri', op.fragmentIdCol('fragmentId'))
  .result()
  .toArray()
  .map(row => ({ id: row.uri, type: row.doc.xpath('/json/type') }));
```

Result: **170ms cold** vs 4,609ms baseline (27× faster). The `fromSearch` plan is compact (no IRI literals, no lexicon scans), the limit is applied before any document retrieval, and `joinDocAndUri` pulls only 20 documents from disk to extract `dataType` via XPath.

### Eligibility

Same as `isCtsExecutionEligible` (Opt 18) — all of the following must be true:

1. Top-level accumulator is join-free (`isAccumulatorJoinFree`).
2. Request includes search results (`includeSearchResults`).
3. No `pageWith` requested.
4. `buildScopedCtsQuery` returns non-null.

When these hold, no pattern needs the `iri`, `uri`, or `dataType` lexicon columns for joins. The only purpose of `fromLexicons` is to produce `{id, type}` output rows — which `fromSearch` + `joinDocAndUri` achieves without scanning any lexicons.

### Implementation summary

The implementation lives in `buildPlans` and `performSearch` in [engine.mjs](/src/main/ml-modules/root/lib/search/engine.mjs). Key components:

- **`sortRequiresLexicons(sortCriteria)`** — Returns true when the sort requires lexicon columns (random, field, semantic sorts). Relevance sort and unsorted are compatible with `fromSearch`.
- **`buildFromSearchPlan(acc, assemblyContext, sortCriteria, scopedCtsQuery)`** — Builds an `op.fromSearch(scopedCtsQuery)` plan with `scoreMethod: 'logtfidf'` + `orderBy(desc(score))` when scores are needed, or `scoreMethod: 'zero'` when unsorted. No hydration join — only `fragmentId` (and optionally `score`) columns.
- **Strategy block in `buildPlans`** — When `ctsExecutionEligible && !sortRequiresLexicons(sortCriteria)`, selects the `fromSearch` plan and sets `isFromSearchPlan = true`.
- **Execution in `performSearch`** — When `isFromSearchPlan`, applies `.offset().limit()` first, then `.joinDocAndUri('doc', 'uri', op.fragmentIdCol('fragmentId'))` so only the page slice (typically 20 rows) hits disk. Type extracted via XPath on `/type`.

Key decisions: `scopedCtsQuery` (includes scope dataType filter) prevents cross-scope leakage; hydration after pagination avoids scanning 43.9M lexicon entries; `buildPlans` returns `isFromSearchPlan` so `performSearch` knows which path to use.

### What this does NOT address

- **Queries with hops/joins.** These have `patternJoins` and are ineligible for cts.estimate with offset/limit, so they never enter this path. The `fromLexicons` + `iri` overhead remains for those queries. [Opt 5](#optimization-5-remove-unused-iri-column-from-fromlexicons-for-keyword-only-queries) (conditionally omitting `iri`) is a separate, complementary optimization for queries that use `fromLexicons` but don't need `iri`.
- **annTopK queries.** The `annTopK` pattern contributes `patternJoins`, which causes `isAccumulatorJoinFree()` to return false and `buildScopedCtsQuery()` to return null. Opt 20's `fromSearch` path is therefore ineligible. However, the **Opt 20 extension** ([Opt 22 — Additional engine optimization](#additional-engine-optimization)) provides an analogous bypass specifically for annTopK-only queries: `getDirectPlan()` detects the single-annTopK accumulator and uses the TDE view's `{uri, dataType}` columns directly, eliminating `fromLexicons` without requiring `fromSearch`. This path is complementary — it fires when Opt 20 cannot.
- **Keyword search cold-start.** The keyword pattern's 49K-IRI `cts.tripleRangeQuery` still produces a large CTS query object. `fromSearch` with that query still requires the optimizer to process the AST. However, the `fromSearch` plan is structurally simpler (no lexicon joins, no groupBy), so the optimizer cost may be lower — worth measuring.
- **Non-relevance sort.** Field-based sorts require lexicon columns. V1 restricts to relevance sort.
- **`pageWith`.** Excluded by `isCtsExecutionEligible` eligibility.

### Benchmark

#### Prototype (single query, MarkLogic 12.0.1)

Same reference query as [Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries):

```json
{
  "_scope": "item",
  "memberOf": {
    "id": "https://lux.collections.yale.edu/data/set/d1b8a867-8be7-4325-ad78-1f3abda76056"
  }
}
```

2,553,512 matching items in the 2026-05-01 dataset.

| Approach | Cold (ms) | Notes |
|---|---|---|
| CTS baseline | 125 | `cts.andQuery([jsonPropertyValueQuery, fieldValueQuery])` |
| Standard Optic (`fromLexicons`, Opt 18 limit) | 4,609 | 3 lexicon scans × 43.9M, sort+groupBy 2.5M rows, then limit 20 |
| **Prototype (`fromSearch` + `joinDocAndUri`)** | **170** | No lexicon scans, limit before doc retrieval, XPath for dataType |

#### 10k-3 performance test (2026-06-28, commit 2211d13)

Comparison 11 → 12: adding Opt 20 (`avoidLexicons`) to the Opt 1/3/15/17/18 stack. Baseline: CTS 10k-3 (6/25, cleared caches, 8 min duration). Single-threaded, cleared caches.

| Metric | ID 11 (Opt 18) | ID 12 (Opt 18 + 20) | Change |
|---|---|---|---|
| Test duration | 25 min | 10 min | −60% |
| Mean (% of CTS) | 231.70% | 31.10% | 2.3× slower → **3.2× faster** |
| p99.9 (% of CTS) | 147.20% | 125.60% | −15% |
| Fastest (ms) | 453 | 396 | −13% |
| Slowest (ms) | 3,842 | 1,193 | −69% |
| Requests > 1s | 6 | 1 | −83% |
| Functional diff count | 26 | 25 | −1 |

The mean result is the headline: Optic went from 2.3× slower than CTS to 3.2× faster on the eligible query population. The tail (p99.9) is still 26% above CTS — likely dominated by ineligible queries (hops/joins) or keyword cold-start.

### Relationship to other optimizations

- **Opt 18 (cts.estimate with offset/limit):** Prerequisite. Opt 20 extends Opt 18 by also eliminating the Optic plan for the page results, not just the total count.
- **Opt 21 (CTS-native facet computation):** Complementary. Opt 21 removed the facet-request guard from `isCtsExecutionEligible`, so Opt 20 now fires even when facets are co-requested with search results. Opt 20 handles the page; Opt 21 handles the facets.
- **Opt 22 (annTopK post-filter):** The Opt 20 extension for annTopK is implemented as part of Opt 22. When annTopK is the sole criterion, `getDirectPlan()` bypasses `fromLexicons` using the TDE view directly — analogous to Opt 20's `fromSearch` bypass for CTS-foldable queries, but for a different eligibility condition (`annTopKSelfSufficient` flag vs `isAccumulatorJoinFree`).
- **Opt 5 (Remove `iri` from `fromLexicons`):** Complementary but subsumed for eligible queries. Opt 5 would still help queries that use `fromLexicons` but don't need `iri` (e.g., non-relevance-sorted join-free queries). If Opt 20 is implemented first, Opt 5's remaining value is limited to the non-Opt-20-eligible subset.
- **Opt 14 (Page-Slice, abandoned):** Opt 20 is structurally similar — both bypass `fromLexicons` for page results and use CTS for pagination. The key differences: Opt 20 uses `op.fromSearch` (stays within Optic's API), has a well-defined eligibility gate (`isCtsExecutionEligible`), and does not introduce a separate `cts.search` code path. The total-count concern that killed Opt 14 does not apply — Opt 18's `cts.estimate` with scope filter is already validated.

## Optimization 21: CTS-native facet computation

**Status:** Implemented.

**Depends on:** [Opt 15 (CTS Fold)](#optimization-15-cts-fold) — produces the `scopedCtsQuery` that gates Paths 1 and 2.

**Enables:** Removes the facet-request guard from `isCtsExecutionEligible`, allowing [Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries) and [Opt 20](#optimization-20-eliminate-fromlexicons-for-join-free-queries) to fire even when facets are co-requested with search results.

**Complements:** [Opt 18](#optimization-18-ctsestimate-with-offsetlimit-for-join-free-queries) (total count) and [Opt 20](#optimization-20-eliminate-fromlexicons-for-join-free-queries) (page results). When all three fire together, no full materialization is needed for join-free queries — even with facets.

### Problem

`calculateFacets` receives the full materialized row array from `performSearch` and builds its document-set constraint like this:

```javascript
const uriList = rows.map((row) => row.id);
const docsPlan = op.fromSearch(cts.documentQuery(uriList));
```

For large result sets, this has three costs:

1. **Full materialization in `performSearch`.** All matching rows must be materialized into a JS array so URIs can be extracted. For 219K matches, this is the dominant cost (3-4s). For 2.5M matches (`item.memberOf` on Sterling Memorial Library), it's 15s.
2. **URI-list AST bloat.** `cts.documentQuery(uriList)` with 219K URI strings produces a massive plan AST node. This is the same class of optimizer-cost problem as the keyword pattern's 49K IRIs in `cts.tripleRangeQuery`.
3. **Redundant work.** The Optic plan already determined which documents match. Materializing them into JS, extracting URIs, and feeding them back into a new Optic plan via `documentQuery` is a round-trip through the V8 heap that MarkLogic's indexes could skip entirely.

### Validation results

Benchmarked on MarkLogic 12.0.1 against the content database. Scripts in `scratch/performance/opt21-*.js`.

#### Non-semantic facets (`itemTypeId`, 55K matches, `cts.fieldWordQuery('itemAnyText', 'painting')`)

| Approach | Duration | Match? |
|---|---|---|
| A: `op.fromSearch(cts.documentQuery(uriList))` + Optic join | 3,977ms + 160ms URI collection | Yes |
| **B: `op.fromSearch(scopedCtsQuery)` + Optic join** | **125ms** | **Yes** |

**32× speedup.** Identical facet values, counts, and ordering.

#### Semantic facets (`responsibleCollections`, 2.5M matches)

| Approach | Duration | Correct? | Notes |
|---|---|---|---|
| A: URI list + Optic triple chain | 213,479ms | Yes | 5.5s URI collection + 208s Optic joins |
| B: `fromSearch(scopedCtsQuery)` + Optic triple chain | 340,537ms | Yes | Optimizer does *worse* with CTS query than URI list |
| D: Optic with denormalized `itemMemberOfId` field (unfiltered) | 753ms | No | Returns 985 values (all `la:member_of` targets, not just collections) |
| E: Optic denormalized field + collection-set join filter | 1,574ms | Yes | D + projection barrier + collection filter |
| **C: CTS enumerate + estimate** | **326ms** | **Yes** | 66 candidates × `cts.estimate`, no Optic |

**Key findings:**

1. **Non-semantic facets:** Replacing `cts.documentQuery(uriList)` with `op.fromSearch(scopedCtsQuery)` yields a 32× speedup with identical results. The single `fromSearch` + `fromLexicons` join plan is fast (125ms for 55K matches).

2. **Semantic facets:** The Optic triple chain (`fromSearch → fromLexicons(iri) → fromTriples → fromSearch(Set) → fromLexicons(setIri)`) is the bottleneck, not `docsPlan`. At 2.5M scale it takes 210-340s regardless of how the document set is defined. CTS query `docsPlan` (B) is actually *slower* than URI list `docsPlan` (A) — the optimizer handles a compact `documentQuery` node more efficiently when the downstream plan is complex.

3. **Denormalized field indexes** (`itemMemberOfId`) help (753ms unfiltered, 1,574ms filtered) but are still 4.8× slower than CTS because Optic routes through the plan optimizer and row pipeline.

4. **CTS enumerate-and-estimate** inverts the problem: enumerate ~66 candidate Set documents (search-independent), then `cts.estimate` per candidate using field-index intersection. No Optic plan, no triple traversal. 326ms total — 1,044× faster than the Optic triple chain.

5. **`responsibleUnits`** has a 3-hop chain with no single denormalized field equivalent. Its CTS config uses `cts.triples` + `cts.documentQuery` nesting to pre-compute candidates — manageable because the enumeration runs once (search-independent) and per-value `cts.estimate` calls use the same field-index intersection pattern.

#### Performance test results (2026-07-03)

Results are of the 19,626 derived facet requests from the 10k-1 search requests.  CTS baseline: 7/2 CTS New 10k-1 with warm caches (14 min). Optic stack: 1, 3, 15, 17, 18, 20, 22 (ID 22, w/o Opt 21) and + 21 (IDs 31/32, w/ Opt 21).

Comparison 22 → 31: adding Opt 21 (Optic-to-Optic).

| Metric | ID 22 (w/o Opt 21) | ID 31 (w/ Opt 21) | Change |
|---|---|---|---|
| Test duration | 59 min | 42 min | −29% |
| Mean (% of CTS) | 290.90% | 203.90% | −22.3% (Optic-to-Optic) |
| p99.9 (% of CTS) | 71.70% | 2.10% | 1.7× slower → **near parity** |
| Slowest 20 range (ms) | 7,401–20,158 | 2,319–10,228 | |
| Requests > 1s | 20 | 20 | unchanged |
| Functional diff vs CTS | 4,701 | 4,680 | −21 |

Opt 21 substantially improved tail latency: p99.9 dropped from 71.7% above CTS to 2.1% — near parity. The slowest 20 range narrowed from 7.4–20.2s to 2.3–10.2s. However, mean latency remained 2× above CTS (203.9%), and both Optic and CTS had 20 requests over 1s (CTS range: 1,286–3,319ms). The mean gap reflects searches where Opt 21 does not fire (hop/join queries that fall back to Path 3 URI-list facets).

### Implementation

The implementation spans three layers: execution strategy in `performSearch`, facet dispatch in `calculateFacets`, and per-facet CTS configuration in `semanticFacetsConfig.mjs`.

#### `performSearch` execution paths ([engine.mjs](/src/main/ml-modules/root/lib/search/engine.mjs))

Three branches in `performSearch` determine how rows are produced, then a single `calculateFacets` call handles all facet computation:

1. **CTS-eligible (`ctsExecutionEligible`):** Search results are requested, the accumulator is join-free, and `scopedCtsQuery` is non-null. Page results use `cts.estimate` (total) + `offset/limit` (page slice) via Opt 18/20. `rows` stays `null` — no full materialization.

2. **Facet-only with CTS (`!includeSearchResults && scopedCtsQuery`):** Facets were requested without search results and the query is CTS-foldable. `rows` stays `null`. No plan execution at all — `calculateFacets` works directly from `scopedCtsQuery`.

3. **Full materialization (else):** The query has joins (hops, annTopK) or other conditions that prevent CTS execution. All matching rows are materialized. Search results are paginated from the array if requested. `rows` is passed to `calculateFacets` for URI extraction.

After the branch, one call:

```javascript
facetResponses = calculateFacets(rows, facetRequests, scopedCtsQuery);
```

`isCtsExecutionEligible` no longer checks for facet requests — Opt 21 made facets compatible with the CTS execution path. This means Opt 18/20 now fire even when facets are co-requested with search results, avoiding full materialization entirely for join-free queries.

#### `calculateFacets` dispatch ([calculateFacets.mjs](/src/main/ml-modules/root/lib/search/calculateFacets.mjs))

Three paths per facet, gated by `scopedCtsQuery` and facet type:

- **Path 1 — CTS semantic** (`isSemanticFacet && scopedCtsQuery`): Enumerate candidates via `cts.search(potentialFacetValuesCtsQuery)`, count each via `cts.estimate(getValuesCountCtsQuery(scopedCtsQuery, uri))`, filter count > 0, sort by count desc. No Optic plan. Capped at `SEMANTIC_VALUE_LIMIT` (100) — both current semantic facets (`responsibleCollections`: ~66 values, `responsibleUnits`: fewer) are well within this limit.

- **Path 2 — Optic with CTS query** (`!isSemanticFacet && scopedCtsQuery`): `op.fromSearch(scopedCtsQuery)` replaces the old `cts.documentQuery(uriList)`. The downstream Optic chain (`joinInner(fromLexicons) → groupBy → orderBy`) is unchanged.

- **Path 3 — Optic with URI list** (no `scopedCtsQuery`): Fallback for non-foldable queries. `rows.map(r => r.id)` extracts URIs, `op.fromSearch(cts.documentQuery(uriList))` builds the document set. This is the pre-Opt-21 behavior, used when the query involves `hopInverse`, transitive `hopWithField`, or `annTopK`.

**Why not a uniform Optic path?** Optic works well for non-semantic facets (Path 2: 125ms) because the plan is simple. For semantic facets, the plan grows to 4-5 joins with `fromTriples`/`fromSPARQL`, and the optimizer cannot efficiently process it at 2.5M scale (210-340s). Even denormalized field indexes (1,574ms) are 4.8× slower than CTS.

**Why not a uniform CTS path?** CTS `cts.fieldValues` could replace Path 2, but Optic is already fast (125ms) and preserves the existing pagination, sort-order, and date-facet handling. The marginal gain doesn't justify the code duplication.

#### Semantic facet configuration ([semanticFacetsConfig.mjs](/src/main/ml-modules/root/config/semanticFacetsConfig.mjs))

Each semantic facet requires configuration for both CTS (Path 1) and Optic (Path 3):

| Property | Path | Purpose |
|---|---|---|
| `potentialFacetValuesCtsQuery` | 1 | CTS query to enumerate candidate facet values (search-independent) |
| `getValuesCountCtsQuery(scopedCtsQuery, uri)` | 1 | Returns a CTS query that counts items matching `scopedCtsQuery` AND the candidate value |
| `plan` | 3 | Optic plan for the triple/SPARQL join chain |
| `sourceJoinColName` | 2, 3 | Column from `docsPlan` to join on |
| `constraintJoinColName` | 2, 3 | Column from `plan` to join on |
| `facetValueColName` | 2, 3 | Column containing the facet value URI |

The CTS properties were ported from the CTS-based search implementation. The Optic properties are retained for the Path 3 fallback.

#### Source files

| File | Change |
|---|---|
| [calculateFacets.mjs](/src/main/ml-modules/root/lib/search/calculateFacets.mjs) | New module — three-way dispatch, extracted from `engine.mjs` |
| [engine.mjs](/src/main/ml-modules/root/lib/search/engine.mjs) | Removed ~150-line facets region. Single `calculateFacets` call after execution branch. Removed facet guard from `isCtsExecutionEligible`. |
| [semanticFacetsConfig.mjs](/src/main/ml-modules/root/config/semanticFacetsConfig.mjs) | Added `potentialFacetValuesCtsQuery` and `getValuesCountCtsQuery` to `responsibleCollections` and `responsibleUnits` |

## Optimization 22: annTopK post-filter for HNSW index usage

**Status:** Implemented.

### Problem

Customer-reported slow vector similarity searches. The `annTopK` pattern applies scope (dataType) and self-exclusion filters as `.where()` clauses **before** `annTopK`. The optimizer pushes these inside the `plan:template-view` node, causing MarkLogic to fall back from HNSW indexed search to brute-force kNN over the filtered candidate set. For the item scope (20.16M vectors), this causes 10+ minute timeouts.

The issue was not observed during initial development because the test seed document was in the event scope (187K vectors — brute-force is fast over small sets).

### Root cause

MarkLogic 12's `annTopK` uses the HNSW vector index (`plan:ann-result indexed="true"`) only when no pre-filters constrain the `template-view` input to `annTopK`. When `op.in(dataTypeCol, ...)` or `op.ne(uriCol, ...)` is applied before `annTopK`, the optimizer pushes the filter inside the `template-view` as a `plan:join-filter`, and `annTopK` switches to `indexed="false"` (brute-force linear scan).

This is consistent with how HNSW graphs work: the graph is built over the full vector corpus. Pre-filtering removes nodes from the traversal set, breaking the graph connectivity that HNSW relies on. MarkLogic falls back to exhaustive distance computation over the surviving rows.

### Benchmark (2026-06-29)

Seed document: `https://lux.collections.yale.edu/data/digital/e0d19c1d-db52-4c86-95c9-dc02451a7e83` (DigitalObject, item scope). MarkLogic 12.0.1, single host, 44M total vectors, 20.16M item-scope vectors. Scripts in `scratch/performance/vectors/`.

| Variant | Description | Time | `indexed` | Results |
|---|---|---|---|---|
| Baseline (current) | dataType + self-exclusion before `annTopK` | >10 min (timeout) | `false` | — |
| A (unfiltered) | No filters at all | **737ms** | `true` | 50/50 |
| B (post-filter) | `annTopK(250)` then `.where()` after | **989ms** | `true` | 249/250 |
| C (barrier) | `.select()` between `annTopK` and post-filter | **978ms** | `true` | 249/250 |
| D (distribution) | `annTopK(500)` — measure scope hit rate | **2.8s** | `true` | 500/500 (100% DigitalObject) |

Key observations:
- Removing pre-filters yields >800× speedup (10min+ → 737ms).
- The optimizer does NOT push post-filter `.where()` clauses back inside `annTopK` — variant B works without a select barrier.
- For this seed, 100% of the 500 nearest vectors are DigitalObject (item scope). Vectors cluster strongly by type, so candidateK inflation is minimal. However, this may not hold for all seed documents (e.g., a concept-scope seed whose nearest neighbors are dominated by items).

### Fix

Restructure `AnnTopK.mjs` to use post-filtering:

**Before (current — brute-force):**
```javascript
let annPlan = op
  .fromView('lux', 'vectors', id, op.fragmentIdCol(vecFrag))
  .where(op.in(dataTypeCol, getSearchScopeTypes(scopeName)))  // ← forces indexed=false
  .where(op.ne(op.col('uri'), termValue));                    // ← forces indexed=false
annPlan = annPlan.annTopK(k, vectorCol, queryVector, distCol, { distance: 'cosine' });
```

**After (post-filter — indexed):**
```javascript
let annPlan = op
  .fromView('lux', 'vectors', id, op.fragmentIdCol(vecFrag))
  .annTopK(candidateK, vectorCol, queryVector, distCol, {
    distance: 'cosine',
    maxDistance,
    searchFactor: 1,
  })
  .where(op.in(dataTypeCol, getSearchScopeTypes(scopeName)))  // post-filter: scope
  .where(op.ne(op.col('uri'), termValue));                    // post-filter: self-exclusion
```

The `candidateK` should be `k + buffer` to account for post-filter attrition. Given that vectors cluster strongly by type, a small buffer (e.g., `k * 1.2` or `k + 10`) is likely sufficient for most seeds. A larger multiplier may be needed for cross-type seed documents. The `searchFactor` option (not currently passed in the integrated pattern) controls HNSW candidate breadth — `1` is minimum exhaustiveness, fastest.

### When Opt 22 applies

Opt 22 is always active — the post-filter pattern is the sole implementation in `AnnTopK.mjs`. Every `annTopK` query benefits from HNSW indexing regardless of scope or logicType.

The **Opt 20 extension** (skip `fromLexicons`) applies only when:
1. `logicType === 'and'` (the accumulator's top-level conjunction is AND).
2. The accumulator has exactly one `patternJoin` entry, and it is the annTopK join.
3. No `ctsConstraints`, `conjunctionJoins`, `andOrSubPlans`, or pattern-added `constraints` exist.

In practice this means: a single similarity search term with no additional criteria (e.g., `{ "_scope": "item", "similar": "https://..." }`).

### Limitations

| Context | Can Opt 22 apply? | Can Opt 20 extension apply? | Reason |
|---|---|---|---|
| Single annTopK, AND | Yes | Yes | Sole criterion, direct plan used |
| annTopK + keyword, AND | Yes | **No** | Keyword adds `ctsConstraints` → falls back to `fromLexicons` + `joinInner` |
| annTopK + hop, AND | Yes | **No** | Hop adds `patternJoins[1]` or `ctsConstraints` |
| annTopK under OR | Yes | **No** | `logicType !== 'and'` blocks direct plan detection |
| annTopK under NOT | Yes | **No** | Same as OR |
| Multiple annTopK, OR | Yes | **No** | `patternJoins.length > 1` |

**CandidateK attrition risk:** If a seed document's nearest neighbors are dominated by a different dataType (cross-scope clustering), the post-filter may eliminate most candidates and return fewer than `k` results. The current `candidateK = max(k * 1.2, k + 10)` assumes same-scope dominance (benchmarked at 100% for DigitalObject seeds). Minority-scope seeds (concept, event, place) should be tested to validate this assumption. The `maxDistance` cap provides a secondary safety net — results beyond the distance threshold are excluded regardless.

**No result-count guarantee:** Unlike the pre-filter approach (which guaranteed exactly `k` results within scope), the post-filter approach may return fewer than `k` results when post-filter attrition exceeds the candidateK buffer. This is acceptable for similarity search UX (showing fewer but more similar results is preferred over slow but exact counts).

### Additional engine optimization

**Status:** Implemented (Opt 20 extension).

The `annTopK` pattern now signals `annTopKSelfSufficient: true` on its join descriptor and provides an `annTopKPlanForDirect` plan with standard `{uri, dataType}` columns from the TDE view. The engine's `getDirectPlan()` detects annTopK-only accumulators (single pattern join, no CTS constraints, no other contributions) and bypasses `fromLexicons` + `assemblePlan` entirely. This eliminates the 43.9M-entry IRI lexicon scan, the `joinInner` back to the base plan, and the blocking `groupBy` for queries that are pure similarity searches.

## Optimization 23: Scope-specific QBVs for annTopK graph partitioning

**Status:** Idea — requires investigation (physical index layout unknown). Dependent on [Opt 22](#optimization-22-anntopk-post-filter-for-hnsw-index-usage).

### Problem

Opt 22's post-filter approach searches the full 44M-vector HNSW graph and filters to the target scope afterward. This works well when vectors cluster by type (benchmarked at 100% same-type for DigitalObject seeds), but may not hold for minority-scope seeds. If a concept document's nearest neighbors are mostly items, the candidateK multiplier would need to grow significantly to yield enough in-scope results — and even then, the HNSW graph traversal cost scales with the full corpus, not the scope.

### Approach

MarkLogic 12 supports Query-Based Views (QBVs) scoped to document subsets. A QBV per dataType could partition the ANN search space so `annTopK` traverses only the scope-relevant HNSW graph:

```
lux.vectors (base TDE view — all 44M vectors)
  ├─ QBV: vectors_item     → 20.16M vectors (DigitalObject + HumanMadeObject)
  ├─ QBV: vectors_agent    → 6.3M vectors (Person + Group)
  ├─ QBV: vectors_work     → 15.8M vectors (LinguisticObject + VisualItem)
  └─ QBV: vectors_concept  → 0.5M vectors (Type + Currency + ...)
```

`AnnTopK.mjs` would select the scope-specific view name (e.g., `vectors_item` instead of `vectors`) based on `searchTerm.getScopeName()`. The post-filter scope constraint (Opt 22) would become redundant for scoped QBVs but should remain as a safety net.

### Constraints

- All referenced vector columns must retain identical metadata (name, type/scalar-type, collation, nullable, invalid-values settings) as the base view. Otherwise, ANN falls back to brute-force kNN. This is documented in internal MarkLogic 12 vector-search guidance.
- QBVs may need to be backed by collections or other MarkLogic scoping mechanisms — the current data model uses a `dataType` property, not collections, to distinguish scopes.

### Open question

Whether MarkLogic physically materializes a separate HNSW graph per QBV (true partition — O(scope-size) traversal) or reuses the broader underlying vector index and constrains the candidate set through the view definition (functionally equivalent to post-filtering — same as current Opt 22 approach). The documentation does not explicitly state the physical index layout per QBV. If QBVs merely filter after graph traversal, they provide no benefit over the current post-filter approach.

### Next step

Test `annTopK` against a QBV (e.g., filtered by collection) to determine whether `plan:ann-result indexed="true"` still fires and whether timing improves versus the base view with post-filter.

## Optimization 24: HopInverse CTS fast path

**Status:** Implemented.

**Prerequisite:** [Opt 15 (CTS Fold)](#optimization-15-cts-fold) must be in place — the fold mechanism is what makes inner criteria produce pure-CTS accumulators. [Opt 16 (HopWithField CTS)](#optimization-16-hopwithfield-cts) provides the analogous optimization for `hopWithField` terms; Opt 24 extends the same principle to `hopInverse`.

### Problem

Multi-hop `hopInverse` queries are dominated by intermediate `fromLexicons` scans. Each hop level builds a nested plan via `processNestedCriteria`, which always creates a `fromLexicons({uri, iri, dataType})` plan as the row source. For a 2-hop query like `curated.containingItem.id`, this produces two intermediate `fromLexicons` scans in addition to the top-level scan — each scanning up to 43.9M IRI entries from the lexicon index.

Representative query (`searchWillMatch` for `lux:itemDepartment`):
```json
{"curated": {"containingItem": {"id": "https://lux.collections.yale.edu/data/object/..."}}}
```

Before Opt 24, the plan for this query:
```javascript
// Top-level: agent scope
op.fromLexicons({uri, iri, dataType}).where(dataType in ['Person','Group'])
  .joinInner(
    // Outer triple (agentOfCuration)
    op.fromTriples([pattern(s, agentOfCuration, o, triFrag)])
      .joinInner(
        // INTERMEDIATE: set scope — 316K-row lexicon scan
        op.fromLexicons({set_uri, set_iri, set_dataType}).where(dataType='Set')
          .joinInner(
            // Inner triple (member_of)
            op.fromTriples([pattern(s, member_of, o, triFrag)])
              .joinInner(
                // INTERMEDIATE: item scope — 10M+ row lexicon scan
                op.fromLexicons({item_uri, item_iri, item_dataType})
                  .where(dataType in ['DigitalObject','HumanMadeObject'])
                  .where(cts.documentQuery(targetId))
                  .select([item_iri, item_frag]),     // Opt 17 barrier
                on(triFrag, item_frag)),              // fragment join
            on(set_iri, inner_o))
          .select([set_iri, set_frag]),               // Opt 17 barrier
        on(triFrag, set_frag)),                       // fragment join
    on(iri, outer_o))
```

The two intermediate `fromLexicons` calls — scanning 10M+ and 316K rows respectively — are pure overhead. Their only purpose is to provide an `iri` column and `frag` column for the hop pattern joins, but the `fromTriples` pattern already provides equivalent columns via its subject/object and fragmentIdCol.

### Why HopInverse cannot use cts.tripleRangeQuery

[Opt 16](#optimization-16-hopwithfield-cts) resolves `hopWithField` terms as `cts.tripleRangeQuery` CTS constraints. This works because `hopWithField`'s triple `(parent, predicate, child)` lives on the **parent** document — the one being constrained. `cts.tripleRangeQuery` matches documents containing the specified triple, so the constraint correctly filters the parent scope.

`hopInverse` has the opposite triple direction: `(child, predicate, parent)` where the triple lives on the **child** (referenced) document, not the parent. `cts.tripleRangeQuery` would constrain child documents, not the parent scope the search needs to filter. This means HopInverse cannot fully collapse to a CTS constraint and must retain an Optic `fromTriples` row source to bridge the document boundary.

### Approach

When HopInverse's inner criteria resolves to pure CTS (detected via `processNestedCriteriaAsCts`), apply the CTS query as `.where(innerCts)` directly on the `fromTriples` plan instead of building a separate `fromLexicons` plan and fragment-joining.

After Opt 24, the innermost hop in the example above becomes:
```javascript
// Inner triple — no fromLexicons, no fragment join
op.fromTriples([pattern(s, member_of, o, triFrag)])
  .where(cts.documentQuery(targetId))       // CTS applied directly
```

The `.where()` on `fromTriples` constrains which document fragments the triples come from — functionally equivalent to the fragment join against `fromLexicons.where(ctsQuery)`, but without the lexicon scan.

### Implementation

Single change in `HopInverse.mjs` — `apply()` method. Before building the Optic fallback path (`fromTriples.joinInner(processNestedCriteria(...))`), attempt `processNestedCriteriaAsCts`:

```javascript
const innerCts = scp.processNestedCriteriaAsCts({
  planCriteria: searchTerm.getCriteria(),
  planScope: termConfig.getTargetScopeName(),
  patternOptions: SCP.initializePatternOptions(),
  parentId: id,
});
if (innerCts) {
  return {
    patternJoins: [{
      right: tri.where(innerCts),
      on: op.on(op.col(parentIriCol), op.col(id + '_o')),
      extraCols: [],
    }],
  };
}
```

When `processNestedCriteriaAsCts` returns non-null:
- The `fromTriples` plan gets a `.where(innerCts)` constraint — no `fromLexicons` needed.
- The fragment join (`on(triFrag, refFrag)`) is eliminated — the `.where()` directly constrains the triple's source fragments.
- The outer join key remains `on(parentIriCol, _o)` — unchanged from the original path.

When `processNestedCriteriaAsCts` returns null (inner criteria requires Optic joins), the existing `processNestedCriteria` fallback path fires unchanged.

**Source file:** `src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs`

### Benchmark

#### Single query

Representative query: `{"curated":{"containingItem":{"id":"..."}}}` via `searchWillMatch`.

| Metric | Before Opt 24 | After Opt 24 | Improvement |
|---|---|---|---|
| `lux:itemDepartment` latency | 2,649ms | 121ms | 22× |
| Total batch (6 searches) | 3,127ms | 603ms | 5.2× |

#### 10k performance test (2026-07-05)

10K-document `get-data-no-profile` requests, cleared caches. CTS baseline: 7/4 CTS 10k-docs-no-pro (20 min). Optic stack: 1, 3, 15, 17, 18, 20, 21, 22 (ID 35) + 24 (ID 36).

Before Opt 24 (ID 35), `lux:itemDepartment` (a 2-hop `hopInverse` chain) was the slowest search at 2.9–3.1s (CTS: 522–780ms). All but one of the 20 slowest were item-scope.

Comparison 35 → 36: adding Opt 24.

| Metric | ID 35 (w/o Opt 24) | ID 36 (w/ Opt 24) | Change |
|---|---|---|---|
| Test duration | 300 min | 66 min | −78% |
| Mean (% of CTS) | 1,409.90% | 232.50% | 14× slower → **2.3× slower** |
| p99.9 (% of CTS) | 662.90% | 46.10% | 6.6× slower → **2.2× faster** |
| Slowest 20 range (ms) | 4,313–18,403 | 817–1,064 | |
| Requests > 1s | 20 | 1 | −95% |
| Functional diff vs CTS | 39 | 38 | −1 |

### Scope and limitations

**What Opt 24 covers:**
- Any `hopInverse` term whose inner criteria resolves to pure CTS via `processNestedCriteriaAsCts`. This includes direct IRI lookups (`{id: "..."}`, `{iri: "..."}`), field constraints (`{name: "..."}`, `{identifier: "..."}`), and nested criteria composed entirely of CTS-foldable terms.

**What Opt 24 does not cover:**
- Inner criteria requiring Optic joins (e.g., nested hops that themselves don't resolve to CTS). These fall back to the original `processNestedCriteria` + `fromLexicons` path.

**Cascade behavior:** Opt 24 returns `patternJoins` (not `ctsConstraints`), so it does not cascade through `processNestedCriteriaAsCts` at the parent scope level. For a 2-hop chain like `curated.containingItem.id`, the innermost `fromLexicons` (item scope, ~10M rows) is eliminated, but the middle `fromLexicons` (set scope, ~316K rows) is retained. Despite this single-level limitation, the benchmark shows the optimization is sufficient for the target query shape.

**Relationship to Opt 16:** Opt 16 handles `hopWithField` by emitting `cts.tripleRangeQuery` as a `ctsConstraint`, which DOES cascade — each outer hop also sees only CTS and can resolve without Optic. Opt 24 handles `hopInverse` via a different mechanism (`.where()` on `fromTriples`) because the triple's document location prevents full CTS resolution. The two optimizations are complementary and cover the two hop pattern types.