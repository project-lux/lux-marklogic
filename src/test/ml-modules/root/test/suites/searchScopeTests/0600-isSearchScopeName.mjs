/**
 * Test suite for isSearchScopeName function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { isSearchScopeName } from '/lib/searchScope.mjs';

const LIB = '0600-isSearchScopeName.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Returns true for valid scope name',
    input: {
      scopeName: 'agent',
    },
    expected: {
      error: false,
      value: true,
    },
  },
  {
    name: 'Returns false for invalid scope name',
    input: {
      scopeName: 'invalid',
    },
    expected: {
      error: false,
      value: false,
    },
  },
  {
    name: 'Handles case variation correctly',
    input: {
      scopeName: 'AGENT',
    },
    expected: {
      error: false,
      value: true,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return isSearchScopeName(scenario.input.scopeName);
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
