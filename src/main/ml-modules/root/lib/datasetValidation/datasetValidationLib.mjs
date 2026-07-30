import { DatasetTestBase } from './loadTests.mjs';
import { getVersionInfo } from '../environmentLib.mjs';
import { VALIDATE_DATASET_TIMEOUT } from '../appConstants.mjs';
import {
  getEndpointAccessUnitNames,
  mayValidateDataset,
  TENANT_OWNER,
} from '../securityLib.mjs';
import { AccessDeniedError, BadRequestError } from '../errorClasses.mjs';
import { User } from '../User.mjs';
import { split, getArrayDiff } from '../../utils/utils.mjs';

const SEVERITY_CRITICAL = 'critical';
const SEVERITY_WARNING = 'warning';
const SEVERITY_INFORMATIONAL = 'informational';
const VALID_SEVERITIES = [
  SEVERITY_INFORMATIONAL,
  SEVERITY_WARNING,
  SEVERITY_CRITICAL,
];

const CRITICAL_WEIGHT = 2;
const DEFAULT_WEIGHT = 1;
const DEFAULT_OVERALL_PASS_THRESHOLD = 0.8;

function getSeverityWeight(severity) {
  if (severity === SEVERITY_CRITICAL) {
    return CRITICAL_WEIGHT;
  }
  if (severity === SEVERITY_INFORMATIONAL) {
    return 0;
  }
  return DEFAULT_WEIGHT;
}

function buildSummaryMessage(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return 'No findings.';
  }
  if (findings.length === 1) {
    return findings[0].message;
  }

  const criticalCount = findings.filter(
    (item) => item.severity === SEVERITY_CRITICAL,
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === SEVERITY_WARNING,
  ).length;
  const informationalCount = findings.filter(
    (item) => item.severity === SEVERITY_INFORMATIONAL,
  ).length;

  return `${findings.length} finding(s): ${criticalCount} critical, ${warningCount} warning, ${informationalCount} informational.`;
}

function createTestContext({ threshold, baseline, unitNames, config }) {
  const findings = [];
  let score = null;
  let message = null;

  const validateMessage = (findingMessage) => {
    if (
      typeof findingMessage !== 'string' ||
      findingMessage.trim().length === 0
    ) {
      throw new Error('Finding message must be a non-empty string.');
    }
  };

  const addFinding = (severity, findingMessage) => {
    validateMessage(findingMessage);
    findings.push({ severity: severity, message: findingMessage.trim() });
  };

  const setScore = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error('Score must be a finite number.');
    }
    score = value;
  };

  return {
    threshold: threshold,
    baseline: baseline,
    unitNames: unitNames,
    config: config,

    addInformationalFinding(findingMessage) {
      addFinding(SEVERITY_INFORMATIONAL, findingMessage);
    },

    addWarningFinding(findingMessage) {
      addFinding(SEVERITY_WARNING, findingMessage);
    },

    addCriticalFinding(findingMessage) {
      addFinding(SEVERITY_CRITICAL, findingMessage);
    },

    getFindings() {
      return findings.slice();
    },

    hasAnyFindings() {
      return findings.length > 0;
    },

    hasCriticalFindings() {
      return findings.some((item) => item.severity === SEVERITY_CRITICAL);
    },

    hasWarningFindings() {
      return findings.some((item) => item.severity === SEVERITY_WARNING);
    },

    hasInformationalFindings() {
      return findings.some((item) => item.severity === SEVERITY_INFORMATIONAL);
    },

    setScore: setScore,

    setScoreFromFindings(policy = 'critical-only') {
      const hasCritical = findings.some(
        (item) => item.severity === SEVERITY_CRITICAL,
      );
      const hasWarning = findings.some(
        (item) => item.severity === SEVERITY_WARNING,
      );

      if (policy === 'critical-only') {
        setScore(hasCritical ? 0 : 1);
      } else if (policy === 'warning-or-critical') {
        setScore(hasCritical || hasWarning ? 0 : 1);
      } else if (policy === 'any-finding') {
        setScore(findings.length > 0 ? 0 : 1);
      } else {
        throw new Error(
          `Unknown score policy '${policy}'. Expected one of: critical-only, warning-or-critical, any-finding.`,
        );
      }
      return score;
    },

    getScore() {
      return score;
    },

    setMessage(summaryMessage) {
      validateMessage(summaryMessage);
      message = summaryMessage.trim();
    },

    getMessage() {
      return message != null ? message : buildSummaryMessage(findings);
    },
  };
}

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

  xdmp.setRequestTimeLimit(VALIDATE_DATASET_TIMEOUT);

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

    const context = createTestContext({
      threshold: threshold,
      baseline: baselineByTestId[id] || null,
      unitNames: resolvedUnitNames,
      config: config,
    });

    const testStart = new Date();
    let resultPayload = null;
    try {
      resultPayload = test.run(context);
    } catch (e) {
      context.addCriticalFinding(`Test threw an error: ${e.message}`);
      context.setScore(0);
      resultPayload = { error: e.message, stack: e.stack };
    }
    const testEnd = new Date();

    if (context.getScore() == null) {
      context.setScoreFromFindings('critical-only');
    }

    const findings = context.getFindings();
    let severity = test.getSeverity(findings);
    if (!VALID_SEVERITIES.includes(severity)) {
      throw new Error(
        `Test '${id}' returned invalid severity '${severity}'. Valid severities: ${VALID_SEVERITIES.join(', ')}.`,
      );
    }

    const score = context.getScore();
    const pass = score >= threshold;

    return {
      id: id,
      name: test.getName(),
      category: test.getCategory(),
      severity: severity,
      score: score,
      pass: pass,
      threshold: threshold,
      durationMs: testEnd - testStart,
      message: context.getMessage(),
      findings: findings,
      result: resultPayload,
    };
  });

  // Compute summary.
  const testsRun = testResults.length;
  let testsPassed = 0;
  let testsWarning = 0;
  let testsFailed = 0;
  const failedTestIds = [];
  let criticalPass = true;
  let totalWeightedScore = 0;
  let totalWeight = 0;

  testResults.forEach((entry) => {
    const weight = getSeverityWeight(entry.severity);
    totalWeightedScore += entry.score * weight;
    totalWeight += weight;

    if (entry.pass) {
      testsPassed++;
    } else if (entry.severity === SEVERITY_CRITICAL) {
      testsFailed++;
      failedTestIds.push(entry.id);
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

    // Only warn about unit differences when unitNames was explicitly provided.
    if (unitNames != null) {
      const baselineUnitNames = (
        baseline.metadata?.parameters?.unitNames || []
      ).filter((name) => name !== TENANT_OWNER);
      const currentUnits = resolvedUnitNames.filter(
        (name) => name !== TENANT_OWNER,
      );
      const addedUnits = getArrayDiff(currentUnits, baselineUnitNames).sort();
      const removedUnits = getArrayDiff(baselineUnitNames, currentUnits).sort();
      if (addedUnits.length > 0 || removedUnits.length > 0) {
        warnings.push(
          `Unit name mismatch:${addedUnits.length > 0 ? ` added: ${addedUnits.join(', ')}` : ''}${removedUnits.length > 0 ? ` removed: ${removedUnits.join(', ')}` : ''}.`,
        );
      }
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
      failedTestIds: failedTestIds,
    },
    tests: testResults,
  };

  if (warnings.length > 0) {
    response.warnings = warnings;
  }

  return response;
}

export { validateDataset };
