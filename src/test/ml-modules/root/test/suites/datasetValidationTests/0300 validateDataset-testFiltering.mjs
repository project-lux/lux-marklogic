import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { validateDataset } from '/lib/datasetValidation/datasetValidationLib.mjs';

const LIB = '0300 validateDataset-testFiltering.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'No filters runs all registered tests',
    input: {},
    expected: {
      error: false,
    },
  },
  {
    name: 'Category filter limits to relational tests only',
    input: {
      categories: 'relational',
    },
    expected: {
      error: false,
      expectedCategory: 'relational',
    },
  },
  {
    name: 'Category filter limits to indexing tests only',
    input: {
      categories: 'indexing',
    },
    expected: {
      error: false,
      expectedCategory: 'indexing',
    },
  },
  {
    name: 'Non-existent category returns zero tests',
    input: {
      categories: 'nonExistentCategory',
    },
    expected: {
      error: false,
      expectedTestsRun: 0,
    },
  },
  {
    name: 'Skip a specific test via testConfig',
    input: {
      testConfig: { 'predicate-coverage': { skip: true } },
    },
    expected: {
      error: false,
      skippedTestId: 'predicate-coverage',
    },
  },
  {
    name: 'Threshold override is reflected in results',
    input: {
      categories: 'relational',
      testConfig: { 'predicate-coverage': { threshold: 0.5 } },
    },
    expected: {
      error: false,
      testId: 'predicate-coverage',
      expectedThreshold: 0.5,
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

    if (scenario.expected.expectedCategory) {
      const allMatchCategory = response.tests.every(
        (t) => t.category === scenario.expected.expectedCategory,
      );
      assertions.push(
        testHelperProxy.assertTrue(
          allMatchCategory,
          `Scenario '${scenario.name}': all tests should have category '${scenario.expected.expectedCategory}'.`,
        ),
      );
      assertions.push(
        testHelperProxy.assertTrue(
          response.tests.length > 0,
          `Scenario '${scenario.name}': expected at least one test in category '${scenario.expected.expectedCategory}'.`,
        ),
      );
    }

    if (scenario.expected.expectedTestsRun !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.expectedTestsRun,
          response.summary.testsRun,
          `Scenario '${scenario.name}': unexpected testsRun count.`,
        ),
      );
    }

    if (scenario.expected.skippedTestId) {
      const skippedIds = response.tests.map((t) => t.id);
      assertions.push(
        testHelperProxy.assertTrue(
          !skippedIds.includes(scenario.expected.skippedTestId),
          `Scenario '${scenario.name}': test '${scenario.expected.skippedTestId}' should have been skipped.`,
        ),
      );
    }

    if (
      scenario.expected.testId &&
      scenario.expected.expectedThreshold !== undefined
    ) {
      const testEntry = response.tests.find(
        (t) => t.id === scenario.expected.testId,
      );
      assertions.push(
        testHelperProxy.assertNotEqual(
          null,
          testEntry,
          `Scenario '${scenario.name}': test '${scenario.expected.testId}' not found in results.`,
        ),
      );
      if (testEntry) {
        assertions.push(
          testHelperProxy.assertEqual(
            scenario.expected.expectedThreshold,
            testEntry.threshold,
            `Scenario '${scenario.name}': threshold override not reflected.`,
          ),
        );
      }
    }
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);
assertions;
export default assertions;
