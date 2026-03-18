/**
 * Test suite for getCorrectlyCasedType function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getCorrectlyCasedType } from '/lib/searchScope.mjs';

const LIB = '0800-getCorrectlyCasedType.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Returns correctly cased type for lowercase input',
    input: {
      givenType: 'person',
    },
    expected: {
      error: false,
      value: 'Person',
    },
  },
  {
    name: 'Returns unchanged type for unknown type',
    input: {
      givenType: 'unknowntype',
    },
    expected: {
      error: false,
      value: 'unknowntype',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return getCorrectlyCasedType(scenario.input.givenType);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    if (scenario.expected.value !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.value,
          scenarioResults.actualValue,
          `Scenario '${scenario.name}' did not return the expected value.`,
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
