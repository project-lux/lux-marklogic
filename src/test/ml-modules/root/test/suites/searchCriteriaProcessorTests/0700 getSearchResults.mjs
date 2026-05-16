import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { PatternOptions } from '/lib/search/patterns.mjs';

const LIB = '0700 getSearchResultsTests.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'getSearchResults returns valid structure',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
    },
    expected: {
      error: false,
      hasResultsArray: true,
      hasResultPageNumber: true,
      defaultPage: 1,
    },
  },
  {
    name: 'getSearchResults with custom pagination',
    input: {
      searchCriteria: { _scope: 'work', text: 'painting' },
      page: 2,
      pageLength: 10,
    },
    expected: {
      error: false,
      hasResultsArray: true,
      hasResultPageNumber: true,
      expectedPage: 2,
    },
  },
  {
    name: 'getSearchResults with ignored terms throws error',
    input: {
      searchCriteria: { _scope: 'agent', text: 'a' }, // stop word only
    },
    expected: {
      error: true,
      stackToInclude: 'ignored term',
    },
  },
];

// Test getSearchResults scenarios
for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true);

    processor.prepare({
      searchCriteria: scenario.input.searchCriteria,
      scopeName: null, // scopeName from criteria
      allowMultiScope: false,
      patternOptions: new PatternOptions(),
      includeTypeConstraint: true,
      page: scenario.input.page || 1,
      pageLength: scenario.input.pageLength || 20,
      pageWith: scenario.input.pageWith || null,
      sortCriteria: null,
    });

    return processor.execute(true);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const searchExecutionResult = scenarioResults.actualValue;

    if (scenario.expected.hasResultsArray) {
      assertions.push(
        testHelperProxy.assertTrue(
          searchExecutionResult &&
            Array.isArray(searchExecutionResult.getSearchResults()),
          `Scenario '${scenario.name}' should return object with results array.`,
        ),
      );
    }

    if (scenario.expected.hasResultPageNumber) {
      assertions.push(
        testHelperProxy.assertTrue(
          searchExecutionResult &&
            typeof searchExecutionResult.getResultPage() === 'number',
          `Scenario '${scenario.name}' should return object with resultPage number.`,
        ),
      );
    }

    if (scenario.expected.expectedPage !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.expectedPage,
          searchExecutionResult.getResultPage(),
          `Scenario '${scenario.name}' should return expected page number.`,
        ),
      );
    }

    if (scenario.expected.defaultPage !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.defaultPage,
          searchExecutionResult.getResultPage(),
          `Scenario '${scenario.name}' should return default page number.`,
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
