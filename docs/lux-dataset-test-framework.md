## **Dataset Test Framework**

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
  - [Initial Tests](#initial-tests)
    - [`predicate-coverage`](#predicate-coverage)
    - [`predicate-alignment`](#predicate-alignment)
  - [Test Categories](#test-categories)
  - [Gap Analysis and Future Tests](#gap-analysis-and-future-tests)
- [Incremental Update Support](#incremental-update-support)
- [Performance Considerations](#performance-considerations)
- [TODOs](#todos)

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
| `format` | string | No | Response format. Default: `json`. Only `json` is initially supported; `html` is a future option. |
| `categories` | string | No | Comma-delimited list of test categories to run. Default: all. See [Test Categories](#test-categories). |
| `unitNames` | string | No | Comma-delimited list of unit names to validate. Default: all unit names returned by `getEndpointAccessUnitNames()`. |
| `baseline` | jsonDocument | No | The response body from a prior run.  When provided, tests that support comparison compute deltas and factor them into scores. |
| `baselineId` | string | No | Freeform label identifying the baseline artifact (e.g., `prod-2026-05-20`). Captured in `metadata` for traceability. |
| `testConfig` | jsonDocument | No | Per-test overrides. Keys are test IDs; values are objects with optional `threshold` (number) and `skip` (boolean) properties. |

The `.api` definition:

```json
{
  "functionName": "validateDataset",
  "params": [
    { "name": "format", "datatype": "string", "nullable": true },
    { "name": "categories", "datatype": "string", "nullable": true },
    { "name": "unitNames", "datatype": "string", "nullable": true },
    { "name": "baseline", "datatype": "jsonDocument", "nullable": true },
    { "name": "baselineId", "datatype": "string", "nullable": true },
    { "name": "testConfig", "datatype": "jsonDocument", "nullable": true }
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
      "format": "json",
      "categories": ["quantitative", "relational"],
      "unitNames": ["ypm", "yuag"],
      "baselineId": "prod-2026-05-20",
      "testConfig": {}
    }
  },
  "summary": {
    "overallPass": true,
    "aggregateScore": 0.94,
    "criticalPass": true,
    "testsRun": 4,
    "testsPassed": 3,
    "testsWarning": 1,
    "testsFailed": 0
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
      "result": {}
    }
  ]
}
```

**`metadata.id`**: Generated from the environment name and timestamp.  Identifies the artifact sufficiently for manual lookup in source control.

**`metadata.parameters`**: All parameter values (except the full `baseline` body), including `baselineId`.  These make the response self-documenting: anyone reviewing the artifact knows exactly what was requested.

**`tests[]`**: Each entry conforms to the [Test Interface](#test-interface).

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
│       └── predicateAlignment.mjs       # comparePredicates logic
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
  getSeverity()        { return 'critical'; }
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
  getSeverity()         { throw new NotImplementedError(...); }
  getDefaultThreshold() { throw new NotImplementedError(...); }

  // Execution
  run(context)          { throw new NotImplementedError(...); }
}
```

**`run(context)`** must return:

```javascript
{
  score: 0.95,              // 0.0–1.0
  pass: true,               // score >= context.threshold
  message: '...',           // Human-readable summary
  result: { /* ... */ },    // Test-specific detail (preserved for future baselines)
}
```

The `result` object is test-specific and opaque to the framework.  It is included in the response so that this response can later serve as a baseline for a subsequent run.

## Test Context

The framework constructs a context object and passes it to each test's `run()`:

```javascript
{
  threshold: 0.90,            // Effective threshold (consumer override or default)
  baseline: { /* ... */ },    // Previous result for this test (null if no baseline)
  unitNames: ['ypm', 'yuag'], // Unit names to validate
}
```

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

## Initial Tests

### `predicate-coverage`

**Ported from**: [checkPredicates.js](/scripts/checkPredicates.js)

**Category**: `relational` | **Severity**: `critical`

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

## Test Categories

| Category | What it validates | Applicable to |
|----------|-------------------|---------------|
| `structural` | Index existence, field config alignment, TDE definitions | Full + incremental |
| `quantitative` | Document counts, estimate ranges, scope-level totals | Full + incremental |
| `relational` | Predicate coverage, predicate alignment, triple connectivity | Full + incremental |
| `permissions` | Document visibility by role/unit | Full + incremental |
| `delta` | Expected vs. actual change counts, no unintended deletions | Incremental only |

The `categories` parameter accepts a comma-delimited list.  When omitted, all categories are run.

## Gap Analysis and Future Tests

The following are tracked for future implementation.  Priority and feasibility will depend on execution time and value.  Items marked with execution time concerns may need sampling strategies or may be better suited for batch/scheduled execution.

| Test ID | Category | Description | Execution Time Concern |
|---------|----------|-------------|----------------------|
| `scope-doc-counts` | quantitative | Document count estimates per search scope, with baseline deltas | Low |
| `range-index-population` | structural | Flag empty range field indexes (from [getRangeIndexValueCounts.js](/scripts/getRangeIndexValueCounts.js)) | High (~2 min) |
| `index-config-alignment` | structural | Cross-reference configured vs. referenced fields/indexes (from [indexComparisonChecks.js](/scripts/generateIndexConf/indexComparisonChecks.js)) | Low |
| `record-types-by-predicate` | relational | Map predicates to record types (from [getRecordTypesByPredicates.js](/scripts/getRecordTypesByPredicates.js)) | Medium |
| `geospatial-index-population` | structural | Verify geospatial path indexes have values | Low–Medium |
| `vector-tde-population` | structural | Verify the vector TDE ([vectors.json](/src/main/ml-schemas/tde/vectors.json)) has rows | Low–Medium |
| `auto-complete-coverage` | structural | Verify auto-complete indexes have values | Medium |
| `facet-value-coverage` | quantitative | Verify facets return expected value distributions | Medium |
| `document-structure` | structural | Spot-check documents per record type for expected properties | Medium |
| `triple-connectivity` | relational | Detect orphan subjects or broken inverse relationships | High |
| `multi-user-visibility` | permissions | Automated cross-unit document visibility checks | Medium |
| `duplicate-detection` | quantitative | Check for duplicate URIs or near-duplicate documents | High |
| `query-performance` | quantitative | Representative queries execute within expected time bounds | Medium |
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
   - `categories`: `"quantitative,relational,delta"` (or all).
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

- [x] Register endpoint in [endpointsConfig.mjs](/src/main/ml-modules/root/config/endpointsConfig.mjs) (`allowInReadOnlyMode: true`, `features: { myCollections: false }`)
- [x] Define an execute privilege for this endpoint and include an assert to require the requesting user have it
- [x] Document endpoint in [lux-backend-api-usage.md](/docs/lux-backend-api-usage.md)
- [ ] Review all scripts in [/scripts](/scripts) for additional test candidates
- [ ] Design `delta` manifest parameter for incremental update-specific tests (once the incremental update pipeline's output format is known)
- [ ] Evaluate baseline storage in the content database (option e) after initial deployment experience
