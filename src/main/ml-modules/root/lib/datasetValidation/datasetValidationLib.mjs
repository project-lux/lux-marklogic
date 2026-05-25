import { DatasetTestBase } from './loadTests.mjs';
import { getVersionInfo } from '../environmentLib.mjs';
import { getEndpointAccessUnitNames } from '../securityLib.mjs';
import { split } from '../../utils/utils.mjs';

const SEVERITY_CRITICAL = 'critical';

const CRITICAL_WEIGHT = 2;
const DEFAULT_WEIGHT = 1;

function runDatasetValidation({
  format = 'json',
  categories = null,
  unitNames = null,
  baseline = null,
  baselineId = null,
  testConfig = null,
}) {
  const start = new Date();

  // Resolve unit names: default to all known units.
  const resolvedUnitNames =
    unitNames != null ? split(unitNames) : getEndpointAccessUnitNames();

  // Resolve categories filter.
  const resolvedCategories = categories != null ? split(categories) : null;

  // Resolve testConfig.
  const resolvedTestConfig = testConfig || {};

  // Parse baseline test results into a map keyed by test ID.
  const baselineByTestId = {};
  const baselineProvided = baseline != null;
  if (baseline && Array.isArray(baseline.tests)) {
    baseline.tests.forEach((testEntry) => {
      if (testEntry && testEntry.id && testEntry.result) {
        baselineByTestId[testEntry.id] = testEntry.result;
      }
    });
  }

  // Collect all registered tests, filter by category, apply skip.
  const allTests = DatasetTestBase.getAll();
  const testsToRun = allTests.filter((test) => {
    const id = test.getId();
    const config = resolvedTestConfig[id];

    // Skip if explicitly configured to skip.
    if (config && config.skip === true) {
      return false;
    }

    // Filter by category if specified.
    if (resolvedCategories != null) {
      return resolvedCategories.includes(test.getCategory());
    }

    return true;
  });

  // Run each test, capturing results.
  const testResults = testsToRun.map((test) => {
    const id = test.getId();
    const config = resolvedTestConfig[id] || {};
    const threshold =
      config.threshold != null ? config.threshold : test.getDefaultThreshold();

    const context = {
      threshold: threshold,
      baseline: baselineByTestId[id] || null,
      unitNames: resolvedUnitNames,
    };

    const testStart = new Date();
    let result;
    try {
      result = test.run(context);
    } catch (e) {
      result = {
        score: 0,
        pass: false,
        message: `Test threw an error: ${e.message}`,
        result: { error: e.message, stack: e.stack },
      };
    }
    const testEnd = new Date();

    return {
      id: id,
      name: test.getName(),
      category: test.getCategory(),
      severity: test.getSeverity(),
      score: result.score,
      pass: result.pass,
      threshold: threshold,
      durationMs: testEnd - testStart,
      message: result.message,
      result: result.result,
    };
  });

  // Compute summary.
  const testsRun = testResults.length;
  let testsPassed = 0;
  let testsWarning = 0;
  let testsFailed = 0;
  let criticalPass = true;
  let totalWeightedScore = 0;
  let totalWeight = 0;

  testResults.forEach((entry) => {
    const weight =
      entry.severity === SEVERITY_CRITICAL ? CRITICAL_WEIGHT : DEFAULT_WEIGHT;
    totalWeightedScore += entry.score * weight;
    totalWeight += weight;

    if (entry.pass) {
      testsPassed++;
    } else if (entry.severity === SEVERITY_CRITICAL) {
      testsFailed++;
      criticalPass = false;
    } else {
      testsWarning++;
    }
  });

  const aggregateScore =
    totalWeight > 0
      ? parseFloat((totalWeightedScore / totalWeight).toFixed(4))
      : 1.0;

  const end = new Date();
  const versionInfo = getVersionInfo();

  return {
    metadata: {
      id: `${versionInfo.databaseName}-${end.toISOString()}`,
      timestamp: end.toISOString(),
      durationMs: end - start,
      codeVersion: versionInfo.codeVersion,
      parameters: {
        format: format,
        categories: resolvedCategories,
        unitNames: resolvedUnitNames,
        baselineId: baselineId,
        baselineProvided: baselineProvided,
        baselineTestsMatched: Object.keys(baselineByTestId).length,
        testConfig:
          Object.keys(resolvedTestConfig).length > 0
            ? resolvedTestConfig
            : null,
      },
    },
    summary: {
      overallPass: criticalPass && aggregateScore >= 0.8,
      aggregateScore: aggregateScore,
      criticalPass: criticalPass,
      testsRun: testsRun,
      testsPassed: testsPassed,
      testsWarning: testsWarning,
      testsFailed: testsFailed,
    },
    tests: testResults,
  };
}

export { runDatasetValidation };
