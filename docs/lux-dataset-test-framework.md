## **Dataset Test Framework**

- [Executive Summary](#executive-summary)
  - [What the Endpoint Does](#what-the-endpoint-does)
  - [Reading the Response](#reading-the-response)
  - [What Is Checked Today](#what-is-checked-today)
  - [Recommended Next Tests](#recommended-next-tests)
- [Introduction](#introduction)
- [Goals](#goals)
- [Endpoint](#endpoint)
  - [Path and Security](#path-and-security)
  - [Parameters](#parameters)
  - [Response Structure](#response-structure)
  - [Scoring and Go/No-Go](#scoring-and-gono-go)
- [Baseline Comparison Strategy](#baseline-comparison-strategy)
- [Architecture](#architecture)
  - [File Layout](#file-layout)
  - [Self-Registration Pattern](#self-registration-pattern)
  - [Test Interface](#test-interface)
  - [Test Context](#test-context)
  - [Framework Orchestrator](#framework-orchestrator)
- [Tests](#tests)
  - [Implemented Tests](#implemented-tests)
    - [`predicate-coverage`](#predicate-coverage)
    - [`predicate-alignment`](#predicate-alignment)
    - [`range-index-coverage`](#range-index-coverage)
    - [`record-types-by-predicates`](#record-types-by-predicates)
    - [`index-comparison`](#index-comparison)
    - [`scope-estimates`](#scope-estimates)
    - [`storage-info`](#storage-info)
  - [Test Categories](#test-categories)
  - [Periodic Review Recommendations](#periodic-review-recommendations)
    - [Unreferenced Predicates](#unreferenced-predicates)
    - [Index Configuration Drift](#index-configuration-drift)
  - [Gap Analysis and Future Tests](#gap-analysis-and-future-tests)
- [Incremental Update Support](#incremental-update-support)
- [Performance Considerations](#performance-considerations)
- [TODOs](#todos)

# Executive Summary

The backend now includes a **Dataset Validation endpoint** (`/ds/lux/validateDataset.mjs`) that replaces the manual script-running and output-comparison workflow documented in [existing-dataset-checks-summary.md](/docs/existing-dataset-checks-summary.md).  A single POST request runs a suite of pluggable tests against the current dataset and returns a structured report with an automated go/no-go decision.

## What the Endpoint Does

The orchestrating process (CI/CD pipeline, deployment script, or human operator) calls the endpoint with optional parameters:

- **`baseline`** — the saved JSON response from a prior run (e.g., production).  Tests that support comparison compute deltas and flag regressions.  This is **stateless**: environments do not need to talk to each other.  The caller simply passes in a previously saved report.
- **`unitNames`** — restrict validation to specific museum units (e.g., `ypm`).  Tests that support per-unit execution run as each unit's user, catching permission regressions that affect one museum but not others.
- **`categories`** — run only a subset of tests (e.g., `relational`, `indexing`).
- **`testConfig`** — skip specific tests or override pass/fail thresholds.

A typical promotion workflow:

1. Load the candidate dataset into the target environment.
2. POST to the validation endpoint, passing the last known-good report as `baseline`.
3. Inspect the response's `overallPass` flag and per-test details.
4. Promote or block based on the results.

The new endpoint is documented in full in the [API usage documentation](./lux-backend-api-usage.md#validate-dataset).

## Reading the Response

The response contains three main sections:

| Section | What it tells you |
|---------|-------------------|
| **`summary.overallPass`** | Single boolean: safe to promote or not.  `false` if any critical test fails **or** the aggregate score is below threshold (default 80%). |
| **`summary.criticalPass`** | `false` if any test marked `critical` failed.  Even a single critical failure blocks promotion regardless of the aggregate score. |
| **`summary.aggregateScore`** | Weighted average of all test scores (0.0–1.0).  Critical tests carry double weight. |
| **`tests[]`** | Per-test detail: ID, derived severity, score, pass/fail, threshold, duration, summary message, `findings[]`, and a `result` object with test-specific data.  The `result` is preserved so this response can serve as the baseline for the next run. |
| **`warnings`** | Present only when there are mismatches between the baseline and current run (e.g., a test was added or removed since the baseline was captured).  These are informational — they do not affect pass/fail. |

**Severity tiers** control how each test's outcome affects the overall decision:

| Severity | Effect |
|----------|--------|
| **critical** | Any failure sets `overallPass = false` |
| **warning** | Contributes to aggregate score but does not block alone |
| **informational** | Reported for visibility; no effect on pass/fail |

## What Is Checked Today

Seven tests are implemented, covering the five manual scripts and two API endpoints that were previously run by hand, which is everything documented within [./existing-dataset-checks-summary.md](./existing-dataset-checks-summary.md):

| Test | Category | What it validates | Baseline comparison |
|------|----------|-------------------|---------------------|
| **Predicate Coverage** | relational | Every configured predicate has matching documents.  Runs per unit to catch permission-based visibility gaps. | Per-predicate count deltas |
| **Predicate Alignment** | relational | Predicates referenced in code exist in the dataset, and vice versa. | N/A (structural check) |
| **Record Types by Predicates** | relational | Each predicate appears on expected record types (agent, work, item, etc.).  Hard failure if a predicate loses record type associations. | Record type additions/removals |
| **Range Index Coverage** | indexing | Every field range index defined on the database contains values.  Runs per unit. Informational only; reported but does not affect go/no-go. | Per-index count deltas |
| **Index Comparison** | indexing | Fields and field range indexes referenced in code match those configured on the database.  Reports missing and unused indexes. | N/A (structural check) |
| **Scope Estimates** | content | Document count estimates per search scope are non-zero.  Runs per unit (since estimates honor document permissions). | Per-scope count deltas |
| **Storage Info** | infrastructure | Cluster storage levels are within safe thresholds.  Flags WARNING and CRITICAL volumes. | N/A (point-in-time check) |

The two helper scripts (`compareCounts.js` and `compareArrays.js`) are no longer needed separately — their comparison logic is built into the baseline comparison capability of the tests above.

## Recommended Next Tests

Adding a new test is a single-file operation: create one module that extends [DatasetTestBase](/src/main/ml-modules/root/lib/datasetValidation/DatasetTestBase.mjs), self-register it, and it appears in the next run.  The following would close the most significant remaining gaps:

| Test | Category | Why |
|------|----------|-----|
| **Geospatial Index Population** | indexing | Verifies geospatial path indexes have values — currently unchecked |
| **Vector TDE Population** | indexing | Verifies the vector TDE has rows — critical for semantic search |
| **Multi-User Visibility** | permissions | Automated cross-unit document visibility spot-checks — currently manual |
| **Facet Value Coverage** | content | Verifies facets return expected value distributions — a user-visible feature |
| **Triple Connectivity** | relational | Detects orphan subjects or broken inverse relationships — data quality check |

Full gap analysis with execution-time estimates: [Gap Analysis and Future Tests](#gap-analysis-and-future-tests).

# Introduction

The LUX backend has a collection of scripts within [/scripts](/scripts) and endpoints that assist with inspecting a candidate dataset and comparing to the production dataset (see [existing-dataset-checks-summary.md](/docs/existing-dataset-checks-summary.md)).  These scripts are run manually, typically from Query Console, and require manual comparison of their output across dataset versions.

This design replaces that workflow with a **Dataset Test Framework**: a single Data Service endpoint backed by a pluggable set of tests.  Each test contributes to a structured report and influences an automated go/no-go decision.  The framework supports both full dataset validation (for promotion through environments) and incremental update validation.

# Goals

1. **Reduce labor**: replace manual script execution and output comparison with a single endpoint call that produces a structured report.
2. **Automated go/no-go**: produce a composite pass/fail signal and per-test scores suitable for pipeline integration.
3. **Baseline comparison**: when the caller provides the prior dataset's report, tests compute deltas and flag regressions.
4. **Incremental update support**: support validation of partial dataset updates alongside full dataset validation.
5. **Extensibility**: adding a new test is: create one module, self-register, done.

# Endpoint

## Path and Security

**Path**: `/ds/lux/validateDataset.mjs`

**Method**: `POST` (the `baseline` parameter may be large).

**Security**: The endpoint uses `handleRequest()` like all other LUX endpoints.  The requesting user must have the `admin` role or the `%%mlAppName%%-validate-dataset` execute privilege.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `unitNames` | string | No | Comma-delimited list of unit names to validate. Default: TENANT_OWNER only. |
| `categories` | string | No | Comma-delimited list of test categories to run. Default: all. See [Test Categories](#test-categories). |
| `testConfig` | jsonDocument | No | Per-test overrides. Keys are test IDs; values are objects with optional `threshold` (number) and `skip` (boolean) properties. Also supports top-level `overallPassThreshold` (number). |
| `baseline` | jsonDocument | No | The response body from a prior run.  When provided, tests that support comparison compute deltas and factor them into scores. |
| `baselineId` | string | No | Freeform label identifying the baseline artifact (e.g., `prod-2026-05-20`). Captured in `metadata` for traceability. |
| `format` | string | No | Response format. Default: `json`. Only `json` is initially supported; `html` is a future option. |

The `.api` definition:

```json
{
  "functionName": "validateDataset",
  "params": [
    { "name": "unitNames", "datatype": "string", "nullable": true },
    { "name": "categories", "datatype": "string", "nullable": true },
    { "name": "testConfig", "datatype": "jsonDocument", "nullable": true },
    { "name": "baseline", "datatype": "jsonDocument", "nullable": true },
    { "name": "baselineId", "datatype": "string", "nullable": true },
    { "name": "format", "datatype": "string", "nullable": true }
  ],
  "return": {
    "datatype": "jsonDocument",
    "$javaClass": "com.fasterxml.jackson.databind.JsonNode"
  }
}
```

## Response Structure

```json
{
  "metadata": {
    "id": "tst-2026-05-25T14:30:00Z",
    "timestamp": "2026-05-25T14:30:00.000Z",
    "durationMs": 45000,
    "codeVersion": "1.2.3",
    "parameters": {
      "unitNames": ["lux"],
      "categories": ["relational", "indexing"],
      "testConfig": null,
      "baselineProvided": true,
      "baselineTestsMatched": 4,
      "baselineId": "prod-2026-05-20",
      "format": "json"
    }
  },
  "summary": {
    "overallPass": true,
    "overallPassThreshold": 0.8,
    "aggregateScore": 0.94,
    "criticalPass": true,
    "testsRun": 4,
    "testsPassed": 3,
    "testsWarning": 1,
    "testsFailed": 0,
    "failedTestIds": []
  },
  "tests": [
    {
      "id": "predicate-coverage",
      "name": "Predicate Coverage",
      "category": "relational",
      "severity": "critical",
      "score": 0.95,
      "pass": true,
      "threshold": 0.90,
      "durationMs": 1234,
      "message": "All configured predicates have matching documents.",
      "findings": [
        {
          "severity": "informational",
          "message": "All configured predicates have matching documents."
        }
      ],
      "result": {}
    }
  ],
  "warnings": [
    "Baseline contains test(s) not in the current run: old-removed-test."
  ]
}
```

**`metadata.id`**: Generated from the environment name and timestamp.  Identifies the artifact sufficiently for manual lookup in source control.

**`metadata.parameters`**: All parameter values (except the full `baseline` body), including `baselineId` and `baselineTestsMatched` (count of running tests that matched a baseline entry).

**`tests[]`**: Each entry conforms to the [Test Interface](#test-interface).

**`tests[].findings[]`**: Structured findings emitted by the test (`critical`, `warning`, `informational`) with per-finding messages. The framework derives each test's overall `severity` from these findings.

**`warnings`**: Optional array of strings.  Present only when there are baseline or parameter mismatches (e.g., test ID differences between baseline and current run, unit name differences when `unitNames` was explicitly provided).  TENANT_OWNER is excluded from unit name comparison.

## Scoring and Go/No-Go

Each test produces a `score` between 0.0 and 1.0 and a `pass` boolean derived from `score >= threshold`.

**Severity tiers** control how test results contribute to the overall decision:

| Severity | Effect on `overallPass` | Use case |
|----------|------------------------|----------|
| `critical` | Any critical test failure sets `overallPass = false` | Configured predicate with zero documents |
| `warning` | Contributes to `aggregateScore` but does not block alone | 15% count drop from baseline |
| `informational` | No effect on pass/fail; reported for visibility | Storage utilization summary |

**`criticalPass`**: `true` if all critical tests pass.

**`aggregateScore`**: Weighted average of all test scores (critical tests weighted higher).  The framework computes this; the caller's pipeline applies its own promotion logic to the structured report rather than relying solely on a single number.

`informational` tests are visible in the report and can still have `pass=false`, but they do not affect `overallPass` because their aggregate weight is zero.

# Baseline Comparison Strategy

The endpoint accepts the `baseline` parameter: the full JSON response from a prior run against a different dataset version.

**Why this approach**:
- **Stateless**: the server does not need to know about other environments or credentials.
- **Flexible**: the orchestrator controls what to compare against (production, pre-incremental snapshot, last week's candidate).
- **Artifact-friendly**: naturally encourages saving each response as a versioned artifact.
- **Env-independent**: works regardless of whether other environments are online.

**How it works**: The framework extracts each test's `result` block from the baseline (matched by test `id`) and passes it to that test's `run()` function as `context.baseline`.  Tests that support comparison compute deltas; tests that do not simply ignore the baseline.

**Future option**: Store baseline snapshots as documents in the content database, retrievable by a `baselineVersion` parameter.  The test interface would not change — tests always receive a baseline object, regardless of origin.

# Architecture

## File Layout

```
src/main/ml-modules/root/
├── ds/lux/
│   ├── validateDataset.mjs              # Data Service entry point
│   └── validateDataset.api              # Parameter definitions
├── lib/datasetValidation/
│   ├── datasetValidationLib.mjs         # Framework orchestrator
│   ├── DatasetTestBase.mjs              # Base class + registry
│   ├── DatasetTestInterface.mjs         # Interface contract
│   ├── loadTests.mjs                    # Barrel module (triggers registration)
│   └── tests/
│       ├── predicateCoverage.mjs        # checkPredicates logic
│       ├── predicateAlignment.mjs       # comparePredicates logic
│       ├── rangeIndexCoverage.mjs       # getRangeIndexValueCounts logic
│       ├── recordTypesByPredicates.mjs  # getRecordTypesByPredicates logic
│       ├── indexComparison.mjs          # indexComparisonChecks logic
│       ├── scopeEstimates.mjs           # stats endpoint logic
│       └── storageInfo.mjs              # storageInfo endpoint logic
```

## Self-Registration Pattern

Consistent with the search pattern registration ([SearchPatternBase.mjs](/src/main/ml-modules/root/lib/search/patterns/SearchPatternBase.mjs)):

**`DatasetTestBase.mjs`** maintains a registry populated by each test file's self-registration:

```javascript
const REGISTRY = {};

class DatasetTestBase extends DatasetTestInterface {
  static register(id, instance) {
    REGISTRY[id] = Object.freeze(instance);
  }

  static get(id) {
    return REGISTRY[id];
  }

  static has(id) {
    return id in REGISTRY;
  }

  static getAll() {
    return Object.values(REGISTRY);
  }

  static getAllIds() {
    return Object.keys(REGISTRY);
  }
}
```

**Each test file** self-registers at module load:

```javascript
// tests/predicateCoverage.mjs
class PredicateCoverage extends DatasetTestBase {
  getId()              { return 'predicate-coverage'; }
  getName()            { return 'Predicate Coverage'; }
  getCategory()        { return 'relational'; }
  getDefaultThreshold(){ return 1.0; }

  run(context) {
    // Test logic ported from checkPredicates.js
  }
}

DatasetTestBase.register('predicate-coverage', new PredicateCoverage());
```

**`loadTests.mjs`** is a barrel module that triggers all registrations via side-effect imports:

```javascript
// Side-effect imports: each test self-registers with DatasetTestBase.
import './tests/predicateCoverage.mjs';
import './tests/predicateAlignment.mjs';
import './tests/rangeIndexCoverage.mjs';
import './tests/recordTypesByPredicates.mjs';
import './tests/indexComparison.mjs';
import './tests/scopeEstimates.mjs';
import './tests/storageInfo.mjs';

// Re-export for consumers.
export { DatasetTestBase } from './DatasetTestBase.mjs';
```

## Test Interface

**`DatasetTestInterface.mjs`** defines the contract every test must fulfill:

```javascript
class DatasetTestInterface {
  // Identity
  getId()               { throw new NotImplementedError(...); }
  getName()             { throw new NotImplementedError(...); }
  getCategory()         { throw new NotImplementedError(...); }
  getDefaultThreshold() { throw new NotImplementedError(...); }

  // Execution
  run(context)          { throw new NotImplementedError(...); }
}
```

`getSeverity(findings)` is implemented by `DatasetTestBase` by default (derived from findings: `critical` > `warning` > `informational`). A test may override it when needed.

**`run(context)`** returns test-specific payload only:

```javascript
{ /* test-specific detail, preserved for future baselines */ }
```

The returned payload is test-specific and opaque to the framework. It is included in the response as `result` so that this response can later serve as a baseline for a subsequent run.

## Test Context

The framework constructs a context object and passes it to each test's `run()`:

```javascript
{
  threshold: 0.90,            // Effective threshold (consumer override or default)
  baseline: { /* ... */ },    // Previous result for this test (null if no baseline)
  unitNames: ['lux'],         // Unit names to validate
  config: { /* ... */ },      // Per-test config from testConfig (e.g. deltaThresholdPercent)

  // Findings API
  addInformationalFinding(message),
  addWarningFinding(message),
  addCriticalFinding(message),
  getFindings(),
  hasAnyFindings(),
  hasCriticalFindings(),
  hasWarningFindings(),
  hasInformationalFindings(),

  // Scoring API
  setScore(number),
  setScoreFromFindings(policy), // policy: 'critical-only' | 'warning-or-critical' | 'any-finding'
  getScore(),

  // Optional message override
  setMessage(message),
  getMessage(),
}
```

`message` is required and must be a non-empty string for all `add*Finding` calls and for `setMessage`.

## Framework Orchestrator

**`datasetValidationLib.mjs`** is the central library, following the same DS → Library layering as all other endpoints.

Responsibilities:
1. Import `loadTests.mjs` to populate the registry.
2. Filter tests by requested `categories`.
3. Apply `testConfig` overrides (skip, threshold).
4. For each test: build context, call `run()`, capture duration, assemble the test result.
5. Compute `summary` (aggregateScore, criticalPass, overallPass).
6. Assemble and return the full response.

# Tests

## Implemented Tests

### `predicate-coverage`

**Ported from**: [checkPredicates.js](/scripts/checkPredicates.js)

**Category**: `relational` | **Severity**: `critical`

**Severity behavior**: Usually `critical` when missing predicates are found; otherwise `informational`.

**What it does**: For each predicate referenced in search terms, keyword search, and sort configurations, estimates the document count via `cts.estimate()`.  Runs per unit name.

**Baseline comparison**: When a baseline is provided, computes per-predicate percent delta.  Score is the proportion of predicates within an acceptable delta range.

**Info-only mode** (no baseline): Score is 1.0 if all predicates have non-zero estimates; reduced proportionally by zero-count predicates.

**Result payload**:
```json
{
  "predicates": {
    "https://lux.collections.yale.edu/ns/agentAny": {
      "estimate": 123456,
      "baselineEstimate": 120000,
      "deltaPercent": 2.88,
      "terms": ["agent.agentAnyText"]
    }
  },
  "zeroCountPredicates": [],
  "unitResults": {
    "ypm": { "predicates": { } }
  }
}
```

### `predicate-alignment`

**Ported from**: [comparePredicates.js](/scripts/comparePredicates.js)

**Category**: `relational` | **Severity**: `critical`

**Severity behavior**: `critical` when associations are missing or removed; otherwise `informational`.

**What it does**: Queries all predicates in the dataset via Optic `fromTriples` grouped by predicate.  Compares against predicates referenced in code (derived at runtime from the same configs, not hardcoded).

**Score**: 1.0 if `referencedButDoesNotExist` is empty; reduced by the count of missing predicates.  Unused predicates (`existsButNotReferenced`) contribute to message but are not penalized by default (they are informational).

**Result payload**:
```json
{
  "referencedButDoesNotExist": [],
  "existsButNotReferenced": ["https://example.org/unusedPredicate"],
  "totalPredicatesInDataset": 72,
  "totalPredicatesInConfig": 58
}
```

### `range-index-coverage`

**Ported from**: [getRangeIndexValueCounts.js](/scripts/getRangeIndexValueCounts.js)

**Category**: `indexing` | **Severity**: `informational`

**What it does**: Uses the admin API to enumerate all range field indexes, then counts distinct values via `cts.fieldValues`. Flags indexes with zero values.

**Why informational**: This test checks population of all configured range field indexes, including indexes that may be intentionally present for operational flexibility or future use. Unlike `index-comparison`, it is not limited to indexes referenced by the codebase, so empty indexes are useful to surface but should not block promotion on their own.

**Baseline comparison**: Computes per-index percent delta. Score penalized for large deltas exceeding `deltaThresholdPercent` (configurable, default 10%). Supports per-unit execution.

### `record-types-by-predicates`

**Ported from**: [getRecordTypesByPredicates.js](/scripts/getRecordTypesByPredicates.js)

**Category**: `relational` | **Severity**: `critical`

**What it does**: For each configured predicate, determines which record types have matching triples. If a baseline shows a predicate lost record type associations (`typesRemoved`), the score drops to 0 (hard no-go).

**Result payload** includes `hasRemovedTypes` boolean for quick assessment.

### `index-comparison`

**Ported from**: [indexComparisonChecks.js](/scripts/generateIndexConf/indexComparisonChecks.js)

**Category**: `indexing` | **Severity**: `critical`

**Severity behavior**: `critical` when referenced indexes are missing; `informational` when only unused indexes are present.

**What it does**: Cross-references code-referenced indexes (from autoComplete, sort bindings, and search terms configurations) against database-configured indexes via the admin API. Missing fields/field range indexes are a hard failure. Unused indexes are reported for review but do not affect the score.

### `scope-estimates`

**Ported from**: [stats.mjs](/src/main/ml-modules/root/ds/lux/stats.mjs) endpoint

**Category**: `content` | **Severity**: `critical`

**Severity behavior**: `critical` for zero scopes, `warning` for large baseline deltas, otherwise `informational`.

**What it does**: Calls `getScopeEstimates()` to get document count estimates per search scope. Flags scopes with zero documents. Supports per-unit execution (since `cts.estimate` honors document permissions) and baseline delta comparison with configurable `deltaThresholdPercent`.

### `storage-info`

**Ported from**: [storageInfo.mjs](/src/main/ml-modules/root/ds/lux/storageInfo.mjs) endpoint

**Category**: `infrastructure` | **Severity**: `critical`

**What it does**: Calls `getStorageInfo()` to check cluster storage levels. Flags hosts/volumes with WARNING or CRITICAL thresholds. Score: 0 for any critical, 1.0 otherwise. WARNINGs are included in the result but do not block by themselves.

**Severity behavior**: `critical` when critical storage findings are present; otherwise `informational`.

## Test Categories

| Category | What it validates | Applicable to |
|----------|-------------------|---------------|
| `relational` | Predicate coverage, predicate alignment, record type associations | Full + incremental |
| `indexing` | Range index population, index config alignment | Full + incremental |
| `content` | Document counts, scope-level estimate totals | Full + incremental |
| `infrastructure` | Storage utilization, cluster health | Full + incremental |
| `permissions` | Document visibility by role/unit | Full + incremental |
| `delta` | Expected vs. actual change counts, no unintended deletions | Incremental only |

The `categories` parameter accepts a comma-delimited list.  When omitted, all categories are run.

## Periodic Review Recommendations

Observations from the first full-dataset validation runs suggest the following ongoing monitoring practices:

### Unreferenced Predicates

The **Predicate Alignment** test detected predicates in the dataset that are not referenced by any search term configuration. These may be:

- **Intentionally unused**: populated for future feature work or analysis, with a conscious decision not to expose in search.
- **Orphaned**: previously used but no longer needed, and candidates for removal.
- **Missing configuration**: search term configs that reference them may have been lost or not yet added.

**Recommendation**: Periodically review the `existsButNotReferenced` list from a Predicate Alignment run to confirm these are intentional. Consider documenting the purpose of each unreferenced predicate so future maintainers understand the original intent.

### Index Configuration Drift

The **Index Comparison** test reported unused indexes (configured on the database but not referenced by code). Over time, accumulation of unused indexes incurs storage and indexing overhead without benefit.

**Recommendation**: Periodically review the `unused` list and remove indexes that are truly obsolete. This is particularly important after incremental dataset updates, which may introduce temporary misalignments as the code and database configuration are brought in sync.

## Gap Analysis and Future Tests

The following are tracked for future implementation.  Priority and feasibility will depend on execution time and value.  Items marked with execution time concerns may need sampling strategies or may be better suited for batch/scheduled execution.

| Test ID | Category | Description | Execution Time Concern |
|---------|----------|-------------|----------------------|
| `geospatial-index-population` | indexing | Verify geospatial path indexes have values | Low–Medium |
| `vector-tde-population` | indexing | Verify the vector TDE ([vectors.json](/src/main/ml-schemas/tde/vectors.json)) has rows | Low–Medium |
| `auto-complete-coverage` | indexing | Verify auto-complete indexes have values | Medium |
| `facet-value-coverage` | content | Verify facets return expected value distributions | Medium |
| `document-structure` | content | Spot-check documents per record type for expected properties | Medium |
| `triple-connectivity` | relational | Detect orphan subjects or broken inverse relationships | High |
| `multi-user-visibility` | permissions | Automated cross-unit document visibility checks | Medium |
| `duplicate-detection` | content | Check for duplicate URIs or near-duplicate documents | High |
| `query-performance` | content | Representative queries execute within expected time bounds | Medium |
| `incremental-delta-counts` | delta | Verify actual count changes match the update manifest | Low |
| `incremental-no-deletions` | delta | Verify untouched record types did not lose documents | Low |
| `incremental-permissions` | delta | Verify new/updated documents have correct permissions | Medium |

**Note**: Everything within [/scripts](/scripts) should be reviewed for additional candidates.

# Incremental Update Support

Incremental updates — partial dataset changes applied as frequently as once a day — introduce validation needs beyond full-dataset checks.

**How incremental validation works with this framework**:

1. The orchestrating process loads the incremental update into the target environment.
2. The process calls the dataset validation endpoint with:
   - `baseline`: the response from the *pre-update* run (or the last known-good full-dataset run).
  - `categories`: `"content,relational,delta"` (or all).
   - Optionally, a `delta` manifest describing expected changes.
3. Tests compare current state to baseline and flag unexpected regressions.

**Delta-category tests** are specific to incremental updates.  They validate that the changes match expectations (correct count deltas, no collateral deletions, correct permissions on new documents).  These tests may require an additional endpoint parameter (e.g., `delta` manifest) to be designed when the incremental update pipeline's output format is known.

**Full dataset tests remain applicable**: predicate coverage, predicate alignment, index population, etc. still run during incremental validation.  The baseline comparison makes them sensitive to regressions introduced by partial updates.

# Performance Considerations

**Execution time** is a primary constraint.  Some individual tests (e.g., Optic `fromTriples` group-by) take 15–45 seconds.  Full suites could take several minutes.

**Mitigations**:

1. **Deploy port**: The endpoint should be consumed via the deploy port, which has a longer request timeout than the application server port.

2. **Parallel consumer requests**: The `categories` and `testConfig` parameters enable consumers to split work across concurrent requests.  For example:
   ```
   POST /ds/lux/validateDataset.mjs?categories=relational
   POST /ds/lux/validateDataset.mjs?categories=quantitative
   ```

3. **Skip expensive tests**: `testConfig` allows skipping specific tests for quick spot checks:
   ```json
   { "testConfig": { "predicate-alignment": { "skip": true } } }
   ```

4. **Per-test duration reporting**: The response includes `durationMs` per test, enabling consumers to identify bottlenecks and optimize subsequent requests.

5. **Sampling over exhaustive scans**: Future tests that would otherwise be prohibitively expensive (triple connectivity, duplicate detection) should use sampling strategies rather than exhaustive scans.

6. **Feasibility gate**: Before implementing a new test, its estimated execution time should be assessed.  Tests exceeding a reasonable threshold may be better suited for batch/scheduled execution outside this endpoint.

# TODOs

- [x] Register endpoint in [endpointsConfig.mjs](/src/main/ml-modules/root/config/endpointsConfig.mjs) (`ampAsAdmin: false`)
- [x] Define an execute privilege for this endpoint and include an assert to require the requesting user have it
- [x] Document endpoint in [lux-backend-api-usage.md](/docs/lux-backend-api-usage.md)
- [ ] Review all scripts in [/scripts](/scripts) for additional test candidates
- [ ] Design `delta` manifest parameter for incremental update-specific tests (once the incremental update pipeline's output format is known)
- [ ] Evaluate baseline storage in the content database (option e) after initial deployment experience
