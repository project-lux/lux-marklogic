import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';

const LIB = '0800 getSearchResultsTests.mjs';
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
    const processor = new SearchCriteriaProcessor(true, true, true);

    processor.process(
      scenario.input.searchCriteria,
      null, // scopeName from criteria
      false, // allowMultiScope
      new SearchPatternOptions(),
      true, // includeTypeConstraint
      scenario.input.page || 1,
      scenario.input.pageLength || 20,
      scenario.input.pageWith || null,
      null, // sortCriteria
      false, // valuesOnly
    );

    return processor.getSearchResults();
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const searchResults = scenarioResults.actualValue;

    if (scenario.expected.hasResultsArray) {
      assertions.push(
        testHelperProxy.assertTrue(
          searchResults && Array.isArray(searchResults.results),
          `Scenario '${scenario.name}' should return object with results array.`,
        ),
      );
    }

    if (scenario.expected.hasResultPageNumber) {
      assertions.push(
        testHelperProxy.assertTrue(
          searchResults && typeof searchResults.resultPage === 'number',
          `Scenario '${scenario.name}' should return object with resultPage number.`,
        ),
      );
    }

    if (scenario.expected.expectedPage !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.expectedPage,
          searchResults.resultPage,
          `Scenario '${scenario.name}' should return expected page number.`,
        ),
      );
    }

    if (scenario.expected.defaultPage !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.defaultPage,
          searchResults.resultPage,
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
