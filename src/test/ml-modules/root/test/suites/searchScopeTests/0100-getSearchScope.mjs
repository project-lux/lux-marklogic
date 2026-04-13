/**
 * Test suite for getSearchScope function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getSearchScope } from '/lib/searchScope.mjs';

const LIB = '0100-getSearchScope.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Agent scope returns valid scope object',
    input: {
      scopeName: 'agent',
    },
    expected: {
      error: false,
      hasValidStructure: true,
    },
  },
  {
    name: 'Work scope returns valid scope object',
    input: {
      scopeName: 'work',
    },
    expected: {
      error: false,
      hasValidStructure: true,
    },
  },
  {
    name: 'Multi scope returns valid scope object',
    input: {
      scopeName: 'multi',
    },
    expected: {
      error: false,
      hasValidStructure: true,
    },
  },
  {
    name: 'Invalid scope name returns null',
    input: {
      scopeName: 'invalidScope',
    },
    expected: {
      error: false,
      value: null,
    },
  },
  {
    name: 'Null input returns null',
    input: {
      scopeName: null,
    },
    expected: {
      error: false,
      value: null,
    },
  },
  {
    name: 'Undefined input returns null',
    input: {
      scopeName: undefined,
    },
    expected: {
      error: false,
      value: null,
    },
  },
  {
    name: 'Empty string input returns null',
    input: {
      scopeName: '',
    },
    expected: {
      error: false,
      value: null,
    },
  },
  {
    name: 'Case sensitive - Agent (uppercase A) returns valid scope object',
    input: {
      scopeName: 'Agent',
    },
    expected: {
      error: false,
      hasValidStructure: true,
    },
  },
  {
    name: 'Case sensitive - AGENT (all caps) returns valid scope object',
    input: {
      scopeName: 'AGENT',
    },
    expected: {
      error: false,
      hasValidStructure: true,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return getSearchScope(scenario.input.scopeName);
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

    if (scenario.expected.hasValidStructure !== undefined) {
      const actualValue = scenarioResults.actualValue;
      const hasValidStructure =
        actualValue !== null &&
        actualValue !== undefined &&
        actualValue.hasOwnProperty('fields') &&
        actualValue.hasOwnProperty('predicates') &&
        actualValue.hasOwnProperty('types') &&
        Array.isArray(actualValue.fields) &&
        (Array.isArray(actualValue.predicates) ||
          actualValue.predicates === null) &&
        (Array.isArray(actualValue.types) || actualValue.types === null);

      assertions.push(
        testHelperProxy.assertTrue(
          hasValidStructure,
          `Scenario '${scenario.name}' should return object with valid structure (fields, predicates, types properties).`,
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
