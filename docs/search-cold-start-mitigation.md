# Search Cold-Start Mitigation: Page-Slice Hydration

## Audience

Mixed: written for engineering review and for sharing with non-engineering
stakeholders. Section 1 is the executive summary; Sections 2–6 add technical
depth.

---

## 1. Executive Summary

A common keyword search — *"woman greek art"* against the `item` scope — was
taking roughly **4.9 seconds** on a cold cache and **0.66 seconds** when warm.
A targeted change to the way the request is executed reduced those numbers to
roughly **2.8 seconds cold** and **0.20 seconds warm**, with no change to the
results the user sees and no change to MarkLogic, the indexes, or the data.

| Metric (n=3 cold, n=10 warm) | Before | After | Change |
| --- | --- | --- | --- |
| Cold average | 4,898 ms | 2,762 ms | **−2,136 ms / 1.77× faster** |
| Warm average | 656 ms | 202 ms | **−454 ms / 3.25× faster** |
| Warm standard deviation | 70 ms | 3 ms | **~23× more consistent** |

Result correctness was verified separately: the two execution paths return
the same total match count (10,105 vs. 10,105), the same per-document
relevance scores byte-for-byte, and the same top-of-page ordering except
where scores are exactly tied (and tie-break order is not contractual on
either path).

The change is currently behind a build-time toggle, narrowly scoped to
plain text-keyword searches, and ships off by default while it is evaluated.

### Why this is interesting beyond "a 2-second win"

- The **warm-path variance collapse** (stddev 70 ms → 3 ms) is arguably as
  valuable as the average speedup. Variance is what users perceive as "the
  system is slow today"; making warm responses predictable improves the
  felt quality of the application even when the average is already
  acceptable.
- The technique is not, in principle, specific to keyword searches. The
  underlying observation generalizes (see §3), but applying it broadly is
  not free (see §4).

---

## 2. What Was Actually Happening

LUX builds its searches as **Optic** plans. Optic is MarkLogic's relational
query engine, and it is the right tool for almost everything LUX does: joins
across record types, hops along relationships, faceting, sort by indexed
values, etc. For those workloads the Optic optimizer pays for itself many
times over.

