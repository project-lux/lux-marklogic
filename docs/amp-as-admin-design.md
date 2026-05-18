## **Amp-as-Admin Performance Optimization — Design Document**

**Status:** Draft  
**Related:** [amp-as-admin-thoughts.md](./amp-as-admin-thoughts.md)  
**Primer:** [lux-optic-llm-primer.md](../docs/lux-optic-llm-primer.md) — covers SearchCriteriaProcessor, engine internals, and the Optic plan pipeline.

---

- [Problem](#problem)
- [LLM Prompts](#llm-prompts)
  - [First](#first)
  - [Second](#second)
- [Solution Overview](#solution-overview)
- [Targeted Endpoints](#targeted-endpoints)
- [The Collection Exclusion Constraint](#the-collection-exclusion-constraint)
  - [Why `cts.notQuery` (Denylist) over `cts.collectionQuery` (Allowlist)](#why-ctsnotquery-denylist-over-ctscollectionquery-allowlist)
  - [The Constraint](#the-constraint)
- [Who Qualifies for Admin Amp](#who-qualifies-for-admin-amp)
- [Architectural Decision: Single Enforcement Point in SearchCriteriaProcessor](#architectural-decision-single-enforcement-point-in-searchcriteriaprocessor)
  - [Why Not Enforce in Callers](#why-not-enforce-in-callers)
  - [Why Not Only Enforce in `handleRequest`](#why-not-only-enforce-in-handlerequest)
  - [Recommended Architecture](#recommended-architecture)
  - [Signaling Mechanism: `xdmp.setRequestField` / `xdmp.getRequestField`](#signaling-mechanism-xdmpsetrequestfield--xdmpgetrequestfield)
  - [Why `constraints[]` and Not `ctsConstraints[]`](#why-constraints-and-not-ctsconstraints)
  - [CTS Queries in `constraints[]` — Validate First](#cts-queries-in-constraints--validate-first)
  - [Proposed Rename: `constraints` → `invariants`, `ctsConstraints` → `criteriaQueries`](#proposed-rename-constraints--invariants-ctsconstraints--criteriaqueries)
  - [Where in the Engine to Inject](#where-in-the-engine-to-inject)
  - [Problem: OR Pattern Joins Create Unfiltered Lexicon Scans](#problem-or-pattern-joins-create-unfiltered-lexicon-scans)
  - [Problem: `hasNonJoinConstraints` Threshold](#problem-hasnonjoinconstraints-threshold)
  - [Problem: `joinFullOuter` Conjunction Joins Bypass Left-Side Constraints](#problem-joinfullouter-conjunction-joins-bypass-left-side-constraints)
- [Edge Case: Logged-in User Seeing Their Own My Collections](#edge-case-logged-in-user-seeing-their-own-my-collections)
- [`endpointsConfig.mjs` Extension](#endpointsconfigmjs-extension)
- [Changes to `handleRequest` / `__handleRequestV2`](#changes-to-handlerequest--__handlerequestv2)
- [Implementation Checklist](#implementation-checklist)
  - [Phase 0: Validation \& Prep](#phase-0-validation--prep)
  - [Phase 1: Core Feature](#phase-1-core-feature)
  - [Phase 2: OR-Path Hardening](#phase-2-or-path-hardening)
  - [Phase 3: Testing](#phase-3-testing)
- [Security Considerations](#security-considerations)
- [Performance Expectations](#performance-expectations)
- [Open Questions](#open-questions)

# Problem

MarkLogic imposes document permission checks on non-admin users for every candidate document in a query. This is unnecessary overhead when:

1. The request is read-only.
2. The user already has read-access to every document the query should return.

A five-keyword OR'd search executed in **1.8s as a non-admin** vs. **1.3s as an admin** (~28% improvement). Query ID: `q07-optic-pattern-d-non-con`.

# LLM Prompts

## First

> Review [amp-as-admin-thoughts.md](./amp-as-admin-thoughts.md).  It captures an idea to improve performance and some thougts on how to go about it.
> 
> I need help flushing out a design and mitigating from a concern: When the MyCollections feature is enabled, individual users may optionally log in, as opposed to just service accounts.  Individual users can create documents that only they should be able to access.  If we amp individual or service accounts to the level of an admin, a search could return someone else's documents.  Yet if we add criteria to prevent or not amp the user to admin, the performance gain could be completely lost.  I'm hoping you can come up with a good idea for this.

## Second

> I think the collection constraint that excludes the MyCollection is a good one, if indeed faster than the document permission check.  Given there will be over 40 million documents in the prod collection and only a few hundred that are not, would cts.notQuery(cts.collectionQuery(COLLECTION_NAME_MY_COLLECTION)) make for a smaller join?
> 
> I like that this is a search constraint.  All included endpoints use #sym:SearchCriteriaProcessor, which is the internal search API.  It calls #sym:performSearch -> #sym:buildPlans which is getting pretty close to where such a constraint could be added.
> 
> Is it within #sym:handleRequest that we should determine if there should be an additional constraint(s)?  If so, how should we reliabily get that information to SearchCriteriaProcessor?  Given multiple endpoints and what's at stake, I think it is critical to have a single enforcement and not have any way to get around it.  To that end, *maybe* it makes sense to push this into SearchCriteriaProcessor and not allow callers to override the logic.
> 
> Whether for now or later, lux-optic-llm-primer.md is intended to quickly bring new LLM chat sessions up to speed on the current incarnation of the SearchCriteriaProcessor.  It has just under 600 lines. 
> 
> For the edge case, I think we may want to use cts.documentPermissionQuery vs. user-specific questions.
> 
> Let's start capturing all this input as a new Markdown document (scratch/ampAsAdminDesign.md) for the developer that will be responsible for implementing it (not me).

---

# Solution Overview

For qualifying read-only requests, amp the user to admin level to bypass per-document permission evaluation. To prevent the admin role from exposing documents the user should not see (specifically My Collections and User Profile documents), inject a **collection exclusion constraint** into the search query.

---

# Targeted Endpoints

These are read-only, performance-sensitive, and all route through `SearchCriteriaProcessor`:

1. `/ds/lux/search.mjs`
2. `/ds/lux/searchWillMatch.mjs`
3. `/ds/lux/searchEstimate.mjs`
4. `/ds/lux/facets.mjs`
5. `/ds/lux/relatedList.mjs`

All five have `features: { myCollections: false }` in `endpointsConfig.mjs`, meaning they are not My Collections endpoints and should never return My Collections documents.

---

# The Collection Exclusion Constraint

## Why `cts.notQuery` (Denylist) over `cts.collectionQuery` (Allowlist)

With 40M+ documents in the `prod` collection and only a few hundred in `myCollection`/`userProfile`/`myCollectionsFeature`, the two options resolve as follows in MarkLogic's collection lexicon:

| Approach | What MarkLogic resolves |
|----------|------------------------|
| `cts.collectionQuery('prod')` | Bitmap lookup for `prod` — 40M+ bits set |
| `cts.notQuery(cts.collectionQuery(['myCollection', 'userProfile', 'myCollectionsFeature']))` | Bitmap lookup for the excluded collections — a few hundred bits set, then invert |

Both are bitmap operations and extremely fast compared to per-document permission checks. However, **`cts.notQuery` is preferable here** because:

1. **Smaller initial bitmap** — The excluded collections have far fewer documents. While the final result set size is the same (the inversion produces the complement), MarkLogic's query optimizer can reason about the smaller set more efficiently in early plan stages.
2. **Aligned with endpoint semantics** — These endpoints explicitly do NOT serve My Collections data (`features: { myCollections: false }`). A NOT constraint directly expresses that intent.
3. **Future-proof for new production-like collections** — If a new non-My-Collections collection is introduced (e.g., a new data category), a denylist automatically includes it. An allowlist would silently exclude it until updated.

## The Constraint

```javascript
cts.notQuery(
  cts.orQuery([
    cts.collectionQuery(COLLECTION_NAME_MY_COLLECTION),      // 'myCollection'
    cts.collectionQuery(COLLECTION_NAME_USER_PROFILE),       // 'userProfile'
    cts.collectionQuery(COLLECTION_NAME_MY_COLLECTIONS_FEATURE), // 'myCollectionsFeature'
  ])
)
```

This is a CTS query. It belongs in the engine's `constraints[]` bucket — not `ctsConstraints[]` — so that it is applied as an individual `.where()` on the Optic plan, unconditionally AND'd regardless of the user's search criteria or `logicType`. See [Why `constraints[]` and Not `ctsConstraints[]`](#why-constraints-and-not-ctsconstraints) below.

---

# Who Qualifies for Admin Amp

| Requester | Admin Amp? | Rationale |
|-----------|-----------|-----------|
| Tenant owner service account (`lux`) | **Yes** | Has read access to all pipeline data |
| Logged-in user via tenant owner (`unitName` = tenant owner) | **Yes** | Gets tenant owner's reader role via `execute_with_lux`; already sees all pipeline data |
| Unit portal service accounts (e.g., `ypm`, `ipch`) | **No** | Restricted to unit-specific subset; admin amp would over-grant access to other units' documents |
| Logged-in user via unit portal | **No** | Same concern as above — unit boundary must be enforced by document permissions |

The determination logic is: **amp when `unitName === TENANT_OWNER` and the endpoint opts in**.

---

# Architectural Decision: Single Enforcement Point in SearchCriteriaProcessor

## Why Not Enforce in Callers

Multiple endpoints consume `SearchCriteriaProcessor`. If the collection exclusion were the caller's responsibility:
- Every endpoint would need to remember to add it.
- A new endpoint or refactor could forget it.
- Unit tests would need to verify each caller independently.

## Why Not Only Enforce in `handleRequest`

`handleRequest` (in `securityLib.mjs`) is where the amp decision is made. It knows whether the user qualifies. However, `handleRequest` wraps the endpoint function `f()` — it doesn't have visibility into the Optic plan being built inside `SearchCriteriaProcessor`.

## Recommended Architecture

**`handleRequest` decides; `SearchCriteriaProcessor` enforces.**

1. **`handleRequest`** determines whether the admin amp applies (based on endpoint config + user/unit).
2. **`handleRequest`** signals the decision to `SearchCriteriaProcessor` via a request-scoped mechanism.
3. **`SearchCriteriaProcessor`** reads the signal and unconditionally injects the collection exclusion constraint when active. **No caller can override or bypass this.**

## Signaling Mechanism: `xdmp.setRequestField` / `xdmp.getRequestField`

MarkLogic's request fields are thread-local and scoped to the current request. They cannot be manipulated by external callers or leaked across requests.

```javascript
// In handleRequest (or the amp'd function), BEFORE invoking f():
xdmp.setRequestField('__ampedAsAdmin', 'true');

// In SearchCriteriaProcessor, during plan assembly:
const isAmpedAsAdmin = xdmp.getRequestField('__ampedAsAdmin') === 'true';
if (isAmpedAsAdmin) {
  // Inject the collection exclusion — non-negotiable.
}
```

**Why this is secure:**
- The field is set inside an amp'd function (`__handleRequestV2` or a new amp'd wrapper) that only `securityLib.mjs` can call.
- `SearchCriteriaProcessor` reads it but never writes it.
- Callers of `SearchCriteriaProcessor` cannot set or clear it (they don't have the amp to reach the code that sets it).
- The field does not persist beyond the current request.

## Why `constraints[]` and Not `ctsConstraints[]`

The primer documents three constraint buckets in the engine (see "The Three Constraint Buckets"):

| Bucket | Assembly | Behavior |
|--------|----------|----------|
| `constraints[]` | Individual `.where(c)` calls | **Always AND'd**, regardless of `logicType` |
| `ctsConstraints[]` | Wrapped per `logicType` | `cts.andQuery` / `cts.orQuery` / `cts.notQuery(cts.orQuery(...))` |
| `patternJoins[]` | Join method calls | Join type selected by `logicType` |

The collection exclusion is a **structural invariant** — it must always exclude My Collections documents, regardless of whether the user's search is AND, OR, or NOT. If placed in `ctsConstraints[]`:

- A top-level OR search (`{ OR: [...] }`) would OR the exclusion with the user's terms → **the exclusion becomes meaningless** (any doc matching the user's terms OR not in My Collections = everything).
- A top-level NOT search would invert it entirely.

`constraints[]` items are applied as individual `.where()` calls, which are unconditionally AND'd. This is the same bucket that holds the `dataType` scope constraint (`op.in(op.col(dataTypeCol), getSearchScopeTypes(...))`), which is also a structural invariant that must always apply. The collection exclusion is the same category of constraint.

## CTS Queries in `constraints[]` — Validate First

**Important:** Nowhere in the current codebase is a CTS query placed in `constraints[]`. Today:

- `constraints[]` only holds **Optic expressions**: `op.in(...)`, `op.eq(...)`, comparator expressions from `IndexedRange` in AND mode.
- `ctsConstraints[]` only holds **CTS queries**: `cts.fieldWordQuery(...)`, `cts.fieldValueQuery(...)`, `cts.tripleRangeQuery(...)`, etc.

While MarkLogic's Optic `.where()` accepts both Optic expressions and CTS queries (the primer states: "CTS queries can be passed directly into `.where()` — the bridge between CTS and Optic"), this is an **untested pattern in this codebase**.

**Validation step:** Before proceeding with the full implementation, write a unit test that places a `cts.collectionQuery(...)` or `cts.notQuery(...)` into `constraints[]` alongside the `op.in(...)` dataType constraint and confirms:
1. The plan executes correctly.
2. The CTS query appears in the exported plan JSON.
3. Results are correctly filtered.

If this validation fails for any reason, the alternative is to apply the collection exclusion as a standalone `.where()` in `assemblePlan` itself (outside both buckets), which avoids mixing types in the accumulator.

## Proposed Rename: `constraints` → `invariants`, `ctsConstraints` → `criteriaQueries`

The current bucket names are confusing because the semantic distinction isn't about Optic-vs-CTS — it's about **unconditional** vs. **logicType-dependent**:

| Current Name | Real Semantic | Proposed Name |
|---|---|---|
| `constraints[]` | Unconditional AND (structural invariants) | `invariants[]` |
| `ctsConstraints[]` | Combined per user's logicType (search criteria) | `criteriaQueries[]` |

With the rename:
- It becomes self-documenting that `invariants[]` is for things that MUST always apply.
- It becomes clear that a CTS query can go in `invariants[]` (it's not "constraints" vs. "ctsConstraints" suggesting a type distinction).
- `criteriaQueries[]` makes explicit that these represent the user's search criteria combined per their chosen boolean logic.

Alternative names considered:
- `invariants` / `logicTypedQueries`
- `alwaysAndConstraints` / `conditionalConstraints`
- `whereConstraints` / `wrappedCtsQueries`

**This rename is a refactor that should happen as a prerequisite or alongside this feature** to avoid confusion when mixing CTS queries into what was previously an Optic-expression-only bucket.

## Where in the Engine to Inject

The constraint should be injected in `createPlanAccumulator` (in `engine.mjs`) into `constraints[]` (to be renamed `invariants[]`), **at all levels** (see "Problem: joinFullOuter Conjunction Joins" below for rationale — top-level-only injection creates a security gap via `joinFullOuter` sub-plans).

```javascript
function createPlanAccumulator({ scope, uriCol, iriCol, fragCol, dataTypeCol, isMultiScope }) {
  const invariants = isMultiScope
    ? []
    : [op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false))];

  // Admin-amp collection exclusion — set by handleRequest, not overridable.
  if (xdmp.getRequestField('__ampedAsAdmin') === 'true') {
    invariants.push(
      cts.notQuery(
        cts.orQuery([
          cts.collectionQuery(COLLECTION_NAME_MY_COLLECTION),
          cts.collectionQuery(COLLECTION_NAME_USER_PROFILE),
          cts.collectionQuery(COLLECTION_NAME_MY_COLLECTIONS_FEATURE),
        ])
      )
    );
  }

  return {
    lexicons: { /* ... */ },
    invariants,
    criteriaQueries: [],
    conjunctionJoins: [],
    andOrSubPlans: [],
    patternJoins: [],
  };
}
```

Each item in `invariants[]` becomes its own `.where()` call in `assemblePlan`. Multiple `.where()` calls are always AND'd by Optic (there is no `.whereOr()`). This means the collection exclusion is unconditionally enforced regardless of the user's `logicType`.

**However, this alone is insufficient.** The following sections describe additional injection points required.

## Problem: OR Pattern Joins Create Unfiltered Lexicon Scans

In `assemblePlan`, when `logicType === 'or'` and there are `patternJoins` (from patterns like `HopWithField`, `HopInverse`, `AnnTopK`), the engine creates **independent duplicate lexicon scans**:

```javascript
// From assemblePlan, lines ~783-793:
const wrapped = op
  .fromLexicons(lexicons, null, op.fragmentIdCol(fragCol))
  .joinInner(pj.right, pj.on)
  .where(
    op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false)),  // ONLY dataType!
  )
  .select([uriCol, fragCol, dataTypeCol, ...pj.extraCols]);
plan = plan.joinFullOuter(wrapped, null);
```

This new plan:
1. Starts from a fresh `op.fromLexicons(...)` — it does NOT inherit the main plan's `.where()` filters.
2. Only applies the `dataType` constraint (hard-coded).
3. Is merged via `joinFullOuter` (UNION semantics) — right-side rows bypass all left-side constraints.

**Security impact:** A My Collections document reachable via a triple hop (e.g., a `HopWithField` search term in an OR search) would appear on the right side of this `joinFullOuter` and flow into the final result, **completely bypassing** the collection exclusion on the main plan.

**Fix:** The collection exclusion must also be applied to these duplicate lexicon scans. The simplest approach is to add another `.where()` call after the existing `dataType` constraint:

```javascript
const wrapped = op
  .fromLexicons(lexicons, null, op.fragmentIdCol(fragCol))
  .joinInner(pj.right, pj.on)
  .where(op.in(op.col(dataTypeCol), getSearchScopeTypes(scope, false)))
  .where(collectionExclusionQuery)  // ADD THIS
  .select([uriCol, fragCol, dataTypeCol, ...pj.extraCols]);
```

This means the collection exclusion CTS query must be available within `assemblePlan` as a shared reference — not only seeded into the accumulator. Options:
- Pass it as an additional parameter to `assemblePlan` (e.g., `securityInvariants[]`).
- Read the request field directly within `assemblePlan` (keeps it self-contained).
- Store it on the accumulator as a separate field (e.g., `acc.securityConstraints[]`) distinct from `invariants[]`, specifically for replay on duplicate scans.

## Problem: `hasNonJoinConstraints` Threshold

```javascript
const hasNonJoinConstraints =
  constraints.length > 1 || // more than the dataType constraint.
  ctsConstraints.length > 0 ||
  conjunctionJoins.length > 0;
```

The comment says "more than the dataType constraint" — it assumes `constraints[]` normally holds exactly 1 item. Adding the collection exclusion makes `constraints.length > 1` always true when amp'd. This:

- Forces ALL OR pattern joins into the `joinFullOuter` path (the `else` branch), even when the simpler `joinInner` optimization (the `if` branch) would be appropriate.
- The `joinInner` path is a performance optimization for the case where the only constraint is the dataType filter. The collection exclusion is logically also a structural invariant (like dataType) and should not trigger the "has real user constraints" threshold.

**Fix:** The check should account for the collection exclusion not being a "non-join constraint" in the semantic sense. Options:
- Change to count only constraints contributed by patterns: `constraints.length > invariantCount`.
- Track the invariant count separately: `acc.invariantCount = N` set during `createPlanAccumulator`.
- With the rename, check `invariants.length > expectedInvariantCount` or better: track pattern-contributed constraints separately.

## Problem: `joinFullOuter` Conjunction Joins Bypass Left-Side Constraints

When `buildConjunctionJoin` handles:
- **OR-encounters-AND**: creates `subPlan(criterion)` → `joinFullOuter` with the main plan
- **OR-encounters-NOT**: same pattern
- **NOT-encounters-OR**: same pattern (via `joinFullOuter`)

These sub-plans are built via `processCriteria` with a `parentId` (non-top-level). They get their own `createPlanAccumulator` call. Since the collection exclusion is only injected at top level, these sub-plans don't have it.

With `joinFullOuter`, the right side introduces rows that have **no corresponding left-side match**. If a My Collections document satisfies the sub-plan's criteria, it appears on the right side and bypasses the main plan's exclusion.

**Mitigating factor:** These sub-plans DO get the `dataType` constraint (they're non-multi-scope). But My Collections documents may share dataType values with pipeline documents (e.g., a My Collection of type "Set" could share the same `dataType` field value as pipeline Sets).

**Fix options:**
1. **Inject the collection exclusion at ALL levels** (not just top level) when amp'd. This is the simplest but adds the constraint to every recursive plan, including those that are inner-joined (where it's redundant but harmless).
2. **Inject only into plans whose results feed a `joinFullOuter`**. This is more surgical but harder to implement because the join type isn't known at accumulator-creation time.
3. **Apply the exclusion at a higher level** — after `assemblePlan` returns but before `collapseToResultRows`. However, by that point the full outer join has already introduced rows.

**Recommendation:** Option 1 — inject at all levels. The cost of an extra `.where(cts.notQuery(...))` on sub-plans is negligible (bitmap operation), and it guarantees correctness regardless of how the sub-plan is eventually joined. The "only at top level" optimization is a premature optimization that creates a security gap.

---

# Edge Case: Logged-in User Seeing Their Own My Collections

For the current implementation, the 5 targeted endpoints do NOT return My Collections results (they have `features: { myCollections: false }`). The collection exclusion constraint is therefore correct and complete.

**Future consideration:** If a unified search that includes a user's own My Collections is desired, the constraint can be extended using `cts.documentPermissionQuery`:

```javascript
cts.orQuery([
  // Everything NOT in My Collections (the normal pipeline data)
  cts.notQuery(
    cts.orQuery([
      cts.collectionQuery(COLLECTION_NAME_MY_COLLECTION),
      cts.collectionQuery(COLLECTION_NAME_USER_PROFILE),
      cts.collectionQuery(COLLECTION_NAME_MY_COLLECTIONS_FEATURE),
    ])
  ),
  // OR: My Collections documents where the current user has read permission
  cts.andQuery([
    cts.collectionQuery(COLLECTION_NAME_MY_COLLECTION),
    cts.documentPermissionQuery(userExclusiveRoleName, 'read'),
  ]),
])
```

`cts.documentPermissionQuery` resolves against the permission metadata in the document — it does not require enumerating URIs. This is preferable to maintaining user-specific collection lists or document URI sets.

---

# `endpointsConfig.mjs` Extension

Add a new property to opt endpoints into admin amp:

```javascript
'/ds/lux/search.mjs': {
  allowInReadOnlyMode: true,
  features: { myCollections: false },
  ampAsAdmin: true,  // NEW — opt in to admin-level permission bypass
},
```

Add corresponding method to `EndpointConfig`:

```javascript
mayAmpAsAdmin() {
  return this[PROP_NAME_AMP_AS_ADMIN] === true;
}
```

---

# Changes to `handleRequest` / `__handleRequestV2`

Within `__handleRequestV2`, after determining the user qualifies, and before invoking `f()`:

```javascript
// After existing checks (service account, read-only mode, etc.)

const shouldAmpAsAdmin = endpointConfig.mayAmpAsAdmin() && unitName === TENANT_OWNER;

if (shouldAmpAsAdmin) {
  // Signal to SearchCriteriaProcessor that the collection exclusion must be applied.
  xdmp.setRequestField('__ampedAsAdmin', 'true');
}

// Existing invoke logic continues...
// The admin amp itself is achieved by invoking with the admin userId or
// using an amp'd function that grants the admin role.
```

**Note:** The actual mechanism to grant admin privileges at invocation time (e.g., `xdmp.invokeFunction(f, { userId: adminUserId })` vs. a new amp with the `admin` role) is an implementation detail. The existing `execute_with_*` pattern already uses `xdmp.invokeFunction` — extending it with an admin-level invoke for the tenant owner case should be straightforward.

---

# Implementation Checklist

## Phase 0: Validation & Prep

- [ ] **Validate CTS-in-constraints[]**: Write a standalone test confirming `plan.where(cts.notQuery(...))` alongside `plan.where(op.in(...))` produces correct results. This is technically sound per MarkLogic docs but unprecedented in this codebase.
- [ ] **Rename buckets** (can be a separate PR): `constraints` → `invariants`, `ctsConstraints` → `criteriaQueries` throughout `engine.mjs`, `createPlanAccumulator`, `assemblePlan`, and any callers. Update primer accordingly.

## Phase 1: Core Feature

- [ ] Add `ampAsAdmin` property to `endpointsConfig.mjs` for the 5 targeted endpoints.
- [ ] Add `PROP_NAME_AMP_AS_ADMIN` constant and `mayAmpAsAdmin()` method to `EndpointConfig`.
- [ ] Add validation for the new property in `EndpointConfig.assertValidConfiguration()`.
- [ ] In `__handleRequestV2`, add logic to set `xdmp.setRequestField('__ampedAsAdmin', 'true')` when conditions are met.
- [ ] Create the admin-level invoke mechanism (new amp'd function or extended invoke options).
- [ ] In `engine.mjs` → `createPlanAccumulator`, read the request field and inject the collection exclusion into `invariants[]` **at all levels** (not top-level only — see "Problem: joinFullOuter Conjunction Joins" section).
- [ ] Import `COLLECTION_NAME_MY_COLLECTION`, `COLLECTION_NAME_USER_PROFILE`, `COLLECTION_NAME_MY_COLLECTIONS_FEATURE` into `engine.mjs`.

## Phase 2: OR-Path Hardening

- [ ] In `assemblePlan`, apply the collection exclusion `.where()` to the **duplicate lexicon scan** inside the OR `patternJoins` loop (the `op.fromLexicons(...)` that feeds `joinFullOuter`). See "Problem: OR Pattern Joins" section.
- [ ] Fix `hasNonJoinConstraints` threshold to not count the collection exclusion as a "real" user constraint. Track `invariantCount` on the accumulator and compare against it instead of the magic number `1`.

## Phase 3: Testing

- [ ] Unit tests:
  - [ ] Verify collection exclusion is present in plan when `__ampedAsAdmin` is set.
  - [ ] Verify collection exclusion is absent when `__ampedAsAdmin` is not set.
  - [ ] Verify exclusion appears in **duplicate lexicon scan** for OR pattern joins.
  - [ ] Verify `hasNonJoinConstraints` remains `false` when only invariants are present.
  - [ ] Verify `handleRequest` sets the field only for qualifying users/units/endpoints.
  - [ ] Verify unit portal service accounts do NOT get amp'd.
  - [ ] Performance comparison test (same query, admin vs non-admin, with and without collection exclusion).
  - [ ] **OR search with hop pattern that touches a My Collections document** — must NOT appear in results.
- [ ] Update `lux-optic-llm-primer.md` to document the admin-amp collection exclusion as part of the engine internals (constraint injection in `createPlanAccumulator`).

---

# Security Considerations

1. **The collection exclusion is non-negotiable when amp'd.** It is injected by `SearchCriteriaProcessor` internals, not by the caller. No endpoint or consumer can suppress it.
2. **The request field `__ampedAsAdmin` can only be set inside an amp'd function.** External code running at non-admin privilege level cannot set request fields that would trick the system (they don't execute inside the amp'd context that sets the field before calling `f()`).
3. **Unit portal requests are excluded.** The `unitName === TENANT_OWNER` guard ensures unit-restricted service accounts retain their document-permission-based access controls.
4. **If the signal is absent, behavior is unchanged.** The system defaults to the existing permission-based access model. The optimization is purely additive.
5. **OR-path hardening is security-critical.** The OR pattern-joins duplicate lexicon scan and `joinFullOuter` introduce document-entry points that bypass the main plan's `.where()` constraints. Without explicit exclusion at these additional entry points, the amp leaks My Collections documents to the tenant owner under specific query patterns (e.g., an OR search with a hop-based term whose triples reference a My Collections document). This is not a theoretical concern — it's a direct consequence of `joinFullOuter` semantics.

---

# Performance Expectations

| Scenario | Permission model | Expected overhead |
|----------|-----------------|-------------------|
| Non-admin, no amp (current) | Per-document permission evaluation | Baseline (e.g., 1.8s) |
| Admin amp + collection exclusion | Bitmap NOT on ~hundreds of docs | Near-admin speed (e.g., ~1.3s) |
| Admin without exclusion (unsafe, not implemented) | None | ~1.3s but leaks documents |

The collection exclusion adds a single bitmap operation to the query plan. MarkLogic's collection lexicon resolves in O(1) — it is a fixed-size bitmap regardless of collection cardinality. The cost is negligible relative to the savings from bypassing per-document permission checks on 40M+ documents.

---

# Open Questions

1. **Amp mechanism:** Should we create a new amp'd function (e.g., `__executeAsAdmin`) with the `admin` role, or reuse the existing `execute_with_*` invoke pattern with `{ userId: xdmp.user('admin') }`? The former is more explicit; the latter avoids a new amp config file.
2. **`nonProd` collection:** Should documents in `COLLECTION_NAME_NON_PRODUCTION` also be excluded? These are presumably non-production pipeline documents. If they exist alongside `prod` documents and have the same reader permissions, they may not need exclusion. Clarify.
3. **Trace event:** Should a new trace event be added to log when admin amp is activated, for debugging and audit purposes?
4. **Rollback plan:** If performance testing shows the collection exclusion negates the benefit (unlikely given bitmap cost), what's the fallback? Consider a feature flag in `appConstants.mjs`.
