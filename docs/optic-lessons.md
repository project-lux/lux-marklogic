# Optic Module Lessons Learned

## Code Formatting for Debug Logs  
- `getPlanSource()` aggressively flattens whitespace with `.replace(/\s+/g, ' ')` making logged code unreadable
- **SPARQL Quote Conflicts**: SPARQL strings contain single quotes, so `op.toSource()` wrapping them in single quotes breaks syntax
- **Literal \n Issue**: `op.toSource()` returns literal `\n` strings instead of actual newlines
- Potential improvement: a formatted variant that detects SPARQL strings and wraps in backticks, converts literal `\n` to actual newlines

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


## AND + OR sub-plans: row multiplication and deduplication
- OR sub-plans (e.g. keyword expanding to `OR: [keywordNoHop, referencedBy]`) can produce multiple rows per document when the hop matches multiple triples.
- `joinInner(groupBy(singleColSelect(), []))` deduplicates but causes MarkLogic to merge chained groupBy sub-plans into one SPARQL query with multiple GROUP BY clauses → XDMP-EXTIME.
- Current approach in `buildConjunctionJoin`: uses `notExistsJoin` for NOT branches and `groupBy` with deferred sub-plans for AND-of-OR.
- `cts.iriReference()` only returns IRIs for documents that are triple **subjects** — never for triple objects (e.g. Set docs referenced via `la:member_of`). Use `sem.iri(literalValue)` as the triple object in `op.fromTriples` pattern instead.

## AND'd keyword OR-wraps: chain via joinInner on UNIQUELY-NAMED uri columns
- Original chained `joinInner(orWrappedSubPlan_A, orWrappedSubPlan_B, on(uri, ..._uri))` shape silently returned 0 (and `existsJoin` SPARQL-mismatched). Cause: each OR-wrap exposed `iri`, `frag`, `dataType` to the outer plan; the SPARQL emitter fused both branches into one block and the bookkeeping collapsed.
- Fix that worked: reduce each OR-wrap to a SINGLE column with a per-branch unique name (e.g. `kw_w_outUri`, `kw_g_outUri`), dedup with `groupBy([outUri], [])`, then combine with `joinInner(other, op.on(kw_w_outUri, kw_g_outUri))`. Per-branch unique naming is critical: shared column names give the merger something to fuse on.
- `intersect` works too but is strict set semantics — same column NAME and VALUE on both sides. Cannot carry per-branch scores forward (no place to put them). Use `joinInner` shape when scoring is needed.
- DOES NOT compose: `op.union` of `2^n` AND-of-OR distributed branches works functionally but is non-scalable (~2 s for n=2) and grows combinatorially.

## op.fromSearch / fromSearchDocs in chained shape: SPARQL fusion → MEMCANCEL
- Substituting `fromSearchDocs(query)` for the `fromLexicons.where(cts...)` left leaf of the OR-wrap blew memory: the entire multi-branch plan (per-branch groupBys + cross-branch joinInner + outer member_of hop + final groupBy) fused into ONE SPARQL block. The cross-branch `FILTER (kw_w_outUri eq kw_g_outUri)` was applied AFTER computing the Cartesian of both branches.
- `fromSearchDocs` hardcodes the fragmentId column name to `fragmentId` (it desugars to `fromSearch(query, ['confidence','fitness','fragmentId','quality','score'], qualifier, options).orderBy(desc('score')).joinDocAndUri('doc','uri', fragmentIdCol('fragmentId'))`). For multiple keywords you'd need explicit `fromSearch` to alias the fragment column per branch.
- Set aside for now: scoring isn't yet needed. Recommended future approach: keep the `joinUri` shape for set membership, score separately by running a top-level `cts.search` over the AND'd `cts` query and joining scores back to the URI list — scoring becomes a separate concern from set-intersection.

## propertyValue in Optic must avoid CTS field-value search
- `anyDataTypeName` is available via `cts.fieldReference(...)` for Optic lexicon plans but field-value searches are not enabled in this database.
- The `propertyValue` pattern was subsumed by `indexedValue`. The underlying lesson remains: OR/NOT branches must stay in Optic space via lexicon-backed joins, not `cts.fieldValueQuery(...)` or `op.fromSearch(...)`.
- Keep legacy `recordType` normalization: scope names like `item` expand to that scope's concrete types, otherwise case-normalize the provided type.


## assembleOpticPlan is cheap to call twice
- `assembleOpticPlan` only constructs an Optic plan object from a pre-populated accumulator. The expensive work (pattern contributions, transitive hop inner-query executions in `HopWithField`) is already captured in `acc` before assembly.
- Calling `assembleOpticPlan` twice on the same (or shallow-copied) accumulator does NOT re-execute pattern searches — safe for producing variant plans (e.g., with/without sort lexicons).
- Original implementation mutated `acc.distanceCols` as a side effect during patternJoins processing. Removed this to make the function safe for repeated calls. If distance columns are re-added, collect them as a return value rather than mutating `acc`.

## Optic plans are immutable — reassign or lose the result
- Every Optic method (`.joinInner()`, `.where()`, `.select()`, `.orderBy()`, etc.) returns a NEW plan. The original is unchanged.
- Common bug: calling `plan.joinInner(...)` without `plan = plan.joinInner(...)` silently discards the join.
- Same applies to `fromLexicons` chains: `mainPlan.joinInner(lexiconPlan, ...).select(...)` must be reassigned.

## Sort lexicons contaminate the base plan
- Adding sort field references to `acc.lexicons` before `assembleOpticPlan` means the `fromLexicons` call includes sort indexes, which constrains results to documents that have those index values and adds cost.
- Solution (Option D): build the constraint plan from the original accumulator, then shallow-copy `acc.lexicons` with sort fields for a separate sorted plan. `processCriteria` returns `{ plan, constraintPlan }` at top-level; facets use `constraintPlan`, search results use `plan`.

## cts.triples beats Optic plans for repeated triple lookups
- For related lists, the bottleneck was **plan/SPARQL compilation overhead** (~45ms each), not data volume. With 50 searches per related list, that's ~2,250ms of pure compilation.
- `cts.triples(subjects, predicates, objects, '=', ['eager', 'concurrent'])` performs the same triple index lookup as `op.fromTriples` but with zero plan compilation.
- Two `cts.triples` calls (inner hop + outer hop) replaced the entire Optic plan: 0 `fromLexicons`, 0 `fromTriples`, 0 `joinInner`, 0 `groupBy`. Result: 269ms for 50 searches (vs ~300ms CTS, vs 8,926ms original Optic).
- `sem.iri()`, `sem.tripleSubject()`, `sem.tripleObject()`, `fn.string()` are MarkLogic globals — no imports needed.
- `sem.iri` objects use reference equality, not string equality. Use `fn.string(sem.iri(...))` before comparing with `===` or `Set`/`Array.includes`.
- This optimization only applies when results are IRI values (valuesOnly mode). For plan composition (normal search), Optic's join-based approach is necessary.
- See `docs/optic-related-list-performance.md` for full analysis.

## Literal IRI detection: centralize in SearchCriteriaProcessor
- When child criteria is `{ iri: value }` or `{ id: value }`, patterns can short-circuit expensive plan construction.
- `SCP.getChildId(termValue)` extracts the IRI string from `termValue.id` or `termValue.iri`; returns `null` otherwise.
- Used by both `HopWithField` (uses `sem.iri(childId)` directly in `op.fromTriples` pattern) and `HopInverse` (uses it in `cts.triples` calls).
- Previously each pattern had its own extraction logic (`#extractLiteralIri`). Centralizing avoids drift.
