/**
 * Test suite for getSearchScopeFields function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getSearchScopeFields } from '/lib/searchScope.mjs';

const LIB = '0200-getSearchScopeFields.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Agent scope returns field array',
    input: {
      scopeName: 'agent',
    },
    expected: {
      error: false,
      isValidArrayWithFields: true,
    },
  },
  {
    name: 'Work scope returns field array',
    input: {
      scopeName: 'work',
    },
    expected: {
      error: false,
      isValidArrayWithFields: true,
    },
  },
  {
    name: 'Item scope returns field array',
    input: {
      scopeName: 'item',
    },
    expected: {
      error: false,
      isValidArrayWithFields: true,
    },
  },
  {
    name: 'Concept scope returns field array',
    input: {
      scopeName: 'concept',
    },
    expected: {
      error: false,
      isValidArrayWithFields: true,
    },
  },
  {
    name: 'Agent scope includes expected field names',
    input: {
      scopeName: 'agent',
    },
    expected: {
      error: false,
      hasAnyTextField: true,
    },
  },
  {
    name: 'Work scope includes expected field names',
    input: {
      scopeName: 'work',
    },
    expected: {
      error: false,
      hasAnyTextField: true,
    },
  },
  {
    name: 'Multi scope handling',
    input: {
      scopeName: 'multi',
    },
    expected: {
      error: false,
      value: [],
    },
  },
  {
    name: 'Invalid scope returns all fields (defaultToAll=true)',
    input: {
      scopeName: 'invalidScope',
    },
    expected: {
      error: false,
      hasAllFields: true,
    },
  },
  {
    name: 'Null input returns all fields (defaultToAll=true)',
    input: {
      scopeName: null,
    },
    expected: {
      error: false,
      hasAllFields: true,
    },
  },
  {
    name: 'Undefined input returns all fields (defaultToAll=true)',
    input: {
      scopeName: undefined,
    },
    expected: {
      error: false,
      hasAllFields: true,
    },
  },
  {
    name: 'Empty string input returns all fields (defaultToAll=true)',
    input: {
      scopeName: '',
    },
    expected: {
      error: false,
      hasAllFields: true,
    },
  },
  {
    name: 'Case sensitive - Agent (uppercase A) returns all fields',
    input: {
      scopeName: 'Agent',
    },
    expected: {
      error: false,
      hasAllFields: true,
    },
  },
  {
    name: 'Case sensitive - AGENT (all caps) returns all fields',
    input: {
      scopeName: 'AGENT',
    },
    expected: {
      error: false,
      hasAllFields: true,
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
      return getSearchScopeFields(
        scenario.input.scopeName,
        scenario.input.defaultToAll,
      );
    }
    return getSearchScopeFields(scenario.input.scopeName);
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

    if (scenario.expected.isValidArrayWithFields !== undefined) {
      const actualValue = scenarioResults.actualValue;
      const isValidArray =
        Array.isArray(actualValue) && actualValue.length === 1;

      assertions.push(
        testHelperProxy.assertTrue(
          isValidArray,
          `Scenario '${scenario.name}' should return array with one field.`,
        ),
      );

      if (isValidArray) {
        const hasAnyTextField = actualValue[0].includes('AnyText');
        assertions.push(
          testHelperProxy.assertTrue(
            hasAnyTextField,
            `Scenario '${scenario.name}' field should include 'AnyText'.`,
          ),
        );
      }
    }

    if (scenario.expected.hasAnyTextField !== undefined) {
      const actualValue = scenarioResults.actualValue;
      const hasAnyTextField =
        Array.isArray(actualValue) &&
        actualValue.length === 1 &&
        actualValue[0].includes('AnyText');

      assertions.push(
        testHelperProxy.assertTrue(
          hasAnyTextField,
          `Scenario '${scenario.name}' should return array with one field containing 'AnyText'.`,
        ),
      );
    }

    if (scenario.expected.hasAllFields !== undefined) {
      const actualValue = scenarioResults.actualValue;
      const isValidArray =
        Array.isArray(actualValue) && actualValue.length >= 1;

      assertions.push(
        testHelperProxy.assertTrue(
          isValidArray,
          `Scenario '${scenario.name}' should return array with concatenated fields from all scopes.`,
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
