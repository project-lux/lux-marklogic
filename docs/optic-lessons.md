# Optic Module Lessons Learned

This is a copy of an LLM memory file, which augments optic-lessons.md

## Optic plan AST cost dominates large CTS payloads (cold-start)
- The Optic optimizer walks/costs/rewrites the plan AST on every cold execution. If the AST contains a CTS node with a large literal payload (e.g. `cts.tripleRangeQuery` listing 10K+ IRIs), that AST traversal becomes the cold-path bottleneck — NOT search, NOT ranking, NOT retrieval.
- Reference: "woman greek art" keyword search. Native `cts.search` with the same query: ~1.6s cold. Standard Optic plan around it: ~4.9s cold. The ~3.3s gap is pure optimizer/AST cost.
- Mitigation: page-slice hydration path — run `cts.search` outside Optic, hydrate only the page slice through a tiny `op.fromParam` plan. See `src/main/ml-modules/root/lib/search/keywordPageSlice.mjs` and `docs/search-cold-start-mitigation.md`.
- Plan caching helps warm but not cold; distinct keyword queries produce distinct ASTs that the cache can't keep all of under diverse load.
- Lazy vs eager IRI resolution into `cts.tripleRangeQuery` is NOT the bottleneck (tested). The cost is the AST node containing the literal values, not how they got there.

## Code Formatting for Debug Logs  
- `getPlanSource()` aggressively flattens whitespace with `.replace(/\s+/g, ' ')` making logged code unreadable
- Added `getPlanSourceFormatted()` for debug logs that preserves meaningful formatting
- Added `formatSparqlForLogging()` for readable SPARQL in logs
- **SPARQL Quote Conflicts**: SPARQL strings contain single quotes, so `op.toSource()` wrapping them in single quotes breaks syntax
- **Literal \n Issue**: `op.toSource()` returns literal `\n` strings instead of actual newlines
- **Solution**: Detect SPARQL strings and wrap in backticks, convert literal `\n` to actual newlines
- Keep original `getPlanSource()` compact for execution contexts where space matters

## xdmp.eval inside xdmp.invokeFunction returns null for sem.iri
- `fn.head(xdmp.eval(...))` returning `op.prefixer(...)("term")` produces null when called inside an amp'd `xdmp.invokeFunction` context (e.g., port 8003 security wrappers).
- Direct test calls (port 8010) worked fine because no invokeFunction wrapping.
- Fix: use module-level prefixers directly with regex parsing instead of eval.
- Null predicates in `op.fromTriples` match ALL triples, causing massive result inflation.

## outputCols rename must be root-only
- `op.as('id', op.col('uri'))` fails in recursive calls where column is `parentId + '_uri'`.
- Gate with `if (!parentId)` to only apply at root level.

## OR pattern join wrapping needs uriCol
- When wrapping pattern joins for OR (duplicate lexicon → inner join → full outer), select must include `uriCol` so `groupBy(['uri'])` sees documents entering only through that path.
- Including `fragCol` alongside is harmless and may help D-Node pushdown.

## Build pipeline: lux-modules vs lux-test-modules
- Port 8003 uses `lux-modules`, port 8010 uses `lux-test-modules`
- `resetTestModulesDatabase` copies main→test, `deleteTestModulesFromMain` cleans up
- Module divergence is a common source of "works in tests, fails in Postman"


## AND + OR sub-plans: use existsJoin, not joinInner
- OR sub-plans (e.g. keyword expanding to `OR: [keywordNoHop, referencedBy]`) can produce multiple rows per document when the hop matches multiple triples.
- `joinInner(groupBy(singleColSelect(), []))` deduplicates but causes MarkLogic to merge chained groupBy sub-plans into one SPARQL query with multiple GROUP BY clauses → XDMP-EXTIME.
- `existsJoin(select(singleColSelect()))` is a semi-join: keeps left rows with any match, no row multiplication, no GROUP BY generated. Correct for `and → OR` in `buildConjunction`.
- `cts.iriReference()` only returns IRIs for documents that are triple **subjects** — never for triple objects (e.g. Set docs referenced via `la:member_of`). Use `sem.iri(literalValue)` as the triple object in `op.fromTriples` pattern instead.

