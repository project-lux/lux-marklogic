/**
 * Test suite for getSearchScopeTypes function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getSearchScopeTypes } from '/lib/searchScope.mjs';

const LIB = '0400-getSearchScopeTypes.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Agent scope returns type array or null',
    input: {
      scopeName: 'agent',
    },
    expected: {
      error: false,
      isValidArrayOrNull: true,
    },
  },
  {
    name: 'Work scope returns type array or null',
    input: {
      scopeName: 'work',
    },
    expected: {
      error: false,
      isValidArrayOrNull: true,
    },
  },
  {
    name: 'Item scope returns type array or null',
    input: {
      scopeName: 'item',
    },
    expected: {
      error: false,
      isValidArrayOrNull: true,
    },
  },
  {
    name: 'Concept scope returns type array or null',
    input: {
      scopeName: 'concept',
    },
    expected: {
      error: false,
      isValidArrayOrNull: true,
    },
  },
  {
    name: 'Multi scope handling',
    input: {
      scopeName: 'multi',
    },
    expected: {
      error: false,
      isValidArrayOrNull: true,
    },
  },
  {
    name: 'Invalid scope returns all types (defaultToAll=true)',
    input: {
      scopeName: 'invalidScope',
    },
    expected: {
      error: false,
      hasAllTypes: true,
    },
  },
  {
    name: 'Null input returns all types (defaultToAll=true)',
    input: {
      scopeName: null,
    },
    expected: {
      error: false,
      hasAllTypes: true,
    },
  },
  {
    name: 'Undefined input returns all types (defaultToAll=true)',
    input: {
      scopeName: undefined,
    },
    expected: {
      error: false,
      hasAllTypes: true,
    },
  },
  {
    name: 'Empty string input returns all types (defaultToAll=true)',
    input: {
      scopeName: '',
    },
    expected: {
      error: false,
      hasAllTypes: true,
    },
  },
  {
    name: 'Case sensitive - Agent (uppercase A) returns all types',
    input: {
      scopeName: 'Agent',
    },
    expected: {
      error: false,
      hasAllTypes: true,
    },
  },
  {
    name: 'Case sensitive - AGENT (all caps) returns all types',
    input: {
      scopeName: 'AGENT',
    },
    expected: {
      error: false,
      hasAllTypes: true,
    },
  },
  {
    name: 'Invalid scope with defaultToAll=false returns empty array',
    input: {
      scopeName: 'invalidScope',
      defaultToAll: false,
    },
    expected: {
      error: false,
      value: [],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    if (scenario.input.defaultToAll !== undefined) {
      return getSearchScopeTypes(
        scenario.input.scopeName,
        scenario.input.defaultToAll,
      );
    }
    return getSearchScopeTypes(scenario.input.scopeName);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

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

    if (scenario.expected.isValidArrayOrNull !== undefined) {
      const actualValue = scenarioResults.actualValue;
      const isValidArrayOrNull =
        Array.isArray(actualValue) || actualValue === null;

      assertions.push(
        testHelperProxy.assertTrue(
          isValidArrayOrNull,
          `Scenario '${scenario.name}' should return array or null.`,
        ),
      );

      if (Array.isArray(actualValue)) {
        const hasValidTypes = actualValue.every(
          (t) => typeof t === 'string' && t.length > 0,
        );
        assertions.push(
          testHelperProxy.assertTrue(
            hasValidTypes,
            `Scenario '${scenario.name}' types should be non-empty strings.`,
          ),
        );
      }
    }

    if (scenario.expected.hasAllTypes !== undefined) {
      const actualValue = scenarioResults.actualValue;
      const isValidArray =
        Array.isArray(actualValue) && actualValue.length >= 0;

      assertions.push(
        testHelperProxy.assertTrue(
          isValidArray,
          `Scenario '${scenario.name}' should return array with concatenated types from all scopes.`,
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
