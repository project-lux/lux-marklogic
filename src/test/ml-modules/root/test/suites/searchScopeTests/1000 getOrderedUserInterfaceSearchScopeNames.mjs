/**
 * Test suite for getOrderedUserInterfaceSearchScopeNames function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getOrderedUserInterfaceSearchScopeNames } from '/lib/searchScope.mjs';
import { areArraysEqual, arrayToString } from '/utils/utils.mjs';

const LIB = '1000-getOrderedUserInterfaceSearchScopeNames.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Returns ordered UI scope names array',
    input: {},
    expected: {
      error: false,
      value: ['item', 'work', 'set', 'agent', 'place', 'concept', 'event'],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return getOrderedUserInterfaceSearchScopeNames();
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    if (scenario.expected.value !== undefined) {
      assertions.push(
        testHelperProxy.assertTrue(
          areArraysEqual(
            scenario.expected.value,
            scenarioResults.actualValue,
            scenario.input.maySort,
          ),
          `Scenario '${scenario.name}' returned ${arrayToString(scenarioResults.actualValue)} when ${arrayToString(scenario.expected.value)} was expected`,
        ),
      );
    }
  }

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