## AND'd keyword OR-wraps: chain via joinInner on UNIQUELY-NAMED uri columns
- Original chained `joinInner(orWrappedSubPlan_A, orWrappedSubPlan_B, on(uri, ..._uri))` shape silently returned 0 (and `existsJoin` SPARQL-mismatched). Cause: each OR-wrap exposed `iri`, `frag`, `dataType` to the outer plan; the SPARQL emitter fused both branches into one block and the bookkeeping collapsed.
- Fix that worked: reduce each OR-wrap to a SINGLE column with a per-branch unique name (e.g. `kw_w_outUri`, `kw_g_outUri`), dedup with `groupBy([outUri], [])`, then combine with `joinInner(other, op.on(kw_w_outUri, kw_g_outUri))`. Per-branch unique naming is critical: shared column names give the merger something to fuse on.
- `intersect` works too but is strict set semantics — same column NAME and VALUE on both sides. Cannot carry per-branch scores forward (no place to put them). Use `joinInner` shape when scoring is needed.
- Verified: 2-keyword AND, 59 results, 270–624 ms (vs 45 ms CTS counterpart). See `scratch/womanGreekMemberOf-joinUri.js`.
- DOES NOT compose: `op.union` of `2^n` AND-of-OR distributed branches works functionally but is non-scalable (~2 s for n=2) and grows combinatorially.

## op.fromSearch / fromSearchDocs in chained shape: SPARQL fusion → MEMCANCEL
- Substituting `fromSearchDocs(query)` for the `fromLexicons.where(cts...)` left leaf of the OR-wrap blew memory: the entire multi-branch plan (per-branch groupBys + cross-branch joinInner + outer member_of hop + final groupBy) fused into ONE SPARQL block. The cross-branch `FILTER (kw_w_outUri eq kw_g_outUri)` was applied AFTER computing the Cartesian of both branches.
- `fromSearchDocs` hardcodes the fragmentId column name to `fragmentId` (it desugars to `fromSearch(query, ['confidence','fitness','fragmentId','quality','score'], qualifier, options).orderBy(desc('score')).joinDocAndUri('doc','uri', fragmentIdCol('fragmentId'))`). For multiple keywords you'd need explicit `fromSearch` to alias the fragment column per branch.
- See `scratch/womanGreekMemberOf-fromSearch.js` for the abandoned attempt.

## op.fromSearch for relevance sorting (implemented)
- `op.fromSearch(query, cols, qualifierName, option)` takes MAX 4 args. Score method goes in 4th param as `{ scoreMethod: 'logtfidf' }` (not a 5th arg, not prefixed with `score-`).
- `op.fromSearch` only accepts `fragmentId` and `score` as column names — custom names cause `OPTIC-INVALARGS: unknown column name for fromSearch()`.
- **Column collision**: When both a top-level plan and a sub-plan (e.g., hopInverse) use `op.fromSearch`, both produce `fragmentId` and `score` columns. On `joinInner`, Optic treats same-named columns as implicit join conditions — cross-scope fragmentId values never match → 0 results.
- **Fix**: Use `op.fromSearch` + `joinInner` ONLY at the top level when `areScoresRequired()` is true. All other plans use `plan.where(ctsQuery)`. Sub-plans never carry extra `fragmentId`/`score` columns.
- Join uses `op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol('fragmentId'))` — must use `op.fragmentIdCol` wrappers on both sides (matches codebase convention for all fragment-to-fragment joins).
- Relevance sort branch in `buildSortedResultsPlan` is guarded by three conditions: `sortCriteria?.areScoresRequired() && hasScoreContributingCriteria && acc.ctsConstraints.length > 0`. All must be true for `op.fromSearch` to be used.
- Score aggregation uses `op.max('score', op.col('score'))` with a TODO comment about max vs sum.

## propertyValue in Optic must avoid CTS field-value search
- `anyDataTypeName` is available via `cts.fieldReference(...)` for Optic lexicon plans but field-value searches are not enabled in this database.
- In `lib/search/optic.mjs`, `propertyValue` / `recordType` under OR or NOT must stay in Optic space via a lexicon-backed join, not `cts.fieldValueQuery(...)` or `op.fromSearch(...)`.
- Keep legacy `recordType` normalization: scope names like `item` expand to that scope's concrete types, otherwise case-normalize the provided type.


