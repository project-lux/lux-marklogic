# Optic Related List Performance Analysis

## Purpose

This document captures the analysis of why the Optic implementation of related list searches is dramatically slower than the CTS implementation, using a specific test case (`subjectOfWork-aboutAgent`) as the primary example. The findings and proposed optimizations apply broadly to all 298 related list triple searches across 12 related list terms.

---

## Background: Related Lists

### What a related list does

A related list finds entities that are **related** to a given entity (identified by its IRI/URI). For example, "agents related to agent X" traverses through intermediate entities (works, items, sets) to find other agents connected to agent X.

### Configuration structure

Related lists are defined in `relatedListsConfig.mjs` (generated at deploy time). Each related list term (e.g., `agent.relatedToAgent`) has a `searchConfigs` array of individual searches. Each search specifies:

```javascript
{
  relationKey: 'subjectOfWork-aboutAgent',   // unique key identifying the relation
  relationScope: 'work',                      // scope of the intermediate entity
  mode: 'values',                            // 'values' means return IRIs, not full search
  criteria: {
    subjectOfWork: { aboutAgent: { iri: '@@RUNTIME_PARAM@@' } }
  }
}
```

At runtime, `@@RUNTIME_PARAM@@` is replaced with the target entity's URI.

### Scale

```
Total related list terms: 12
Total triple searches: 298
Max searches per list: 50 (agent.relatedToAgent)
Min searches per list: 11
```

Every search is a **two-hop path**: an outer hop (always `hopInverse` pattern) wrapping an inner hop (always `hopWithField` pattern, with an `{ iri: 'value' }` leaf criterion).

### Execution flow

1. `relatedListsLib.mjs` iterates each search config in a related list.
2. For each, it calls `SCP.prepare()` then `.execute()`.
3. `execute()` calls `engine.performSearch()`, which calls `engine.processCriteria()`.
4. `processCriteria()` dispatches to pattern classes (`HopInverse`, `HopWithField`, `DocumentIdOrIri`) based on the search term config.
5. Patterns return contributions (joins, constraints) that are merged into an accumulator and assembled into a final Optic plan.

---

## The Test Case: `subjectOfWork-aboutAgent`

### Search criteria

```json
{ "subjectOfWork": { "aboutAgent": { "iri": "https://lux.collections.yale.edu/data/person/43dfcd7e-0059-4539-9774-56d2b61c48bd" } } }
```

Search scope: `work`

### What this search means

Find **works** (LinguisticObject/VisualItem) that are the **subject of** other works that are **about a specific agent** (Person/Group).

### Triple path (2 hops)

```
Result Work ←(about_or_depicts_work object)← Intermediate Work →(about_or_depicts_agent object)→ Specific Person
```

The result works are the `about_or_depicts_work` triple **objects**. The intermediate works contain both triples as subjects (triples are always stored on the subject document in LUX).

### Search term decomposition

| Level | Search term | Pattern | Predicate | Target scope |
|---|---|---|---|---|
| Outer | `subjectOfWork` | `hopInverse` | `lux:about_or_depicts_work` | `work` |
| Inner | `aboutAgent` | `hopWithField` | `lux:about_or_depicts_agent` | `agent` |
| Leaf | `iri` | `documentId` | — | — |

### Search term configs (from searchTermsConfig.mjs)

