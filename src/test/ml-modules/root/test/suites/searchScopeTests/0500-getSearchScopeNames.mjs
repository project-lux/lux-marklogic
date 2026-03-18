/**
 * Test suite for getSearchScopeNames function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getSearchScopeNames } from '/lib/searchScope.mjs';
import { areArraysEqual, arrayToString } from '/utils/utils.mjs';

const LIB = '0500-getSearchScopeNames.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const searchScopesLessMulti = [
  'agent',
  'concept',
  'event',
  'item',
  'place',
  'reference',
  'set',
  'work',
];
const allSearchScopes = searchScopesLessMulti.concat('multi');

const scenarios = [
  {
    name: 'Returns all scope names by default',
    input: {
      statsOnly: undefined,
    },
    expected: {
      error: false,
      value: allSearchScopes,
    },
  },
  {
    name: 'Returns stats scopes when statsOnly is false',
    input: {
      statsOnly: false,
    },
    expected: {
      error: false,
      value: allSearchScopes,
    },
  },
  {
    name: 'Returns stats scopes when statsOnly is true',
    input: {
      statsOnly: true,
    },
    expected: {
      error: false,
      value: searchScopesLessMulti,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return getSearchScopeNames(scenario.input.statsOnly);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    if (scenario.expected.value !== undefined) {
      assertions.push(
        testHelperProxy.assertTrue(
          areArraysEqual(scenario.expected.value, scenarioResults.actualValue),
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
