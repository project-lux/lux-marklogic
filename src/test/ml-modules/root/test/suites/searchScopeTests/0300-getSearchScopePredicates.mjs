/**
 * Test suite for getSearchScopePredicates function from searchScope.mjs
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getSearchScopePredicates } from '/lib/searchScope.mjs';

const LIB = '0300-getSearchScopePredicates.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Agent scope returns predicate array or null',
    input: {
      scopeName: 'agent',
    },
    expected: {
      error: false,
      isValidArrayOrNull: true,
    },
  },
  {
    name: 'Work scope returns predicate array or null',
    input: {
      scopeName: 'work',
    },
    expected: {
      error: false,
      isValidArrayOrNull: true,
    },
  },
  {
    name: 'Concept scope returns predicate array or null',
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
    name: 'Invalid scope returns default predicate',
    input: {
      scopeName: 'invalidScope',
    },
    expected: {
      error: false,
      value: ['lux("any")'],
    },
  },
  {
    name: 'Null input returns default predicate',
    input: {
      scopeName: null,
    },
    expected: {
      error: false,
      value: ['lux("any")'],
    },
  },
  {
    name: 'Undefined input returns default predicate',
    input: {
      scopeName: undefined,
    },
    expected: {
      error: false,
      value: ['lux("any")'],
    },
  },
  {
    name: 'Empty string input returns default predicate',
    input: {
      scopeName: '',
    },
    expected: {
      error: false,
      value: ['lux("any")'],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return getSearchScopePredicates(scenario.input.scopeName);
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
        const hasValidPredicates = actualValue.every(
          (p) => typeof p === 'string' && p.length > 0,
        );
        assertions.push(
          testHelperProxy.assertTrue(
            hasValidPredicates,
            `Scenario '${scenario.name}' predicates should be non-empty strings.`,
          ),
        );
      }
    }
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
