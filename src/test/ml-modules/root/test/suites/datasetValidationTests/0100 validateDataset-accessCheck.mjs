import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import {
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_DEPLOYER,
} from '/test/unitTestConstants.mjs';
import { validateDataset } from '/lib/datasetValidation/datasetValidationLib.mjs';

const LIB = '0100 validateDataset-accessCheck.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Unauthorized user is denied access',
    input: {
      username: USERNAME_FOR_BONNIE,
    },
    expected: {
      error: true,
      stackToInclude: 'is not authorized to validate the dataset',
    },
  },
  {
    name: 'Unit tester (deployer role) is allowed access',
    input: {
      username: USERNAME_FOR_DEPLOYER,
    },
    expected: {
      error: false,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return validateDataset({});
  };
  const scenarioResults = executeScenario(scenario, zeroArityFun, {
    userId: xdmp.user(scenario.input.username),
  });

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertNotEqual(
        null,
        scenarioResults.actualValue,
        `Scenario '${scenario.name}': expected a non-null response.`,
      ),
    );
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);
assertions;
export default assertions;
