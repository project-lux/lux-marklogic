/**
 * Test suite for SearchCriteriaProcessor.process() - Error Handling
 * Tests all error conditions with direct error message validation
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';

const LIB = '0303-process-errorHandling.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Helper function to create default process parameters
function createProcessInput(overrides = {}) {
  return {
    scopeName: 'agent',
    allowMultiScope: false,
    searchPatternOptions: new SearchPatternOptions(),
    includeTypeConstraint: true,
    page: 1,
    pageLength: 20,
    pageWith: null,
    sortCriteria: null,
    valuesOnly: false,
    ...overrides,
  };
}

const scenarios = [
  {
    name: 'Multi-scope search not allowed when allowMultiScope is false',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          { _scope: 'agent', name: 'Pablo' },
          { _scope: 'work', text: 'painting' },
        ],
      },
      ...createProcessInput({ scopeName: 'multi', allowMultiScope: false }),
    },
    expected: {
      error: true,
      stackToInclude: "search scope of 'multi' not supported by this operation",
    },
  },
  {
    name: 'Multi-scope with empty OR array',
    input: {
      searchCriteria: { _scope: 'multi', OR: [] },
      ...createProcessInput({ scopeName: 'multi', allowMultiScope: true }),
    },
    expected: {
      error: true,
      stackToInclude: 'more search criteria is required',
    },
  },
  {
    name: 'Multi-scope without OR array',
    input: {
      searchCriteria: { _scope: 'multi', text: 'test' },
      ...createProcessInput({ scopeName: 'multi', allowMultiScope: true }),
    },
    expected: {
      error: true,
      stackToInclude: "a search with scope 'multi' must contain an 'OR' array",
    },
  },
  {
    name: 'Search with only ignored terms (stop words)',
    input: {
      searchCriteria: { _scope: 'agent', text: 'a the and' },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: 'which is an ignored term',
    },
  },
  {
    name: 'Empty search criteria object',
    input: {
      searchCriteria: { _scope: 'agent' },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: 'search term does not specify a term name in criteria',
    },
  },
  {
    name: 'Invalid JSON string format',
    input: {
      searchCriteria: '{"_scope": "agent", invalid json}',
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: 'unable to parse criteria',
    },
  },
  {
    name: 'Null search criteria',
    input: {
      searchCriteria: null,
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: 'Search criteria is required',
    },
  },
  {
    name: 'Search criteria with only whitespace text',
    input: {
      searchCriteria: { _scope: 'agent', text: '   ' },
      ...createProcessInput(),
    },
    expected: {
      error: true,
      stackToInclude: 'the search criteria given only contains',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true, true, true);
    const input = scenario.input;

    processor.process(
      input.searchCriteria,
      input.scopeName,
      input.allowMultiScope,
      input.searchPatternOptions,
      input.includeTypeConstraint,
      input.page,
      input.pageLength,
      input.pageWith,
      input.sortCriteria,
      input.valuesOnly,
    );

    return {
      processed: true,
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorExpectedAssertions) {
    if (scenario.expected.stackToInclude) {
      assertions.push(
        testHelperProxy.assertTrue(
          scenarioResults.error.stack.includes(
            scenario.expected.stackToInclude,
          ),
          `Scenario '${scenario.name}' should include error message: ${scenario.expected.stackToInclude}. Actual error: ${scenarioResults.error.stack}`,
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