## assemblePlan is cheap to call twice
- `assemblePlan` only constructs an Optic plan object from a pre-populated accumulator. The expensive work (pattern contributions, transitive hop inner-query executions in `HopWithField`) is already captured in `acc` before assembly.
- Calling `assemblePlan` twice on the same (or shallow-copied) accumulator does NOT re-execute pattern searches — safe for producing variant plans (e.g., with/without sort lexicons).
- Original implementation mutated `acc.distanceCols` as a side effect during patternJoins processing. Removed this to make the function safe for repeated calls. If distance columns are re-added, collect them as a return value rather than mutating `acc`.

## Optic plans are immutable — reassign or lose the result
- Every Optic method (`.joinInner()`, `.where()`, `.select()`, `.orderBy()`, etc.) returns a NEW plan. The original is unchanged.
- Common bug: calling `plan.joinInner(...)` without `plan = plan.joinInner(...)` silently discards the join.
- Same applies to `fromLexicons` chains: `mainPlan.joinInner(lexiconPlan, ...).select(...)` must be reassigned.

## Sort lexicons contaminate the base plan
- Adding sort field references to `acc.lexicons` before `assemblePlan` means the `fromLexicons` call includes sort indexes, which constrains results to documents that have those index values and adds cost.
- Solution (Option D): build the constraint plan from the original accumulator, then shallow-copy `acc.lexicons` with sort fields for a separate sorted plan. `processCriteria` returns `{ plan, constraintPlan }` at top-level; facets use `constraintPlan`, search results use `plan`.

## cts.estimate() returns xs.unsignedLong, not a JS number
- `xs.unsignedLong(0)` is an object → truthy, so `|| 0` fallback doesn't trigger
- `xs.unsignedLong(0) === 0` is false (strict equality fails across types)
- `xs.unsignedLong(0) == 0` is true (loose equality coerces)
- Serializes correctly as `0` in JSON, hiding the problem in output
- Fix: wrap in `Number(cts.estimate(...))` when you need JS number semantics
- Original scripts used `==` (loose equality) which masked this


## Function naming conventions
- Exported functions: no underscore prefix (e.g., `invokeAsUnit`)
- Private functions: single underscore prefix (e.g., `_handleRequestV2`)
- Amp'd private functions: double underscore prefix (e.g., `__handleRequestV2`)
- Class private methods: use `#` (e.g., `#myMethod`)


## Do NOT call prepare() in benchmark scripts
- `plan.prepare(optimizeLevel)` forces re-optimization on every call, adding ~140ms to each warm run.
- Without explicit `prepare()`, MarkLogic caches the optimized plan and reuses it on subsequent executions.
- Optic baseline warm results: **178ms with prepare(1)** → **32-37ms without** (4.8-5.6× faster).
- With prepare() removed, Optic warm (32-37ms) is **2.7× faster** than CTS (93-98ms).
- The production code does not call `prepare()` — this was only in standalone benchmark scripts.
- Omit `prepare()` from all future benchmark scripts to reflect production behavior.
- `prepare()` is still useful for one-shot plan inspection (e.g., capturing the actual plan XML via `xdmp.plan(plan.prepare(1))`).
- Benchmark templates: `scratch/performance/TEMPLATE-cts-benchmark.js` and `TEMPLATE-optic-benchmark.js`.

## CTS baseline uses lazy IRI resolution; Optic baselines used eager — NO DIFFERENCE
- The CTS benchmark passes `cts.values()` Sequence directly to `cts.tripleRangeQuery` via `fn.insertBefore()` — no `.toArray()`.
- The Optic baseline scripts called `.toArray()`, materializing 49K IRIs into a JS array.
- Theory M tested passing the lazy Sequence — **no improvement** (3,804-3,891ms cold vs baseline 3,855-3,868ms).
- Conclusion: `cts.tripleRangeQuery` eagerly materializes all IRI values into the plan AST regardless of whether the input is Array or Sequence. The `.toArray()` call is not the bottleneck.

