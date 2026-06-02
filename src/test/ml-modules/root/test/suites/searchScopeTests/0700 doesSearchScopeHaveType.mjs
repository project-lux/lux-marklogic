/**
 * Test suite for doesSearchScopeHaveType function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { doesSearchScopeHaveType } from '/lib/searchScope.mjs';

const LIB = '0700-doesSearchScopeHaveType.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Returns true when scope has the specified type',
    input: {
      scopeName: 'agent',
      type: 'Person',
    },
    expected: {
      error: false,
      value: true,
    },
  },
  {
    name: 'Returns false when scope does not have the specified type',
    input: {
      scopeName: 'agent',
      type: 'InvalidType',
    },
    expected: {
      error: false,
      value: false,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return doesSearchScopeHaveType(
      scenario.input.scopeName,
      scenario.input.type,
    );
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
