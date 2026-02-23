import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { mayScaleEnvironment } from '/lib/securityLib.mjs';
import {
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_DEPLOYER,
} from '/test/unitTestConstants.mjs';

const LIB = '0500 mayScaleEnvironment.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'User without required executive privilege',
    input: {
      username: USERNAME_FOR_BONNIE,
    },
    expected: {
      value: false,
    },
  },
  {
    name: 'User with required executive privilege',
    input: {
      username: USERNAME_FOR_DEPLOYER,
    },
    expected: {
      value: true,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return mayScaleEnvironment();
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
