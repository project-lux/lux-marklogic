import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { isUndefined } from '/utils/utils.mjs';

const LIB = '0100 constructor.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Constructor with minimal parameters - false values',
    input: {
      filterResults: false,
      facetsAreLikely: false,
      synonymsEnabled: false,
    },
    expected: {
      error: false,
      filterResults: false,
      facetsAreLikely: false,
      synonymsEnabled: false,
    },
  },
  {
    name: 'Constructor with minimal parameters - true values',
    input: {
      filterResults: true,
      facetsAreLikely: true,
      synonymsEnabled: true,
    },
    expected: {
      error: false,
      filterResults: true,
      facetsAreLikely: true,
      synonymsEnabled: true,
    },
  },
  {
    name: 'Constructor with undefined parameters',
    input: {
      filterResults: undefined,
      facetsAreLikely: undefined,
      synonymsEnabled: undefined,
    },
    expected: {
      error: false,
      filterResults: undefined,
      facetsAreLikely: undefined,
      synonymsEnabled: undefined,
    },
  },
  {
    name: 'Constructor with null parameters',
    input: {
      filterResults: null,
      facetsAreLikely: null,
      synonymsEnabled: null,
    },
    expected: {
      error: false,
      filterResults: null,
      facetsAreLikely: null,
      synonymsEnabled: null,
    },
  },
  {
    name: 'Constructor with mixed parameter types',
    input: {
      filterResults: true,
      facetsAreLikely: false,
      synonymsEnabled: null,
    },
    expected: {
      error: false,
      filterResults: true,
      facetsAreLikely: false,
      synonymsEnabled: null,
    },
  },
  {
    name: 'Constructor with all boolean options explicitly false',
    input: {
      filterResults: false,
      facetsAreLikely: false,
      synonymsEnabled: false,
    },
    expected: {
      error: false,
      filterResults: false,
      facetsAreLikely: false,
      synonymsEnabled: false,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(
      scenario.input.filterResults,
      scenario.input.facetsAreLikely,
      scenario.input.synonymsEnabled,
    );

    // Validate the constructor properly sets the request options
    const requestOptions = processor.getRequestOptions();

    // Return an object with the properties we want to test
    return {
      filterResults: requestOptions.filterResults,
      facetsAreLikely: requestOptions.facetsAreLikely,
      synonymsEnabled: requestOptions.synonymsEnabled,
      hasSearchTermsConfig:
        processor.searchTermsConfig !== null &&
        processor.searchTermsConfig !== undefined,
      // Test initial state of properties set by process()
      scopeName: processor.scopeName,
      resolvedSearchCriteria: processor.resolvedSearchCriteria,
      criteriaCnt: processor.criteriaCnt,
      ignoredTerms: processor.ignoredTerms,
      ctsQueryStrWithTokens: processor.ctsQueryStrWithTokens,
      ctsQueryStr: processor.ctsQueryStr,
      valuesOnly: processor.valuesOnly,
      values: processor.values,
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (
    scenarioResults.actualValue &&
    scenarioResults.applyErrorNotExpectedAssertions
  ) {
    const actual = scenarioResults.actualValue;

    // Test request options are properly set
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.filterResults,
        actual.filterResults,
        `Constructor should set filterResults to ${scenario.expected.filterResults}`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.facetsAreLikely,
        actual.facetsAreLikely,
        `Constructor should set facetsAreLikely to ${scenario.expected.facetsAreLikely}`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.synonymsEnabled,
        actual.synonymsEnabled,
        `Constructor should set synonymsEnabled to ${scenario.expected.synonymsEnabled}`,
      ),
    );

    // Test that searchTermsConfig is initialized and accesses lux property correctly
    assertions.push(
      testHelperProxy.assertTrue(
        actual.hasSearchTermsConfig,
        'Constructor should initialize searchTermsConfig.lux from getSearchTermsConfig()',
      ),
    );

    // Test that process() properties are in their initial state
    assertions.push(
      testHelperProxy.assertEqual(
        undefined,
        actual.scopeName,
        'scopeName should be undefined before process() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        null,
        actual.resolvedSearchCriteria,
        'resolvedSearchCriteria should be null before process() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        0,
        actual.criteriaCnt,
        'criteriaCnt should be 0 before process() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        Array.isArray(actual.ignoredTerms) && actual.ignoredTerms.length === 0,
        'ignoredTerms should be empty array before process() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        isUndefined(actual.ctsQueryStrWithTokens) ||
          actual.ctsQueryStrWithTokens === '',
        'ctsQueryStrWithTokens should be undefined or an empty string before process() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        '',
        actual.ctsQueryStr,
        'ctsQueryStr should be empty string before process() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        false,
        actual.valuesOnly,
        'valuesOnly should be false before process() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        Array.isArray(actual.values) && actual.values.length === 0,
        'values should be empty array before process() is called',
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
