import { DatasetTestBase } from './loadTests.mjs';
import { getVersionInfo } from '../environmentLib.mjs';
import {
  getEndpointAccessUnitNames,
  mayValidateDataset,
  TENANT_OWNER,
} from '../securityLib.mjs';
import { AccessDeniedError, BadRequestError } from '../errorClasses.mjs';
import { User } from '../User.mjs';
import { split, getArrayDiff } from '../../utils/utils.mjs';

const SEVERITY_CRITICAL = 'critical';

const CRITICAL_WEIGHT = 2;
const DEFAULT_WEIGHT = 1;
const DEFAULT_OVERALL_PASS_THRESHOLD = 0.8;

function validateDataset({
  unitNames = null,
  categories = null,
  testConfig = null,
  baseline = null,
  baselineId = null,
  format = 'json',
}) {
  // Access check.
  if (!mayValidateDataset()) {
    const user = new User();
    throw new AccessDeniedError(
      `User '${user.getUsername()}' is not authorized to validate the dataset`,
    );
  }

  const start = new Date();

  // Resolve unit names: default to the tenant's name only.
  // When specified, only execute for the stated unit names.
  const validUnitNames = [TENANT_OWNER, ...getEndpointAccessUnitNames()];
  let resolvedUnitNames;
  if (unitNames != null) {
    const requested = split(unitNames);
    const invalid = requested.filter((name) => !validUnitNames.includes(name));
    if (invalid.length > 0) {
      throw new BadRequestError(
        `Invalid unit name(s): ${invalid.join(', ')}. Valid values: ${validUnitNames.join(', ')}.`,
      );
    }
    resolvedUnitNames = requested;
  } else {
    resolvedUnitNames = [TENANT_OWNER];
  }

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
      config: config,
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

  const overallPassThreshold =
    resolvedTestConfig.overallPassThreshold != null
      ? resolvedTestConfig.overallPassThreshold
      : DEFAULT_OVERALL_PASS_THRESHOLD;

  // Baseline warnings: surface mismatches between the baseline and the
  // current run so consumers are aware of comparison gaps.
  const warnings = [];
  if (baselineProvided) {
    const runTestIds = testsToRun.map((test) => test.getId());
    const baselineTestIds = Object.keys(baselineByTestId);

    const baselineOnly = getArrayDiff(baselineTestIds, runTestIds).sort();
    if (baselineOnly.length > 0) {
      warnings.push(
        `Baseline contains test(s) not in the current run: ${baselineOnly.join(', ')}.`,
      );
    }

    const currentOnly = getArrayDiff(runTestIds, baselineTestIds).sort();
    if (currentOnly.length > 0) {
      warnings.push(
        `Current run contains test(s) not in the baseline: ${currentOnly.join(', ')}.`,
      );
    }

    const baselineUnitNames =
      baseline.metadata &&
      baseline.metadata.parameters &&
      Array.isArray(baseline.metadata.parameters.unitNames)
        ? baseline.metadata.parameters.unitNames
        : [];
    const unitDiff = getArrayDiff(resolvedUnitNames, baselineUnitNames).sort();
    const baselineDiff = getArrayDiff(
      baselineUnitNames,
      resolvedUnitNames,
    ).sort();
    if (unitDiff.length > 0 || baselineDiff.length > 0) {
      const parts = [];
      if (unitDiff.length > 0) {
        parts.push(
          `current run has unit(s) not in baseline: ${unitDiff.join(', ')}`,
        );
      }
      if (baselineDiff.length > 0) {
        parts.push(
          `baseline has unit(s) not in current run: ${baselineDiff.join(', ')}`,
        );
      }
      warnings.push(`Unit name mismatch: ${parts.join('; ')}.`);
    }
  }

  const end = new Date();
  const versionInfo = getVersionInfo();

  const response = {
    metadata: {
      id: `${versionInfo.databaseName}-${end.toISOString()}`,
      timestamp: end.toISOString(),
      durationMs: end - start,
      codeVersion: versionInfo.codeVersion,
      parameters: {
        unitNames: resolvedUnitNames,
        categories: resolvedCategories,
        testConfig:
          Object.keys(resolvedTestConfig).length > 0
            ? resolvedTestConfig
            : null,
        baselineProvided: baselineProvided,
        baselineTestsMatched: testsToRun.filter((test) =>
          baselineByTestId.hasOwnProperty(test.getId()),
        ).length,
        baselineId: baselineId,
        format: format,
      },
    },
    summary: {
      overallPass: criticalPass && aggregateScore >= overallPassThreshold,
      overallPassThreshold: overallPassThreshold,
      aggregateScore: aggregateScore,
      criticalPass: criticalPass,
      testsRun: testsRun,
      testsPassed: testsPassed,
      testsWarning: testsWarning,
      testsFailed: testsFailed,
    },
    tests: testResults,
  };

  if (warnings.length > 0) {
    response.warnings = warnings;
  }

  return response;
}

export { validateDataset };
