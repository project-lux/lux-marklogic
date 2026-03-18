import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0220 translateStringGrammarToJSON.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Simple text search in agent scope',
    input: {
      scopeName: 'agent',
      searchCriteria: 'Picasso',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'agent',
    },
  },
  {
    name: 'Simple text search in work scope',
    input: {
      scopeName: 'work',
      searchCriteria: 'Mona Lisa',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'work',
    },
  },
  {
    name: 'Quoted phrase search',
    input: {
      scopeName: 'agent',
      searchCriteria: '"Pablo Picasso"',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'agent',
    },
  },
  {
    name: 'Boolean AND query',
    input: {
      scopeName: 'work',
      searchCriteria: 'painting AND modern',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'work',
    },
  },
  {
    name: 'Boolean OR query',
    input: {
      scopeName: 'work',
      searchCriteria: 'painting OR drawing',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'work',
    },
  },
  {
    name: 'Boolean NOT query',
    input: {
      scopeName: 'agent',
      searchCriteria: 'artist NOT painter',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'agent',
    },
  },
  {
    name: 'Complex boolean query with parentheses',
    input: {
      scopeName: 'work',
      searchCriteria: '(painting OR drawing) AND modern',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'work',
    },
  },
  {
    name: 'Query with wildcards',
    input: {
      scopeName: 'agent',
      searchCriteria: 'Pic*',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'agent',
    },
  },
  {
    name: 'Empty search string',
    input: {
      scopeName: 'agent',
      searchCriteria: '',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'agent',
    },
  },
  {
    name: 'Whitespace only search string',
    input: {
      scopeName: 'work',
      searchCriteria: '   ',
    },
    expected: {
      error: false,
      hasScope: true,
      scopeValue: 'work',
    },
  },
  {
    name: 'Invalid scope name',
    input: {
      scopeName: 'invalidScope',
      searchCriteria: 'test',
    },
    expected: {
      error: true,
      stackToInclude: 'is not a valid search scope',
    },
  },
  {
    name: 'Null scope name',
    input: {
      scopeName: null,
      searchCriteria: 'test',
    },
    expected: {
      error: true,
      stackToInclude: 'is not a valid search scope',
    },
  },
  {
    name: 'Undefined scope name',
    input: {
      scopeName: undefined,
      searchCriteria: 'test',
    },
    expected: {
      error: true,
      stackToInclude: 'is not a valid search scope',
    },
  },
  {
    name: 'Invalid search grammar',
    input: {
      scopeName: 'agent',
      searchCriteria: 'test AND OR invalid',
    },
    expected: {
      error: true,
      stackToInclude: 'unable to parse criteria',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const result = SearchCriteriaProcessor.translateStringGrammarToJSON(
      scenario.input.scopeName,
      scenario.input.searchCriteria,
    );

    return {
      result: result,
      hasScope: result && result._scope !== undefined,
      scopeValue: result ? result._scope : null,
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (
    scenarioResults.actualValue &&
    scenarioResults.applyErrorNotExpectedAssertions
  ) {
    const actual = scenarioResults.actualValue;

    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.hasScope,
        actual.hasScope,
        `translateStringGrammarToJSON should ${scenario.expected.hasScope ? 'include' : 'not include'} _scope property for scenario: ${scenario.name}`,
      ),
    );

    if (scenario.expected.hasScope) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.scopeValue,
          actual.scopeValue,
          `translateStringGrammarToJSON should set _scope to ${scenario.expected.scopeValue} for scenario: ${scenario.name}`,
        ),
      );
    }

    // Verify the result is a JSON object (not null/undefined)
    assertions.push(
      testHelperProxy.assertTrue(
        actual.result !== null && typeof actual.result === 'object',
        `translateStringGrammarToJSON should return a JSON object for scenario: ${scenario.name}`,
      ),
    );
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