For a plain keyword search like *"woman greek art"*, however, the situation
is unusual. To support relevance over both indexed text fields *and* the
graph (e.g. a Set's member documents), the keyword pattern produces a
`cts.tripleRangeQuery` that lists **every IRI** that participates in the
match — in this case about **49,000 IRIs**. Optic then has to build a query
plan whose abstract syntax tree (AST) contains all 49,000 of those literal
values as a single node. The optimizer walks, costs, and rewrites that node
on every cold execution. That AST traversal — not the search itself, not the
ranking, not retrieving the documents — is what was taking roughly 2.4
seconds.

### The smoking gun: native CTS does the same work in ~1.6 seconds

The most important piece of evidence in this investigation is also the
simplest. The exact same matching and ranking work — same query, same
indexes, same 49,000 IRIs, same final 10,105 matched documents, same
relevance scores — runs in **~1.6 seconds cold** when executed directly
via `cts.search`, *outside* Optic.

| Path | Cold | What it does |
| --- | --- | --- |
| Native `cts.search` only | ~1,600 ms | Match + rank, no plan, no AST |
| Page-slice hydration (new) | ~2,760 ms | `cts.search` + tiny Optic hydration |
| Standard Optic (current) | ~4,900 ms | Full Optic plan around the CTS payload |

In other words, **roughly half of the cold-path time on the standard route
is Optic overhead that produces no additional information** — the index has
already determined the matches and computed the scores by the time Optic's
optimizer gets involved. The new path closes most of that gap. The small
remaining delta between native CTS (1.6 s) and page-slice hydration (2.8 s)
is the production scaffolding around the call (per-term construction,
separate `cts.values` lookups per AND'd term) plus the tiny hydration plan
itself; there is likely more to recover later, but it is a second-order
opportunity.

This is not a subtle finding. A 3.3-second gap between the index's own
relevance-ranked answer and the answer the application returns — for a
workload that is, conceptually, exactly what the index is built for — is
the core problem this work addresses.

---

## 3. The Change: Page-Slice Hydration

The new execution path does the following:

1. Build the same CTS query the standard path would have built.
2. Run that query directly against the index using `cts.search`, which is
   lazy and returns results pre-sorted by relevance.
3. Take only the slice the user will actually see — `page × pageLength`
   documents, e.g. the first 20 for page 1.
4. Hand that small slice of URIs and scores into a **tiny** Optic plan
   whose only job is to attach the `dataType` column needed for rendering.
5. Use `cts.estimate` for the displayed total match count.

Conceptually we are still using Optic — just for the cheap part (hydrating
a handful of rows) rather than the expensive part (wrapping a 49,000-IRI
CTS node in an AST).

### Why the name "page-slice hydration"

An earlier working name, "hybrid," correctly described *how* the path
works (a mix of `cts.search` and Optic) but said nothing about *why* it is
faster, and it invited a misreading as a data cap. "Page-slice hydration"
names the actual structural difference: we hydrate the page slice, not the
full match set. **No results are hidden, no scores are altered, no facets
are truncated.** The displayed total is still the full match count; every
page the user navigates to is still hydrated correctly.

### What "the slice" does and does not buy us

- **The slice is necessary**: without it, the hydration plan would carry a
  10,000+ URI `documentQuery`, which is itself expensive (~1.1 s on the
  page-1 reference run). Slicing keeps that payload at 20 URIs.
- **The slice is not the headline win.** Even if Optic could be persuaded
  to slice equivalently on its own, the 2.4-second cold-start cost would
  still be paid, because that cost is incurred during plan construction —
  *before* Optic ever reaches the slice step. The headline win comes from
  not asking Optic to plan around the large CTS payload in the first
  place.

---

## 4. Why This Is Not Specific To Keyword Search — And Why We Aren't Applying It Globally

The general observation is:

> When a search reduces to a single large CTS payload and Optic's only
> remaining contribution is to materialize and paginate, Optic's wrap cost
> outweighs its benefit.

That observation is not limited to keyword. Any LUX pattern that contributes
a large CTS construct (for example, certain related-list and hop scenarios
that resolve to many IRIs) is theoretically a candidate.

The reason this V1 is scoped narrowly to plain keyword is that most LUX
searches **do** benefit from Optic — joins across patterns, transitive
relationship hops, faceting, scope unions, semantic sort, sort by indexed
fields. Those are exactly the cases where Optic's optimizer pays for itself,
and where bypassing Optic would either be impossible or would require us
to re-implement non-trivial pieces of its machinery.

Generalizing safely means giving each pattern a way to say "I'm
contributing a payload that, if I'm the only contribution, dominates the
plan cost." The engine could then choose page-slice hydration when a
request reduces to a single such payload, and fall back to the full Optic
plan otherwise. We have a sketch of this design (a new "contribution type"
in the per-request accumulator) but have deliberately deferred it until V1
has had real-world exposure.

### Recognizing the next candidate (developer guidance)

A request is worth investigating as a page-slice candidate when **all**
of the following are true. Any "no" disqualifies it; eligibility is
intentionally narrow because the safety of the path depends on Optic
genuinely having nothing useful left to do.

1. **The request reduces to a single CTS query.** No cross-pattern
   joins, no per-pattern sub-plans that Optic stitches together. If
   you can write the matching logic as one `cts.andQuery` /
   `cts.orQuery` / etc., it qualifies on this axis.
2. **That CTS query's plan AST is large.** The keyword case is the
   canonical one: a `cts.tripleRangeQuery` whose IRI list is in the
   thousands or tens of thousands. Small CTS payloads will not benefit
   — Optic's wrap cost is roughly proportional to the AST size it has
   to walk, so a 50-IRI payload is not worth routing around.
3. **Relevance sort or no sort.** Sort by indexed field or by a
   computed Optic expression requires the standard plan; the
   page-slice path only knows about `cts.score`.
4. **No facets requested.** Facets need aggregation over the full
   match set, which is exactly what page-slice avoids computing.
5. **Shallow pagination dominates the workload.** The win shrinks
   with page depth and inverts somewhere past it. If the feature is
   typically used with `page=1..3`, the path is worth it; if it
   regularly drives `page=100+`, the eligibility check needs a
   page-depth cap (the keyword path does not yet have one because
   the realistic workload is shallow).

### Sketch of how to add a second pattern

If a candidate clears the five tests above, the implementation pattern
is:

1. **Extract the CTS-building helper from the pattern's `apply()`** so
   that the same `cts.query` object can be produced both inside Optic
   (the pattern's existing contribution) and outside it (the page-slice
   path). See `buildKeywordCtsQuery` in
   [Keyword.mjs](../src/main/ml-modules/root/lib/search/patterns/Keyword.mjs)
   for the reference shape. This is the most important step — it is
   what guarantees the two execution paths cannot drift on query
   semantics.
2. **Mirror the eligibility check** from
   [keywordPageSlice.mjs](../src/main/ml-modules/root/lib/search/keywordPageSlice.mjs).
   Keep it as a single function that returns `null` for ineligible
   requests; never throw from the eligibility check.
3. **Reuse the hydration shape** (`op.fromParam` survivor rows joined
   to `op.fromLexicons` for `dataType`). Resist the urge to "improve"
   it until parity is established — it is deliberately the smallest
   plan that produces the row shape the standard path returns.
4. **Wire it in at `engine.mjs::performSearch`**, *after* the standard
   path's prep work and *before* `buildPlans`. The toggle gate lives
   at this call site only; the page-slice function itself does not
   self-gate so verification scripts can call it directly.
5. **Write a parity script before the bench script.** Same structure
   as
   [verify-page-slice-parity.js](../scratch/performance/woman-greek-art-memberOf/verify-page-slice-parity.js):
   compare Jaccard, ordered ranks, per-URI score deltas, and totals.
   Tied-score rank mismatches are expected and not a failure; URI-set
   divergence outside tied groups *is* a failure.
6. **Bench only after parity is clean.** The bench number is only
   meaningful if you already trust the answers — otherwise you are
   benchmarking the speed of a wrong result.

### Where this approach does *not* help, or actively hurts

- **Deep pagination.** As page depth grows, the slice grows, and the
  `documentQuery` payload to the hydration plan grows with it. Past some
  page depth (un-measured but clearly bounded), the two paths converge,
  and beyond that the new path could be slower than the original. The V1
  eligibility checks will simply skip the new path in cases that are
  obviously bad; we will tune the cutoff as we collect data.
- **Requests that need facets or non-relevance sort.** The new path is
  disabled for these; the Optic plan is still the right engine.
- **Tied-score ordering.** When many documents share the same relevance
  score, the order among them is determined by an internal tiebreaker
  that is *not* the same between `cts.search` and Optic. Two users on
  the same query may see ties presented in different orders depending
  on which path served them. This was already true between cold and
  warm runs on the original path; we are not introducing a new class of
  problem, only a new dimension of it.

### Honest list of cons and risks

In the interest of not over-selling:

- **Two code paths to maintain.** The standard Optic path remains the
  primary; this is a second route that has to stay in sync with the
  eligibility rules. Every future change to faceting, sort, scope
  semantics, or the keyword pattern needs a thought about whether the
  eligibility check still holds.
- **Behavioral drift surface area.** Total count comes from
  `cts.estimate` (index-only) on the new path and from materialized
  results on the old path. They have been observed equal on the
  reference query (10,105 vs. 10,105) but the two are not *guaranteed*
  equal in pathological cases involving fragmented documents or filter
  semantics. We do not currently know of a LUX-visible case where they
  would diverge, but we have not exhaustively proven it cannot happen.
- **Tied-score ordering differences are real and user-visible**, even
  if the underlying scores are identical. In the parity run, 5 of 20
  top results changed position within tied-score groups. A user who
  bookmarks "the third result" cannot rely on it being the same
  document after a toggle flip.
- **It is a workaround, not a fix.** The underlying cost still exists
  in Optic. We are routing around it for a narrow class of requests.
  Other features that produce large CTS payloads will still hit the
  same wall until either upstream MarkLogic addresses it or we
  generalize the workaround.
- **The eligibility checks are conservative by design**, which means
  some queries that *could* benefit are currently routed through the
  slow path. We will widen them with measurement, not by guesswork.
- **Reference query is one query.** The 1.77× / 3.25× numbers are from
  a single, well-chosen test case (large CTS payload, plain AND of
  three text terms). Real production traffic will show a distribution.
  We expect the wins to concentrate on queries with large CTS payloads
  and to be smaller-or-zero on already-fast queries.
- **Variance reduction is partly an artifact of doing less work.** A
  cheaper code path has less to vary over. We should not claim credit
  for the variance collapse as if it were a separate engineering
  achievement; it is mostly a consequence of taking the optimizer out
  of the equation.

---

## 5. MarkLogic 12.1 and a Possible Path Forward With Progress Engineering

LUX is currently on MarkLogic 12.0.1. MarkLogic **12.1** has begun shipping
optimizer and Optic improvements. We have not yet quantified the impact on
this specific workload, but it is plausible that some portion of the
2.4-second AST wrap cost is addressed upstream. We intend to re-measure
under 12.1 as soon as it is in a test environment and adjust both the
toggle default and the eligibility rules accordingly.

Independently of 12.1, this is also a workload Progress Engineering would
likely find informative. We have a small, reproducible case (the
*"woman greek art"* query against the `item` scope), instrumentation
sufficient to show that the dominant cost is plan construction rather than
search or retrieval, and a parallel pure-`cts` execution that demonstrates
the lower bound. **Opening a support ticket** with that material is a
reasonable next step. Possible Engineering responses range from "this is
known and 12.x addresses it" to "send us the plan and we'll look at the
optimizer" to a code-level fix that lets us delete the page-slice
hydration path entirely. Any of those outcomes is a good one.

---

## 6. Other Findings That Surfaced Along The Way

These came out of the same investigation and are recorded here so they are
not lost.

- **`prepare()` in benchmark scripts is misleading.** Calling
  `plan.prepare()` in a benchmark forces re-optimization on every warm
  run; production code does not do this. Removing it changed our Optic
  warm baseline from ~178 ms to ~32–37 ms — a ~5× difference that was
  entirely an artifact of the measurement tool.
- **Cold start, not warm, is the dominant real-world metric for keyword
  search.** Every distinct keyword query produces a different CTS payload
  and therefore a different plan; under diverse production traffic the
  plan cache cannot keep them all. The 5,000-query serialized test result
  (~4.6 s average) closely matches the cold number (~4.0 s), and is far
  from the warm number (~0.03 s). Optimizing warm-only would have given
  the customer a number that does not reflect what their users see.
- **Lazy vs. eager IRI resolution is not the bottleneck.** We tested
  passing the IRI sequence to `cts.tripleRangeQuery` lazily vs. as a
  materialized array. No measurable difference. The cost is the AST node,
  not how the IRIs got into it.
- **Tree caches don't matter for index-only queries.** For lukewarm
  testing of this kind of search, clearing the program cache and list
  cache is more representative than the full cache-clear sequence.
- **`cts.estimate` returns `xs.unsignedLong`, not a JS number.** Strict
  equality (`=== 0`) silently fails; serialization to JSON hides it.
  Anywhere we need JS number semantics, we wrap in `Number(...)`. (This
  is now noted in the repo's optic-lessons memory.)
- **Variance reduction is a separate, real benefit.** The warm-path
  standard deviation dropped from 70 ms to 3 ms. Average latency is the
  number that gets reported; variance is what users actually feel.

---

## 7. Current Status and Recommendation

- **Implemented**: page-slice hydration for plain keyword text searches,
  behind a build-time toggle (`searchPageSliceEnabled`). The toggle is
  the rollback switch, not a permanent gate.
- **Verified**: identical totals; byte-identical per-document scores;
  identical top-of-page ordering except within tied-score groups (an
  exposure the standard path already has between cold and warm runs).
- **Measured**: ~1.77× cold speedup, ~3.25× warm speedup, ~23× tighter
  warm-path variance on the reference query.

### Recommended path to enabling by default

The default should be **on** once one remaining check passes. The toggle
itself stays in the build so production can be reverted instantly if
something the test suite does not cover surfaces in the wild.

1. **Run the full search test suite with the toggle on.** This is the
   cheapest way to discover an eligibility hole or a row-shape mismatch
   that the parity script (one query) does not cover. If anything fails,
   it is almost certainly an eligibility gap to widen or narrow, not a
   correctness problem on the queries that *do* route through the new
   path.
2. **If the suite passes, flip the default to `true`** in
   [gradle.properties](../gradle.properties) and ship. The customer
   should not be paying the 4.9-second cold-start cost on a query we
   have demonstrated can be served in ~2.8 seconds with identical
   results.
3. **Leave the toggle in place** as the rollback mechanism. A toggle
   that exists only to be off forever is dead code; a toggle that
   exists to be on by default and off in emergencies is operational
   hygiene.

### Other next steps (independent — order is preference, not dependency)

- **Open a Progress support ticket** with the reproducer and our
  measurements. This does not have to wait for anything else; the case
  is already self-contained and the answer (whatever it is) informs
  every other step. Possible outcomes range from "known, fixed in
  12.x" to a code-level fix that lets us delete this work entirely.
- **Re-measure under MarkLogic 12.1** as soon as it is available in a
  test environment.
- **Defer the generalization to other patterns** until the keyword
  case has produced real-world data on which patterns would benefit
  most.

The headline is modest and honest: a meaningful, measured improvement on
a specific and important class of query, with a clear scope, a clear
fall-back (just flip the toggle off), and a clear path to potentially
retiring the workaround entirely if upstream MarkLogic addresses the
underlying cost.
