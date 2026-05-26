import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { validateDataset } from '/lib/datasetValidation/datasetValidationLib.mjs';

const LIB = '0400 validateDataset-scoring.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// On the unit test database there is no real dataset, so tests that query
// data will either error (score 0) or report empty results. This is useful
// for exercising the framework's error-handling and scoring paths.

const scenarios = [
  {
    name: 'All critical tests failing sets criticalPass to false',
    input: {},
    expected: {
      error: false,
    },
  },
  {
    name: 'overallPassThreshold override is reflected in summary',
    input: {
      testConfig: { overallPassThreshold: 0.1 },
    },
    expected: {
      error: false,
      expectedOverallPassThreshold: 0.1,
    },
  },
  {
    name: 'Skipping all tests yields passing summary',
    input: {
      categories: 'nonExistentCategory',
    },
    expected: {
      error: false,
      expectedCriticalPass: true,
      expectedAggregateScore: 1.0,
      expectedOverallPass: true,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return validateDataset({
      categories: scenario.input.categories || null,
      testConfig: scenario.input.testConfig || null,
    });
  };
  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const response = scenarioResults.actualValue;
    const summary = response.summary;

    // Verify summary structure always has required fields.
    assertions.push(
      testHelperProxy.assertTrue(
        summary.testsRun !== undefined,
        `Scenario '${scenario.name}': summary.testsRun should exist.`,
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        summary.aggregateScore !== undefined,
        `Scenario '${scenario.name}': summary.aggregateScore should exist.`,
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        summary.criticalPass !== undefined,
        `Scenario '${scenario.name}': summary.criticalPass should exist.`,
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        summary.overallPass !== undefined,
        `Scenario '${scenario.name}': summary.overallPass should exist.`,
      ),
    );

    // When all tests run on a dataset-less database, critical tests will fail.
    if (scenario.name.includes('All critical tests failing')) {
      assertions.push(
        testHelperProxy.assertTrue(
          summary.testsFailed > 0,
          `Scenario '${scenario.name}': expected at least one failed test.`,
        ),
      );
      assertions.push(
        testHelperProxy.assertEqual(
          false,
          summary.criticalPass,
          `Scenario '${scenario.name}': criticalPass should be false.`,
        ),
      );
      assertions.push(
        testHelperProxy.assertEqual(
          false,
          summary.overallPass,
          `Scenario '${scenario.name}': overallPass should be false when criticalPass is false.`,
        ),
      );
    }

    if (scenario.expected.expectedOverallPassThreshold !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.expectedOverallPassThreshold,
          summary.overallPassThreshold,
          `Scenario '${scenario.name}': overallPassThreshold not reflected.`,
        ),
      );
    }

    if (scenario.expected.expectedCriticalPass !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.expectedCriticalPass,
          summary.criticalPass,
          `Scenario '${scenario.name}': unexpected criticalPass.`,
        ),
      );
    }

    if (scenario.expected.expectedAggregateScore !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.expectedAggregateScore,
          summary.aggregateScore,
          `Scenario '${scenario.name}': unexpected aggregateScore.`,
        ),
      );
    }

    if (scenario.expected.expectedOverallPass !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.expectedOverallPass,
          summary.overallPass,
          `Scenario '${scenario.name}': unexpected overallPass.`,
        ),
      );
    }
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);
assertions;
export default assertions;
