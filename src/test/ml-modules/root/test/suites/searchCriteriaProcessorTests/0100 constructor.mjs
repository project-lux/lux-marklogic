import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0100 constructor.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Constructor with minimal parameters - false values',
    input: {
      filterResults: false,
    },
    expected: {
      error: false,
      filterResults: false,
    },
  },
  {
    name: 'Constructor with minimal parameters - true values',
    input: {
      filterResults: true,
    },
    expected: {
      error: false,
      filterResults: true,
    },
  },
  {
    name: 'Constructor with undefined parameters',
    input: {
      filterResults: undefined,
    },
    expected: {
      error: false,
      filterResults: undefined,
    },
  },
  {
    name: 'Constructor with null parameters',
    input: {
      filterResults: null,
    },
    expected: {
      error: false,
      filterResults: null,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(scenario.input.filterResults);

    // Validate the constructor properly sets the request options
    const requestOptions = processor.getRequestOptions();

    // Return an object with the properties we want to test
    return {
      filterResults: requestOptions.filterResults,
      hasSearchTermsConfig: processor.getSearchTermsConfig() != null,
      // Test initial state of properties set by process()
      scopeName: processor.getSearchScope(),
      resolvedSearchCriteria: processor.getSearchCriteria(),
      criteriaCnt: processor.getCriteriaCount(),
      ignoredTerms: processor.getIgnoredTerms(),
      ctsQueryStr: processor.getQueryStr(),
      valuesOnly: processor.isValuesOnly(),
      values: processor.getValues(),
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
        actual.ctsQueryStr != null,
        'getQueryStr() should return a value before process() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        false,
        actual.valuesOnly,
        'isValuesOnly() should return false before process() is called',
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