## The 49K-IRI cold-start penalty is plan optimization, not IRI resolution
- Theory E phase timing without prepare(): IRI resolution=131-140ms, plan build=37ms, execute (includes implicit optimization)=3,845-3,921ms.
- The 3.8s is the Optic optimizer processing a plan AST containing 49K IRI literals. The CTS implementation uses the same IRIs but doesn't route through the Optic optimizer — queries go directly to the search engine.
- Theory D (non-semantic only, no IRIs in plan): cold=267ms. Confirms: remove tripleRangeQuery from the plan AST → 14× faster cold.
- This is not about "getting" the IRIs (that's 131ms). It's about the optimizer traversing/analyzing/costing a plan node containing 49K literal values.

## Cache clearing commands
- `xdmp.forestClearCaches()` does NOT exist.
- Use: `xdmp.programCacheClear()` + `xdmp.groupCacheClear(xdmp.group("Default"), ["compressed-tree-cache", "expanded-tree-cache", "list-cache"])`
- Tree caches are not in play for index-only queries (no document retrieval, no filtered queries). Selective clearing of program cache and/or list cache may be more realistic for lukewarm testing.

## Cold-start is the dominant real-world metric for keyword queries
- Each distinct keyword query produces a unique CTS query (different IRIs → different plan).
- Under diverse production load, MarkLogic's plan cache likely cannot retain all distinct plans.
- 5K serialized test (4,634ms avg) aligns with cold-start (4,043ms) — plan cache doesn't help much.
- Warm numbers (29-37ms) only apply when the exact same query repeats before plan cache eviction.

## Two-pass pipeline: same-type flattening prevents inlining bugs
- Pass 1 (`analyzeCriteria.mjs`) flattens AND-in-AND and OR-in-OR at analysis time, before the criteria tree is frozen.
- Pass 2's 3×3 conjunction matrix never encounters same-type nesting (reduced from 9 to 7 cases).
- This eliminates a class of bugs where runtime inlining (pushing into a mutable `criteria[]` array mid-loop) interacted poorly with CTS fold eligibility and score propagation.
- Single-branch OR→AND collapse triggers a post-collapse sweep that re-flattens any same-type children introduced by the rewrite.

## Score propagation must live on nodes, not be re-derived
- `hasScoreContributingCriteria` is stored on each group node at analysis time and frozen.
- Pass 2 reads it directly from `analysis.hasScoreContributingCriteria` — no re-traversal.
- Before this was fixed, scoring leaves inside nested ORs failed to bubble up to the top-level `fromSearch` gate. The symptom: `plan.where()` was used (no scoring) when `op.fromSearch` should have been used.
- Root cause: the old code derived the flag by checking only immediate children, not the full subtree.
- Fix: each `analyzeConjunction` sub-call propagates its `hasScoreContributingCriteria` upward via `||=`.

## Separation of concerns: analysis vs. construction
- Validation, tokenization, stop-word detection, search-option resolution, and tree normalization belong in Pass 1 (pure data, no Optic API calls).
- Plan construction (pattern `apply()`, `fromLexicons`, `assemblePlan`) belongs in Pass 2.
- This separation prevents optimizations from being forced into non-ideal locations due to execution flow/order. Example: CTS fold eligibility depends on tree shape; normalizing that shape in the same pass that builds plans creates ordering dependencies.
- The criteria tree is an immutable inspectable artifact — useful for testing analysis logic without needing Optic/MarkLogic at all.

## op.fromSearch score gate requires three conditions
- `op.fromSearch` + `joinInner` (for relevance scoring) is only used when ALL three are true:
  1. `sortCriteria.areScoresRequired()` — relevance sort requested
  2. `hasScoreContributingCriteria === true` — at least one leaf contributes scores
  3. `acc.ctsConstraints.length > 0` — there are CTS constraints to score against
- Only `Keyword` and `IndexedWord` patterns set `contributesScore: true` on their leaf nodes.
- When any condition is false, `plan.where(ctsQuery)` is used — simpler plan, no score column, no `joinInner` overhead.