**`subjectOfWork`** (on the `agent` scope — it's a hopInverse):
```javascript
subjectOfWork: {
  patternName: 'hopInverse',
  predicates: ['lux:about_or_depicts_agent'],
  targetScope: 'work',
  hopInverseName: 'aboutAgent',
  generated: true,
}
```
Note: the `subjectOfWork` term appears on the agent scope, but the search itself runs in `work` scope. The predicates here (`about_or_depicts_agent`) are the *outer* predicate for this agent-centric search term. However, in the related list config, the criteria structure `{ subjectOfWork: { aboutAgent: { iri: ... } } }` is interpreted in the **work scope**, where:

**`subjectOfWork`** (on the `work` scope — different definition used by related lists):
```javascript
// Not explicitly in agent scope. The related list criteria resolve
// through the work scope's search terms:
```

**`aboutAgent`** (on the `work` scope — the inner hopWithField):
```javascript
aboutAgent: {
  patternName: 'hopWithField',
  predicates: ['lux:about_or_depicts_agent'],
  targetScope: 'agent',
  indexReferences: ['agentPrimaryName'],
  idIndexReferences: ['workAboutAgentId'],
  hopInverseName: 'subjectOfWork',
}
```

---

## Performance Comparison

| Metric | CTS | Optic |
|---|---|---|
| Time | 139 ms | 8,926 ms |
| Ratio | 1x | **64x slower** |

---

## CTS Implementation (the goal)

File: `scratch/subjectOfWork-aboutAgent-CTS.js`

```javascript
// Phase 1: Constrained triple scan
const aboutAgentQuery = cts.andQuery([
  cts.jsonPropertyValueQuery('dataType', ['LinguisticObject', 'VisualItem'], ['exact']),
  cts.tripleRangeQuery(
    [],
    [lux('about_or_depicts_agent')],
    sem.iri('https://lux.collections.yale.edu/data/person/43dfcd7e-...'),
    '=', [], 1
  ),
]);

const subjectOfWorkURIs = cts.triples(
  [],
  [lux('about_or_depicts_work')],
  [],
  '=',
  ['eager', 'concurrent'],
  aboutAgentQuery,
)
  .toArray()
  .map((x) => sem.tripleObject(x))
  .concat(sem.iri('/does/not/exist'));

// Phase 2: Document fetch
const fullQuery = cts.andQuery([
  cts.jsonPropertyValueQuery('dataType', ['LinguisticObject', 'VisualItem'], ['exact']),
  cts.documentQuery(subjectOfWorkURIs),
]);
const results = cts.search(fullQuery).toArray().map(doc => ({
  id: doc.baseURI,
  type: doc.xpath('json/type'),
}));
```

### Why this is fast

1. **Phase 1** is a single `cts.triples` call with a **composed constraint**: the `aboutAgentQuery` combines the dataType filter and the `tripleRangeQuery` for the agent IRI. This pushes all filtering into the index layer. No intermediate materialization of documents or lexicon rows.

2. **Phase 2** uses `cts.documentQuery` with the result IRIs — a simple index lookup.

3. The specific agent IRI is a **literal value** — no scan or join needed to resolve it.

---

## Optic Implementation (current, slow)

File: `scratch/subjectOfWork-aboutAgent-Optic.js`

### Annotated plan structure

```
[A] fromLexicons(uri, iri, dataType, frag)                   ← BASE: scan all work docs
      .where(dataType IN [LinguisticObject, VisualItem])      ← scope constraint

    .joinInner(                                                ← JOIN 1: outer hop
      [B] fromTriples(8350_s, about_or_depicts_work, 8350_o)  ← TRIPLE 1: outer predicate
        .joinInner(                                            ← JOIN 2: connect triple to doc
          [C] fromLexicons(8350_uri, 8350_iri, 8350_dataType)  ← INTERMEDIATE DOC: scan all work docs
            .where(8350_dataType IN [LinguisticObject, VisualItem])
            .joinInner(                                        ← JOIN 3: inner hop
              [D] fromTriples(eb01_s, about_or_depicts_agent, eb01_o)  ← TRIPLE 2: inner predicate
                .joinInner(                                    ← JOIN 4: resolve agent IRI
                  [E] fromLexicons(eb01_uri, eb01_iri, eb01_dataType)  ← AGENT DOC: scan all agent docs
                    .where(eb01_dataType IN [Person, Group])
                    .where(eb01_uri = 'specificPersonURI')     ← FILTER to single doc
                  , on(eb01_o = eb01_iri)                      ← match triple object to agent IRI
                ),
              on(8350_iri = eb01_s, 8350_frag = eb01_hopFrag)  ← co-locate triple with intermediate doc
            ),
          on(8350_triFrag = 8350_frag)                         ← co-locate outer triple with intermediate doc
        ),
      on(iri = 8350_o)                                         ← match result doc IRI to outer triple object
    )
    .groupBy([uri], [sample(dataType)])
    .select([id←uri, type←dataType])
```

### Component count

| Component | Count |
|---|---|
| `fromLexicons` | 3 ([A], [C], [E]) |
| `fromTriples` | 2 ([B], [D]) |
| `joinInner` | 4 |
| Total row sources | 5 |

---

## Identified Problems

### Problem 1 (Critical): Agent IRI resolution via full lexicon scan

**Component [E]** scans all Person/Group documents via `fromLexicons`, filters to the specific URI, then joins to the triple pattern to match the agent IRI.

**The CTS equivalent is a literal**: `sem.iri('personURI')`. No scan needed.

**Why this happens**: The `DocumentIdOrIri` pattern returns `op.eq(op.col(uriCol), termValue)` as a constraint. When this is processed as a child of `hopWithField` via recursive `processCriteria`, it generates a full `fromLexicons` plan for the agent scope, constrained by `op.eq(uri, value)`. The result is a plan that scans the entire agent lexicon just to produce one IRI.

**Optimization**: When the inner criterion is `{ iri: value }` (resolves to a single known IRI), use it as a **literal** in the triple pattern instead of joining to a lexicon:

```javascript
// Instead of joining to a full lexicon scan:
op.fromTriples([
  op.pattern(op.col(id + '_s'), predicates, op.col(id + '_o'), ...)
]).joinInner(fromLexicons(...).where(uri = value), on(id_o = iri))

// Use the IRI as a literal:
op.fromTriples([
  op.pattern(op.col(id + '_s'), predicates, sem.iri(value), ...)
])
```

This eliminates [E] entirely (1 `fromLexicons` + 1 `joinInner`).

**Applicability**: This optimization applies to both regular search and related lists. Any `hopWithField` or `hopInverse` whose innermost criterion is `{ iri: value }` can benefit. The `{ iri: value }` leaf is the universal pattern for related list searches. It may also be useful in regular search where a user searches by a specific entity URI.

**Conditionality**: The optimization applies when the inner criterion resolves to a deterministic IRI. When the inner child criteria are complex (nested hops, word queries, etc.), the full `processCriteria` recursion remains necessary.

### Problem 2 (Critical): Intermediate document lexicon scan is unnecessary

**Component [C]** creates a second `fromLexicons` for intermediate work documents. Its purpose is to:
1. Get the IRI and fragment for intermediate docs.
2. Provide a fragment join key to connect the two triple patterns.

**Why this is unnecessary**: Since triples are always stored on their subject document in LUX, the `fromTriples` call already identifies the correct fragment. Both triple patterns ([B] and [D]) share the same intermediate document (their subjects are the same entity). They can be connected through their shared subject column — no intermediate `fromLexicons` needed.

**Optimization**: Replace the two separate `fromTriples` + intermediate `fromLexicons` with a **single `fromTriples` with two patterns** sharing a subject column:

```javascript
op.fromTriples([
  op.pattern(op.col('inter_iri'), [about_or_depicts_work], op.col('result_iri')),
  op.pattern(op.col('inter_iri'), [about_or_depicts_agent], sem.iri(personURI)),
])
```

When multiple patterns are passed to `op.fromTriples`, MarkLogic constrains all patterns to the same document (same fragment). This replaces [B], [C], [D], [E] and all their joins with a single row source.

This eliminates [C] entirely (1 `fromLexicons` + 2 `joinInner`).

**Conditionality**: This optimization is specific to the case where both hops' triples are co-located on the same document. In HopInverse, the outer triple IS on the referenced (intermediate) document. The inner triple (from HopWithField) is also on the intermediate document. So for the `hopInverse → hopWithField` pair, this always holds.

### Problem 3 (Significant): Redundant fragment joins

The plan uses both IRI joins and fragment joins to connect components. Since triples are always co-located with their subject document, IRI joins alone are sufficient for correctness. The fragment joins add optimizer overhead.

For example:
```javascript
// Both of these joins in the aboutAgent plan:
op.on(op.col('8350_iri'), op.col('eb01_s')),           // IRI join (sufficient)
op.on(op.fragmentIdCol('8350_frag'), op.fragmentIdCol('eb01_hopFrag'))  // fragment join (redundant)
```

**Note**: There's a constant `PREFER_FRAG_JOINS = false` in engine.mjs, but `hopWithField` comments state it always uses fragment joins because "op.fromTriples doesn't return URIs." This is correct — but when the hop is resolvable via a literal IRI (Problem 1's fix), the fragment join becomes unnecessary.

### Problem 4 (Design): HopInverse lacks valuesOnly mode

The CTS implementation had a "values only" mode where, instead of building a full search, `cts.triples` was called directly to return IRIs. This is now implemented in `HopInverse.mjs` (see Implementation Status below).

In the Optic code:
- `relatedListsLib.mjs` sets `OPTION_NAME_RETURN_VALUES = true` for related lists.
- `HopInverse.apply()` reads this flag into `requestIsForValues` but **never acts on it**.
- There's a TODO: `"what would a valuesOnly implementation of this pattern look like?"`

**What this could look like**: A two-phase approach similar to `HopWithField.#processTransitiveHopWithFieldTerm`:

1. Execute the inner plan (the `hopWithField` half) to get intermediate IRIs.
2. Use those IRIs as `VALUES` in a SPARQL query or as literals in `op.fromTriples` to get the outer hop's results.
3. Return the result IRIs directly, bypassing the base `fromLexicons` and final `groupBy`/`select`.

This would mirror the CTS approach exactly:
- Phase 1: Constrained triple scan (inner criteria + inner predicate) → intermediate IRIs
- Phase 2: Triple scan (outer predicate) constrained to intermediate IRIs → result IRIs

---

## Proposed Optimal Optic Plan

After applying optimizations 1-3, the plan for `subjectOfWork-aboutAgent` should be:

```javascript
// Single combined triple scan with agent IRI as literal
const triplePlan = op.fromTriples([
  op.pattern(
    op.col('inter_iri'),
    [sem.iri('https://lux.collections.yale.edu/ns/about_or_depicts_work')],
    op.col('result_iri'),
  ),
  op.pattern(
    op.col('inter_iri'),
    [sem.iri('https://lux.collections.yale.edu/ns/about_or_depicts_agent')],
    sem.iri('https://lux.collections.yale.edu/data/person/43dfcd7e-0059-4539-9774-56d2b61c48bd'),
  ),
]);

// Base plan: only the result documents
const fullPlan = op.fromLexicons(
  { uri: cts.uriReference(), iri: cts.iriReference(), dataType: cts.fieldReference('anyDataTypeName') },
  null,
  op.fragmentIdCol('frag'),
)
  .where(op.in(op.col('dataType'), ['LinguisticObject', 'VisualItem']))
  .joinInner(triplePlan, op.on(op.col('iri'), op.col('result_iri')))
  .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);
```

**Component count:**

| Component | Before | After |
|---|---|---|
| `fromLexicons` | 3 | 1 |
| `fromTriples` | 2 | 1 |
| `joinInner` | 4 | 1 |
| Total row sources | 5 | 2 |

---

## Implementation Considerations

### Where optimizations live in the code

| File | Role |
|---|---|
| `src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs` | Outer hop pattern. Primary target for optimization. |
| `src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs` | Inner hop pattern. Already has two-phase precedent (`#processTransitiveHopWithFieldTerm`). |
| `src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs` | IRI leaf pattern. Currently returns lexicon constraint; could signal "literal IRI" to parent. |
| `src/main/ml-modules/root/lib/search/engine.mjs` | Plan assembly. `processCriteria`, `assembleOpticPlan`, `mergeTermPlanContributions`. |
| `src/main/ml-modules/root/lib/relatedListsLib.mjs` | Entry point for related list searches. Sets `OPTION_NAME_RETURN_VALUES`. |
| `src/main/ml-modules/root/lib/SearchCriteriaProcessor.mjs` | Orchestrator. `prepare()` → `execute()`. Has `#valuesOnly`, `appendValues()`, `getValues()`. |

### Regular search vs. related list search

The same patterns (`HopInverse`, `HopWithField`, `DocumentIdOrIri`) are used in both regular search and related list search. Optimizations should be conditional:

- **Literal IRI optimization** (Problem 1): Applies whenever the inner criterion is `{ iri: value }`. This is the universal pattern for related lists AND appears in regular search (e.g., "works about [specific person]").
- **Combined fromTriples** (Problem 2): Applies when both hops' triples are co-located. True for all `hopInverse → hopWithField` pairs. May need separate code path from the general case.
- **valuesOnly mode** (Problem 4): Related-list-specific. Controlled by `OPTION_NAME_RETURN_VALUES` flag, already plumbed through the system but not implemented.

### The broader goal

Before pursuing other ideas (single Optic plan for all of a related list's searches, SPARQL generation at deploy time), the priority is to understand and fix the per-search performance gap. If a single search can approach CTS performance (139ms vs 8,926ms), the total related list time improves dramatically.

---

## Data Model Facts

### Triple co-location

Triples are **always** stored on their subject document. This means:
- `fromTriples` fragment ID identifies the subject document.
- Two triple patterns with the same subject column, in a single `fromTriples` call, are constrained to the same document.
- Fragment joins to connect a triple's subject to a document are redundant when you already have the IRI.

### HopInverse vs. HopWithField direction

- **HopWithField**: Navigates from **subject to object**. The starting point is the subject document. Used as the inner hop in related lists — the `{ iri: value }` is the **object** (the specific entity).
- **HopInverse**: Navigates from **object to subject**. The result document's IRI matches the **object** of the outer triple. The triple itself lives on the intermediate document (the subject). Used as the outer hop in related lists.

For the `subjectOfWork-aboutAgent` example:
```
[HopInverse outer]                     [HopWithField inner]
Result ←(about_or_depicts_work obj)← IntermediateDoc →(about_or_depicts_agent obj)→ Person
         subject = IntermediateDoc                      subject = IntermediateDoc
         object  = Result                               object  = Person (known IRI)
```

Both triples have `IntermediateDoc` as their subject, so both live on the intermediate document.

### Predicate cardinalities

Key predicates used in related list searches with estimated document counts:

| Predicate | Est. documents |
|---|---|
| `lux:about_or_depicts_agent` | 2,951,808 |
| `lux:about_or_depicts_concept` | 10,663,730 |
| `lux:about_or_depicts_work` | 560,814 |
| `lux:about_or_depicts_event` | 1,763,751 |
| `lux:about_or_depicts_place` | 5,479,707 |
| `lux:agentOfCreation` | 13,966,460 |
| `la:member_of` | 20,404,403 |
| `lux:carries_or_shows` | 15,766,917 |
| `lux:itemClassifiedAs` | 20,101,189 |
| `lux:workClassifiedAs` | 14,963,032 |

These are large. Unconstrained triple scans on these predicates are expensive. The key to performance is pushing constraints into the triple scan (as CTS does with `cts.triples(... , constraintQuery)`) rather than scanning first and joining later.

---

## Key Source Files

| File | Purpose |
|---|---|
| `scratch/subjectOfWork-aboutAgent-CTS.js` | CTS reference implementation (139ms) |
| `scratch/subjectOfWork-aboutAgent-Optic.js` | Current Optic implementation (8,926ms) |
| `scratch/relatedListsConfigLatest.mjs` | Full generated related lists config |
| `scratch/searchTermsConfigLatest.mjs` | Full generated search terms config |
| `src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs` | HopInverse pattern (outer hop) |
| `src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs` | HopWithField pattern (inner hop) |
| `src/main/ml-modules/root/lib/search/patterns/DocumentIdOrIri.mjs` | IRI/document ID pattern (leaf) |
| `src/main/ml-modules/root/lib/search/engine.mjs` | Plan assembly (`processCriteria`, `assembleOpticPlan`) |
| `src/main/ml-modules/root/lib/relatedListsLib.mjs` | Related list execution orchestration |
| `src/main/ml-modules/root/lib/SearchCriteriaProcessor.mjs` | Search orchestrator |
| `docs/optic-lessons.md` | Accumulated lessons about Optic plan construction |
| `docs/lux-optic-llm-primer.md` | LLM-oriented primer on the Optic search engine |

---

## Open Questions

1. **Combined `fromTriples` with CTS constraint**: Can `op.fromTriples` accept a CTS query constraint (via `.where(cts.query)`) that pushes filtering into the index layer the way `cts.triples` does? If so, this would allow the intermediate document's dataType to be verified without a lexicon join.

2. **SPARQL VALUES limit**: The transitive `HopWithField` embeds IRIs as SPARQL `VALUES`. Is there a practical limit? Related list searches cap at `relationshipsPerRelation` (configurable, max enforced by backend), but regular search could produce larger result sets.

3. **Single-plan for all searches**: Could all of a related list's searches (up to 50) be combined into one Optic plan? Before pursuing this, per-search performance must be understood. A key challenge: each search represents a distinct relation that must be identifiable in results.

4. **SPARQL generation at deploy time**: Could the build system generate SPARQL queries (or combined SPARQL) for related lists instead of JSON criteria? Challenge: retaining relation identification when searches are combined.

---

## Implementation Status

### Implemented: HopWithField Literal IRI Optimization (Problem 1)

**File:** `src/main/ml-modules/root/lib/search/patterns/HopWithField.mjs`

When the child criteria is `{ iri: value }` or `{ id: value }` (a single known IRI), the `#processHopWithFieldTerm` method now short-circuits: instead of recursing into `processCriteria` to build a full `fromLexicons` plan for the target scope, it uses `sem.iri(value)` directly as the object in the `op.fromTriples` pattern.

**Detection:** `SCP.getChildId(termValue)` extracts the IRI string from `termValue.id` or `termValue.iri` when the value is a string; returns `null` otherwise. This static method is shared by both `HopWithField` and `HopInverse`.

**Applicability:** Both regular search and related lists. Any `hopWithField` term with a `{ iri: value }` leaf benefits. This is the universal pattern for all 298 related list searches.

**What it eliminates:** 1 `fromLexicons` (target scope scan) + 1 `joinInner` per such term.

### Implemented: HopInverse cts.triples valuesOnly Mode (Problems 2, 3, 4)

**Files:**
- `src/main/ml-modules/root/lib/search/patterns/HopInverse.mjs`
- `src/main/ml-modules/root/lib/SearchCriteriaProcessor.mjs`
- `src/main/ml-modules/root/lib/relatedListsLib.mjs`

When `OPTION_NAME_RETURN_VALUES` is true and the search term is top-level, `HopInverse.#processValuesOnly` bypasses all Optic plan construction and SPARQL compilation, using `cts.triples` directly for both hops:

**Phase 1 (inner hop):** `cts.triples([], childPredicates, sem.iri(childId))` — find subjects of triples matching the child predicates with the known IRI as object.

**Phase 2 (outer hop):** `cts.triples(innerSubjects, outerPredicates, [])` — navigate from those subjects via the outer predicates to find related IRIs.

Results are deduplicated via a `Set`, the self-IRI is excluded via `OPTION_NAME_EXCLUDE_SELF_IRI` (set by `relatedListsLib.mjs` to the requesting document's URI), and values are appended via `scp.appendValues()`.

**Guard clause:** If the child criteria does not resolve to a direct IRI (via `SCP.getChildId()`), an `InternalServerError` is thrown. All 298 current related list searches use `{ iri: value }` leaf criteria, so this is a configuration error.

**SearchCriteriaProcessor changes:**
- `static getChildId(termValue)`: Extracts `termValue.id` or `termValue.iri` when the value is a string.
- `static getFirstNonOptionPropertyName(criteria)`: Returns the first property name that doesn't start with `_`.
- `executeForValues()`: Runs `processCriteria()` to trigger pattern processing (populating values via `appendValues()`), then returns `this.#values` without executing the expensive Optic plan.

**relatedListsLib.mjs changes:**
- `valuesOnly` branch calls `scp.executeForValues()` instead of `execute().getSearchResults()`.
- Sets `OPTION_NAME_EXCLUDE_SELF_IRI` to the requesting document's URI on `patternOptions`.

**Performance result:**

| Metric | CTS | Optic (before) | Optic (after) |
|---|---|---|---|
| Time (50 searches) | ~300 ms | 8,926 ms | **269 ms** |
| Ratio vs CTS | 1x | 30x slower | **0.9x (faster)** |

**What it eliminates:** All `fromLexicons`, `fromTriples`, `fromSPARQL`, `joinInner`, `groupBy`, and `select` operations for valuesOnly mode. Zero Optic plans compiled. Zero SPARQL queries compiled. The bottleneck was plan/SPARQL compilation overhead (~45ms each × 50+ searches), not data volume.

### Combined Effect for Related Lists

With both optimizations active, the `subjectOfWork-aboutAgent` search executes as:

```javascript
// Phase 1: Inner hop — cts.triples, no plan compilation
cts.triples([], [about_or_depicts_agent], sem.iri(personURI), '=', ['eager', 'concurrent'])
// → intermediate subject IRIs

// Phase 2: Outer hop — cts.triples, no plan compilation
cts.triples(intermediateSubjects, [about_or_depicts_work], [], '=', ['eager', 'concurrent'])
// → result IRIs (deduplicated, self-IRI excluded)
```

| Component | Before | After |
|---|---|---|
| `fromLexicons` | 3 | 0 |
| `fromTriples` | 2 | 0 |
| `fromSPARQL` | 0 | 0 |
| `joinInner` | 4 | 0 |
| `cts.triples` calls | 0 | 2 |
| Plan compilations | 1 | 0 |
| Total row sources | 5 | 0 |

### Not Yet Implemented

- **Non-valuesOnly literal IRI optimization in HopInverse:** When not in valuesOnly mode but the child criteria is a literal IRI, both hops could be resolved via `cts.triples` and injected as `op.fromLiterals`, avoiding the inner `processCriteria` call. This path only compiles one plan so the savings are smaller, but it could still matter for latency-sensitive queries. A TODO comment in `HopInverse.apply()` documents this.
- **Problem 2 (Combined fromTriples) for non-valuesOnly:** Merging inner and outer triple patterns into a single `fromTriples` call in the plan-based path. The `cts.triples` approach in valuesOnly mode sidesteps this entirely.
- **Problem 3 (Redundant fragment joins) for non-valuesOnly:** Fragment joins remain in the non-valuesOnly HopInverse path and in the inner HopWithField plan.
