/**
 * Test suite for SearchCriteriaProcessor.process() - Scope Resolution
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';

const LIB = '0301-process-scopeResolution.mjs';
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
    name: 'Resolves scope from criteria when scopeName is null',
    input: {
      searchCriteria: { _scope: 'work', text: 'Mona Lisa' },
      ...createProcessInput({ scopeName: null }),
    },
    expected: {
      error: false,
      scopeName: 'work',
    },
  },
  {
    name: 'Uses explicit scope parameter over criteria scope',
    input: {
      searchCriteria: { _scope: 'work', text: 'Pablo Picasso' },
      ...createProcessInput({ scopeName: 'agent' }),
    },
    expected: {
      error: false,
      scopeName: 'agent',
    },
  },
  {
    name: 'Validates scope name is valid',
    input: {
      searchCriteria: { _scope: 'agent', name: 'test' },
      ...createProcessInput(),
    },
    expected: {
      error: false,
      scopeName: 'agent',
    },
  },
  {
    name: 'Rejects invalid scope names',
    input: {
      searchCriteria: { _scope: 'invalidScope', name: 'test' },
      ...createProcessInput({ scopeName: 'invalidScope' }),
    },
    expected: {
      error: true,
      stackToInclude: 'is not a valid search scope',
    },
  },
  {
    name: 'Requires scope to be specified',
    input: {
      searchCriteria: { name: 'Pablo Picasso' },
      ...createProcessInput({ scopeName: null }),
    },
    expected: {
      error: true,
      stackToInclude: 'search scope not specified',
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
      scopeName: processor.getSearchScope(),
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    if (scenario.expected.scopeName !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.scopeName,
          scenarioResults.actualValue.scopeName,
          `Scenario '${scenario.name}' did not resolve to expected scope.`,
        ),
      );
    }
  }

  if (scenarioResults.applyErrorExpectedAssertions) {
    if (scenario.expected.stackToInclude) {
      assertions.push(
        testHelperProxy.assertTrue(
          scenarioResults.error.stack.includes(
            scenario.expected.stackToInclude,
          ),
          `Scenario '${scenario.name}' should include error message: ${scenario.expected.stackToInclude}`,
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
