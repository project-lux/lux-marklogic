import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { scaleOut } from '/lib/scalingLib.mjs';
import { USERNAME_FOR_BONNIE } from '/test/unitTestConstants.mjs';

const LIB = '0100 scaleOut.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Unauthorized user attempting to scale out the environment',
    input: {
      username: USERNAME_FOR_BONNIE,
      dynamicHost: 'x.x.x.x',
    },
    expected: {
      error: true,
      stackToInclude: 'is not authorized to scale the environment',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return scaleOut(scenario.input.dynamicHost);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun, {
    userId: xdmp.user(scenario.input.username),
  });

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value,
        scenarioResults.actualValue,
        `Scenario '${scenario.name}' did not return the expected value.`,
      ),
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
