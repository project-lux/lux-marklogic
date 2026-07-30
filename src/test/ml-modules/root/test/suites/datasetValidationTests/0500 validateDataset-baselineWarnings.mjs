import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { validateDataset } from '/lib/datasetValidation/datasetValidationLib.mjs';

const LIB = '0500 validateDataset-baselineWarnings.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'No baseline produces no warnings',
    input: {
      baseline: null,
    },
    expected: {
      error: false,
      hasWarnings: false,
    },
  },
  {
    name: 'Baseline with unknown test ID produces warning',
    input: {
      baseline: {
        tests: [
          {
            id: 'nonexistent-test',
            result: { some: 'data' },
          },
        ],
      },
    },
    expected: {
      error: false,
      hasWarnings: true,
      warningToInclude:
        'Baseline contains test(s) not in the current run: nonexistent-test',
    },
  },
  {
    name: 'Baseline missing a current test produces warning',
    input: {
      baseline: {
        tests: [],
      },
    },
    expected: {
      error: false,
      hasWarnings: true,
      warningToInclude: 'Current run contains test(s) not in the baseline',
    },
  },
  {
    name: 'Baseline with matching unit names produces no unit warning',
    input: {
      unitNames: 'lux',
      baseline: {
        metadata: {
          parameters: {
            unitNames: ['lux'],
          },
        },
        tests: [],
      },
    },
    expected: {
      error: false,
      noUnitWarning: true,
    },
  },
  {
    name: 'Null unitNames with different baseline units does not warn',
    input: {
      unitNames: null,
      baseline: {
        metadata: {
          parameters: {
            unitNames: ['lux', 'ypm'],
          },
        },
        tests: [],
      },
    },
    expected: {
      error: false,
      noUnitWarning: true,
    },
  },
  {
    name: 'Baseline metadata parameters matched count is correct',
    input: {
      baseline: {
        tests: [
          { id: 'predicate-coverage', result: {} },
          { id: 'nonexistent-test', result: {} },
        ],
      },
    },
    expected: {
      error: false,
      expectedBaselineTestsMatched: 1,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return validateDataset({
      unitNames:
        scenario.input.unitNames !== undefined
          ? scenario.input.unitNames
          : null,
      baseline: scenario.input.baseline,
    });
  };
  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const response = scenarioResults.actualValue;
    const warnings = response.warnings || [];

    if (scenario.expected.hasWarnings === false) {
      assertions.push(
        testHelperProxy.assertEqual(
          0,
          warnings.length,
          `Scenario '${scenario.name}': expected no warnings.`,
        ),
      );
    }

    if (scenario.expected.hasWarnings === true) {
      assertions.push(
        testHelperProxy.assertTrue(
          warnings.length > 0,
          `Scenario '${scenario.name}': expected at least one warning.`,
        ),
      );
    }

    if (scenario.expected.warningToInclude) {
      const found = warnings.some((w) =>
        w.includes(scenario.expected.warningToInclude),
      );
      assertions.push(
        testHelperProxy.assertTrue(
          found,
          `Scenario '${scenario.name}': expected a warning containing '${scenario.expected.warningToInclude}'.`,
        ),
      );
    }

    if (scenario.expected.noUnitWarning) {
      const hasUnitWarning = warnings.some((w) =>
        w.includes('Unit name mismatch'),
      );
      assertions.push(
        testHelperProxy.assertTrue(
          !hasUnitWarning,
          `Scenario '${scenario.name}': should not have a unit name mismatch warning.`,
        ),
      );
    }

    if (scenario.expected.expectedBaselineTestsMatched !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.expectedBaselineTestsMatched,
          response.metadata.parameters.baselineTestsMatched,
          `Scenario '${scenario.name}': unexpected baselineTestsMatched.`,
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
