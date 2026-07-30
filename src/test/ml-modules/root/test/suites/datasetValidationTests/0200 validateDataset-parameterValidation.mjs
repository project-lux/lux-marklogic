import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { validateDataset } from '/lib/datasetValidation/datasetValidationLib.mjs';

const LIB = '0200 validateDataset-parameterValidation.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Invalid unit name is rejected',
    input: {
      unitNames: 'nonExistentUnit',
    },
    expected: {
      error: true,
      stackToInclude: 'Invalid unit name(s): nonExistentUnit',
    },
  },
  {
    name: 'Mix of valid and invalid unit names is rejected',
    input: {
      unitNames: 'lux,bogus',
    },
    expected: {
      error: true,
      stackToInclude: 'Invalid unit name(s): bogus',
    },
  },
  {
    name: 'Null unitNames defaults to TENANT_OWNER only',
    input: {
      unitNames: null,
    },
    expected: {
      error: false,
      value: ['lux'],
    },
  },
  {
    name: 'Explicit lux unitName is accepted',
    input: {
      unitNames: 'lux',
    },
    expected: {
      error: false,
      value: ['lux'],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return validateDataset({ unitNames: scenario.input.unitNames });
  };
  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const response = scenarioResults.actualValue;
    const actualUnitNames = response.metadata.parameters.unitNames;
    assertions.push(
      testHelperProxy.assertEqual(
        JSON.stringify(scenario.expected.value),
        JSON.stringify(actualUnitNames),
        `Scenario '${scenario.name}': unexpected resolved unitNames.`,
      ),
    );
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);
assertions;
export default assertions;
