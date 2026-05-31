# 5K Comparison: Pattern-Level Analysis

Source: `scratch/5k-search-comparison.json` (baseline=CTS, current=Optic, 2026-05-27).
Sample size: 5,588 tests; 1 functional regression (timeout), 17 significant performance regressions.
Pattern names from [scratch/config/searchTermsConfigOptic.mjs](scratch/config/searchTermsConfigOptic.mjs).

---

## Headline numbers

| Metric | Baseline (CTS) | Current (Optic) | Change |
|---|---|---|---|
| Mean | 37 ms | 229 ms | **+513%** |
| p50 | 32 ms | 171 ms | +434% |
| p90 | 46 ms | 335 ms | +628% |
| p95 | 54 ms | 361 ms | +569% |
| p99 | 133 ms | 428 ms | +223% |
| p99.9 | 286 ms | 2,327 ms | **+715%** |
| Pass rate | 96.8% | 96.8% | (1 status flip) |

The gap is **uniform** across all percentiles, not driven by a few outliers. Every shape pays a multi-hundred-ms tax. The tail (p99.9) is where shape-specific regressions concentrate.

---

## Functional regression (must-fix)

### Pattern: deeply-nested `hopWithField` chain inside top-level OR — **timeout**

**`Backend log test 10`** — `item` scope — 313 ms → **21,032 ms (HTTP 500, ≥20 s timeout)**

```json
{
  "OR": [
    { "memberOf": { "curatedBy": { "id": "…group/0a5e…" } } },
    { "memberOf": { "curatedBy": { "memberOf": { "id": "…group/0a5e…" } } } }
  ]
}
```

All patterns are `hopWithField` (item.memberOf, set.curatedBy → 4-level chain in second branch).
This shape becomes nested patternJoins in OR mode → the "duplicate lexicon + full-outer join" wrap fires for both branches, and each branch carries a sub-tree of further patternJoins. Hits the timeout deterministically.

**Action:** the new pure-CTS fold (just landed) does not help here because `hopWithField` contributes a `patternJoin`, not a `ctsConstraint`. The chain is intrinsically join-shaped under the current pattern. Would need either (a) `hopWithField` pattern emitting a `cts.tripleRangeQuery` chain when only id-leaves are present, or (b) limiting OR of hopWithField branches at top level the same way `andOrSubPlans` are merged before joining.

---

## Pattern shapes ranked by regression severity

### 1. `keyword` only — the dominant production hot spot

This is the single biggest category by count and shows up at every multiplicity (1, 2, 3, 4 terms). The 49K-IRI plan-AST issue documented in [memories](/memories/repo/optic-lessons.md) drives the entire shape.

#### Single-term keyword (rare term, large referenceName expansion)

| Test | Scope | Criteria | Baseline → Current |
|---|---|---|---|
| 4360 | item | `{"text":"Divination"}` | 199 → 1,202 ms (+504%) |
| 4447 | item | `{"text":"Incantation"}` | 197 → 1,191 ms (+505%) |
| 4766 | item | `{"text":"Summoning"}` | 190 → 1,203 ms (+533%) |
| 4837 | item | `{"text":"Spells"}` | 191 → 1,210 ms (+534%) |

These four are isomorphic. All four are rare item-domain terms with large referenceName IRI sets. The "fold pure-CTS sub-plan into parent" engine fix does NOT help these — there's no sub-plan, it's a single leaf at top level. **The WGA-style optimizer cost (49K IRIs in plan AST) is the cause.** This is exactly the [approach-D-cts-then-optic.js](scratch/performance/woman-greek-art-memberOf/approach-D-cts-then-optic.js) target.

#### Multi-term keyword AND

| Test | Scope | Criteria | Baseline → Current |
|---|---|---|---|
| 4865 | item | `Magic AND Spells` | 191 → 1,223 ms (+540%) |
| 845 | item | `Malena AND Rice` | 335 → 2,289 ms (+583%) |
| 849 | work | `Malena AND Rice` | 489 → 3,293 ms (+573%) |
| 141 | item | `Babylonian AND collection` | 379 → 2,722 ms (+618%) |
| 4144 | item | `The AND Mellon AND Alchemy` | 345 → 2,353 ms (+582%) |
| 194 | item | `Babylonian AND collection AND MLC AND 2153` | 246 → 1,175 ms (+378%) |

Linear in keyword count — each adds one tripleRangeQuery-with-N-IRIs to the plan AST. WGA is the 3-term version with an extra nested AND.

#### Multi-term keyword AND with a nested AND group containing hopWithField

**`Backend log test 110`** — item — 810 → **4,634 ms** — the WGA case

```json
{
  "AND": [
    { "AND": [ {"text":"woman"}, {"text":"greek"}, {"text":"art"} ] },
    { "AND": [ {"memberOf": {"id": "…set/5e9b…"}} ] }
  ]
}
```

