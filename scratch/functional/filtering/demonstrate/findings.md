## **Unfiltered vs Filtered Search Results**

- [Introduction](#introduction)
- [Key Takeaway \& Question](#key-takeaway--question)
- [Current Frontend Implementation](#current-frontend-implementation)
- [Research](#research)
- [Approach](#approach)
- [Behaviors](#behaviors)
- [Decision Matrix](#decision-matrix)
- [Implementation Options](#implementation-options)
- [Appendix: Supplementary Findings](#appendix-supplementary-findings)

# Introduction

When MarkLogic executes a search, there are two phases: selecting candidate fragments using indexes, and optionally filtering those candidates against the actual document content. Unfiltered search returns index candidates directly — fast, but may include false positives (documents the index thinks match but don't). Filtered search verifies each candidate against the document, eliminating false positives at the cost of disk I/O.

LUX's CTS-based search used `cts.search`, which filters by default. The Optic API (`op.fromSearch`, `plan.where(ctsQuery)`) is always unfiltered — there is no switch to enable filtering. This document determines which query shapes produce false positives when unfiltered, and whether the application needs to implement its own filtering for any of them.

# Key Takeaway & Question

The key takeaway: **the default search path needs no filtering.** Filtering is only needed for two user-selectable options (case-sensitive with lowercase terms, punctuation-sensitive), both of which are opt-in checkboxes in the frontend.

The question becomes: are those two features worth implementing filtering and the additional time it would require to execute the search?

# Current Frontend Implementation

The frontend exposes per-term search options as checkboxes. All searches are whitespace-insensitive — there is no whitespace-sensitive option. The backend explicitly blocks `whitespace-sensitive` from `ALLOWED_SEARCH_OPTIONS_KEYWORD` (code comment: "creates incorrect estimates").

| UI Checkbox | Criteria added | Notes |
|---|---|---|
| Boost | `"_weight": 2` | Weight only; does not affect filtering. |
| Exact | `"_complete": true` | Prevents tokenization. Switches to `cts.fieldValueQuery`. Not equivalent to the CTS "exact" option set (case+diacritic+punctuation+whitespace-sensitive+unstemmed+unwildcarded). |
| Case sensitive | `"_options": ["case-sensitive"]` | **Filtering trigger** when the query term is all-lowercase. |
| Diacritic sensitive | `"_options": ["diacritic-sensitive"]` | Likely index-resolvable (`fast-diacritic-sensitive-searches: true`). Not yet validated. |
| Punctuation sensitive | `"_options": ["punctuation-sensitive"]` | **Filtering trigger** — always. |
| Stemmed (unchecked) | `"_options": ["unstemmed"]` | Index-accurate per V5B. |
| Wildcarded (unchecked) | `"_options": ["unwildcarded"]` | Disables wildcard expansion. |

Users can combine options freely — including punctuation-sensitive without Exact.

**Wildcarding note:** The engine enforces ≥3 non-wildcard characters adjacent to each wildcard (`sanitizeAndValidateWildcardedStrings` in `analyzeCriteria.mjs`). Combined with `trailing-wildcard-searches: true`, `trailing-wildcard-word-positions: true`, and `three-character-searches: true` on all Keyword fields, constrained wildcard patterns are index-resolvable. The validation rejects pathological patterns that would otherwise require filtering.

# Research

This analysis draws from:
- **Bob Starbird's "Unfiltered Searches" reference document** — a write-up from MarkLogic consulting that proved to be an authoritative source on index limitations and false-positive triggers.
- **LUX database configuration** — the deployed field and range index settings (database-configuration.json, [lux-backend-database-indexing.md](/lux-backend-database-indexing.md)).
- **LUX application code** — how search options flow from the frontend through analyzeCriteria.mjs to CTS query construction in Keyword.mjs.
- **UAT findings** ([Optic Feedback](https://docs.google.com/spreadsheets/d/1NLAgcQd5wWt84snSWCtSUT4lEuI_yd2M/edit?gid=673804214#gid=673804214)) — case sensitivity, punctuation sensitivity, and NOT exclusion discrepancies observed between the CTS and Optic implementations.
- **LLM-assisted analysis** of MarkLogic documentation and internal guidance on Optic search capabilities (filtering-aspects.tsv, optic-guidance.tsv).

# Approach

We created 14 synthetic JSON-LD documents that follow the LUX data model (HumanMadeObject with `itemAnyText`-eligible `content` nodes) but contain controlled values designed to isolate specific index behaviors. Each document is minimal — just enough structure for MarkLogic's field path expressions to match.

Seven validation scripts (V1–V7) each test a specific false-positive scenario by running three queries against the same CTS expression:
1. **Unfiltered** (`cts.uris`) — index-only resolution, no document retrieval.
2. **Filtered** (`cts.search`) — index resolution followed by document-level verification.
3. **Optic** (`op.fromSearch` joined to `op.fromLexicons`) — the plan shape used by the non-semantic portion of the Keyword search pattern.

When unfiltered and filtered counts diverge, the difference is false positives. When Optic diverges from filtered, the Optic path has the same false positives (expected — Optic is unfiltered by design).

Scripts and synthetic documents are in demonstrate. The Query Console workspace `Unfiltered.xml` contains all scripts, inclusive of "Insert" and "Delete" which insert and delete the synthetic documents.

| Script | Tests |
|---|---|
| `v1-cross-instance-phrase.js` | Phrase query where words span separate `//content` nodes |
| `v2-case-sensitivity.js` | Upper, lower, and insensitive case variants |
| `v3-punctuation-sensitivity.js` | Apostrophe (O'Keeffe) and hyphen (self-portrait) variants |
| `v4-not-exclusion.js` | NOT exclusion with (stieglitz OR o'keeffe) -library |
| `v5-stemming.js` | Stemmed vs unstemmed behavior |
| `v6-field-containment.js` | Tokenized AND vs exact value across `//content` instances |
| `v7-lowercase-case-sensitive.js` | Lower-case case-sensitive (Bob Starbird's specific callout) |

# Behaviors

Everything in Bob Starbird's document remained true in MarkLogic 12.0.1 with field-level index overrides. All rows below are discussed in his document unless noted with †.

| Scenario | Unfiltered = Filtered? | False Positives? | Verdict |
|---|---|---|---|
| **V1** Cross-instance phrase | Yes (1=1=1) | None | Phrase queries are index-accurate. `field-value-positions` works. |
| **V2A** Case-sensitive "PAINTING" (upper) | Yes (1=1=1) | None | Non-lowercase case-sensitive is index-resolvable. |
| **V2B** Case-sensitive "painting" (lower) | **No (4 vs 1)** | **3 false positives** | Bob is correct; verified by V2B. Lower-case = case-insensitive to the index. |
| **V2C** Case-insensitive "painting" | Yes (4=4=4) | None | Baseline correct. |
| **V3A** Punctuation-insensitive "o'keeffe" | Yes (2=2=2) | None | Insensitive path is index-accurate. |
| **V3B** Punctuation-sensitive "o'keeffe" | **No (2 vs 1)** | **1 false positive** | Bob is correct; verified by V3B. Punctuation not in index. |
| **V3C** Punctuation-sensitive "self-portrait" | **No (2 vs 1)** | **1 false positive** | Bob is correct; verified by V3C. Hyphen treated same as space. |
| **V3D** Punctuation-insensitive "self-portrait" | Yes (2=2=2) | None | Insensitive path is index-accurate. |
| **V4** NOT (stieglitz OR o'keeffe) -library | Yes (3=3=3=3) | None | NOT works correctly when sub-queries are index-accurate. |
| **V5A** Stemmed "painting" | Yes (4=4=4) | None | Stemming is index-accurate. |
| **V5B** Unstemmed "painting" | Yes (3=3=3) | None | Unstemmed is index-accurate. |
| **V6A** Tokenized cross-instance | Yes (2=2=2) | None | Tokenized AND across //content instances is correct behavior. |
| **V6B** Exact value cross-instance † | Yes (0=0=0) | None | `fieldValueQuery` enforces single-instance containment. |
| **V6C** Exact value single instance † | Yes (1=1=1) | None | Exact match works. |
| **V7A** Case-sensitive "stieglitz" (lower) | **No (2 vs 0)** | **2 false positives** | Bob is correct; verified by V7A. All results are false positives. |
| **V7B** Case-sensitive "Stieglitz" (title) | Yes (2=2=2) | None | Non-lowercase is accurate. |

Result counts in the second column are unfiltered = filtered = Optic. V4 has four values because it tested two Optic variants (`where` and `fromSearch`).

† Bob discusses `element-value-query` resolving exact values but does not specifically address `fieldValueQuery` with broad field paths (`//content`) spanning multiple instances.

# Decision Matrix

| Query shape | Filtering required? | Evidence |
|---|---|---|
| Default keyword (all insensitive, stemmed) | **No** | V2C, V3A/D, V5A/B, V6A — all clean |
| Case-sensitive, **lowercase** query term | **Yes** | V2B (4→1), V7A (2→0) |
| Case-sensitive, **non-lowercase** query term | **No** | V2A, V7B — index-accurate |
| Punctuation-sensitive word query | **Yes** | V3B (2→1), V3C (2→1) |
| Exact match (`_complete` / fieldValueQuery) | **No** | V6B, V6C — index-accurate |
| NOT wrapping accurate sub-queries | **No** | V4 — clean |
| NOT wrapping inaccurate sub-queries | **Yes (amplified)** | Not directly tested, but follows logically |
| Stemmed / unstemmed | **No** | V5A/B — clean |
| Tokenized multi-word | **No** | V6A — clean |
| Phrase within single field instance | **No** | V1 — clean |

# Implementation Options

> Filtering is only needed for two user-selectable options (case-sensitive with lowercase terms, punctuation-sensitive), both of which are opt-in checkboxes in the frontend.

If the above is required, filtering must be implemented selectively.

**Key constraint:** filtering does not need to process the entire result set. Like `cts.search`, the implementation only needs to filter enough documents to fill the requested page (typically 20 results). The approach:

1. **Estimates and facets remain unfiltered.** Total counts are already estimates (both CTS and Optic use index-based estimation). Facets operate on URIs from the unfiltered result set. Neither requires document-level verification.
2. **Filter only the page slice.** Retrieve candidate documents for the requested page, apply `cts.contains(doc, fullQuery)` to each, and backfill from subsequent candidates if any are rejected. This bounds the filtering cost to roughly `pageLength + falsePositiveCount` document retrievals per request.
3. **Conditional activation.** Filtering is only invoked when the resolved search options include a trigger (`punctuation-sensitive`, or `case-sensitive` with an all-lowercase query term). The default search path (all insensitive, stemmed) bypasses filtering entirely.

**Performance impact:** For the typical case (page 1, 20 results, low false-positive rate), the additional cost is minimal — a handful of extra document reads. The cost increases with deep pagination and high false-positive rates, but both are uncommon for the triggering query shapes.

# Appendix: Supplementary Findings

1. **Stemming asymmetry** — Basic stemming uses only the shortest stem. A stemmed search for "painting" matches "painted" (both stem to "paint") but not "paintings" (stems to "painting", one level short). This affects recall but is not a false positive — both filtered and unfiltered agree.

2. **What the old CTS implementation actually did** — `cts.search` filtered by default, so false positives from case and punctuation sensitivity were silently removed. The UAT discrepancies are not Optic bugs — they are the removal of a safety net that was always present. The UAT punctuation finding (both CTS and Optic ignoring it) may indicate the old CTS path was also running unfiltered for some code paths.

3. **NOT amplification** — If a sub-query produces false positives (documents the index thinks match but don't), wrapping it in NOT converts those into false negatives (documents incorrectly excluded from results). V4 confirmed NOT is correct when sub-queries are index-accurate. The risk exists only when NOT wraps a punctuation-sensitive or lowercase case-sensitive sub-query.

4. **Why whitespace-sensitive is blocked** — The backend explicitly omits `whitespace-sensitive` from allowed keyword options with the comment "creates incorrect estimates." This eliminates an entire class of false positives by design.

5. **Optic vs CTS equivalence** — In every test, Optic (`op.fromSearch`) produced identical results to unfiltered CTS (`cts.uris`). There are no engine-level bugs. The only discrepancies are between unfiltered and filtered CTS — exactly the gap this document characterizes.

6. **UAT findings explained** — The case sensitivity finding maps to V2B/V7A (lower-case queries resolve case-insensitively). The punctuation finding maps to V3B/C (punctuation not in the index). The NOT finding (158 vs 3) likely reflects filtered CTS vs unfiltered Optic on the full dataset — the CTS estimate tab reported 158 (the unfiltered count), while the results page showed 3 (the filtered count).

7. **Mixed-case query terms** — A query term like "O'Keeffe" contains an uppercase character, so a case-sensitive search for it IS index-resolvable. The lower-case false-positive rule only applies when every character in the query term is lowercase.