Now benefits from the empty-groups dataType-suppression you just merged (the inner AND group no longer emits its own dataType filter). The keyword cost remains.

---

### 2. `hopWithField` triple-OR by id (work scope) — **second-worst shape**

Four nearly-identical regressions at `work` scope, all of form "OR of 3 hopWithField-by-id":

| Test | Criteria (compacted) | Baseline → Current | Regression |
|---|---|---|---|
| 3644 | `createdBy.id OR publishedBy.id OR creationInfluencedBy.id` (person e791…) | 27 → 2,114 ms | **78×** |
| 3653 | same shape, person a90a… | 31 → 3,135 ms | **101×** |
| 3655 | same shape, group c29d… | 32 → 1,970 ms | 62× |
| 3965 | same shape, person c521… | 34 → 4,625 ms | **136×** |

Example ([Backend log test 3965](scratch/5k-search-comparison.json)):
```json
{
  "OR": [
    { "createdBy":            { "id": "…person/c521…" } },
    { "publishedBy":          { "id": "…person/c521…" } },
    { "creationInfluencedBy": { "id": "…person/c521…" } }
  ]
}
```

All three branches are `hopWithField` with an id-leaf — purely CTS-resolvable (each becomes a `cts.tripleRangeQuery`). But because each is a *patternJoin*, top-level OR triggers the `assemblePlan` patternJoins-OR branch: **duplicate the full work-scope lexicon for each branch, inner-join each, then full-outer-join them all back together**. Three lexicon scans of the entire work scope (~tens of millions of docs) for a query that should be one `cts.tripleRangeQuery` per branch ORed.

**Action — recommended next:** when a `hopWithField` term has an id-leaf (no nested term-as-child), emit it as a `ctsConstraint` (single `cts.tripleRangeQuery`) instead of a `patternJoin`. Then top-level OR collapses to `cts.orQuery([tripleRangeQuery_1, tripleRangeQuery_2, tripleRangeQuery_3])` — one CTS query against the lexicon, no joins. The 27→2,114 ms regression should evaporate. This is the single highest-leverage change available after WGA.

#### Two-branch OR variant

**`Backend log test 4858`** — item — 64 → 1,595 ms (+2,392%)

```json
{
  "OR": [
    { "classification": { "id": "…concept/1ee3…" } },
    { "material":       { "id": "…concept/1ee3…" } }
  ]
}
```

Same shape, two branches. Same fix applies.

---

### 3. `hopWithField` chained 3-deep (event scope)

**`Backend log test 3516`** — event — 33 → 2,094 ms (+6,245%)

```json
{ "used": { "containingItem": { "producedBy": { "id": "…person/d564…" } } } }
```

Term chain: `event.used` (hopWithField) → `item.containingItem` (hopInverse) → `item.producedBy` (hopWithField) → id. Each level is a patternJoin → three nested duplicate-lexicon scans. Compounds the issue from #2.

Same fix as #2 helps the inner two levels (id-leaf hops collapse to tripleRangeQuery). The outer `used` would still need a join because its child is a nested term, not an id.

---

### 4. Single-hop wrapped in degenerate AND

**`Backend log test 287`** — work — 68 → 1,519 ms (+2,134%)

```json
{ "AND": [ { "aboutPlace": { "id": "…place/58a5…" } } ] }
```

Single `hopWithField` by id, but wrapped in a 1-element AND. The newly-added pure-CTS fold doesn't apply because there's no sub-plan — the engine collapses 1-element AND to the leaf directly. The cost is still the patternJoins-OR-style wrap at top level. Same fix as #2 applies.

---

## What's *not* regressing

The 5,587 status-unchanged tests include all the simple shapes:
- `id`-only lookup (documentId pattern)
- Single `hopWithField` at top level (without OR/AND wrapping)
- `indexedValue` / `indexedWord` exact-match terms
- Date / number range terms

These are absent from both the slowest-baseline and slowest-current top-100 lists, suggesting they're at parity (or close).

---

## Priority of follow-up engine work

1. **`hopWithField` with id-leaf → `ctsConstraint`** (tests 287, 3516, 3644, 3653, 3655, 3965, 4858 — 7 of 17 regressions, including the worst). Highest leverage; smallest code surface.
2. **`keyword` plan-AST cost** (WGA + 10 of 17 regressions). Validation scripts already staged in [scratch/performance/woman-greek-art-memberOf/](scratch/performance/woman-greek-art-memberOf/) — waiting on run results.
3. **`hopWithField` chained-by-id timeout fix** (test 10). Lower frequency but functional failure. Likely subsumed by #1 once the inner id-leaf levels collapse.

If #1 + #2 land, the p99.9 should drop sharply and most or all of the 17 regressions should resolve.
