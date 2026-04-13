import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';

const LIB = '0500 instanceMethodsBasic.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'getSearchCriteria after successful process',
    input: {
      searchCriteria: { _scope: 'agent', text: 'Pablo Picasso' },
      setupProcessor: true,
    },
    expected: {
      error: false,
      hasSearchCriteria: true,
      scopeInCriteria: 'agent',
    },
  },
  {
    name: 'getSearchScope after successful process',
    input: {
      searchCriteria: { _scope: 'work', text: 'Mona Lisa' },
      setupProcessor: true,
    },
    expected: {
      error: false,
      searchScope: 'work',
    },
  },
  {
    name: 'getCtsQueryStr after successful process',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
      setupProcessor: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'getIgnoredTerms with stop words',
    input: {
      searchCriteria: { _scope: 'agent', text: 'a about actually almost' },
      setupProcessor: true,
    },
    expected: {
      error: true,
      stackToInclude: 'ignored term',
    },
  },
  {
    name: 'getValues with valuesOnly false',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
      setupProcessor: true,
      valuesOnly: false,
    },
    expected: {
      error: false,
      hasValues: false, // Should be empty array
    },
  },
  {
    name: 'getValues with valuesOnly true',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
      setupProcessor: true,
      valuesOnly: true,
    },
    expected: {
      error: false,
      hasValues: false, // Still empty for this scenario
    },
  },
  {
    name: 'Methods before process is called',
    input: {
      searchCriteria: null,
      setupProcessor: false, // Don't call process
    },
    expected: {
      error: false,
      initialState: true,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true, true, true);

    if (scenario.input.setupProcessor) {
      processor.process(
        scenario.input.searchCriteria,
        null, // scopeName from criteria
        false, // allowMultiScope
        new SearchPatternOptions(),
        true, // includeTypeConstraint
        1, // page
        20, // pageLength
        null, // pageWith
        null, // sortCriteria
        scenario.input.valuesOnly || false,
      );
    }

    return {
      searchCriteria: processor.getSearchCriteria(),
      searchScope: processor.getSearchScope(),
      ctsQueryStr: processor.getCtsQueryStr(),
      ignoredTerms: processor.getIgnoredTerms(),
      values: processor.getValues(),
      hasSearchScope: processor.hasSearchScope(),
      requestOptions: processor.getRequestOptions(),
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (
    scenarioResults.actualValue &&
    scenarioResults.applyErrorNotExpectedAssertions
  ) {
    const actual = scenarioResults.actualValue;

    if (scenario.expected.hasSearchCriteria) {
      assertions.push(
        testHelperProxy.assertTrue(
          actual.searchCriteria !== null &&
            typeof actual.searchCriteria === 'object',
          `getSearchCriteria should return valid criteria object for scenario: ${scenario.name}`,
        ),
      );

      // Check that _scope was removed from resolved criteria
      assertions.push(
        testHelperProxy.assertTrue(
          actual.searchCriteria._scope === undefined,
          `getSearchCriteria should not include _scope property for scenario: ${scenario.name}`,
        ),
      );
    }

    if (scenario.expected.searchScope) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.searchScope,
          actual.searchScope,
          `getSearchScope should return ${scenario.expected.searchScope} for scenario: ${scenario.name}`,
        ),
      );

      assertions.push(
        testHelperProxy.assertTrue(
          actual.hasSearchScope,
          `hasSearchScope should return true when scope is set for scenario: ${scenario.name}`,
        ),
      );
    }

    if (scenario.expected.hasCtsQuery) {
      assertions.push(
        testHelperProxy.assertTrue(
          typeof actual.ctsQueryStr === 'string' &&
            actual.ctsQueryStr.length > 0,
          `getCtsQueryStr should return non-empty query string for scenario: ${scenario.name}`,
        ),
      );
    }

    if (scenario.expected.hasValues !== undefined) {
      if (scenario.expected.hasValues) {
        assertions.push(
          testHelperProxy.assertTrue(
            Array.isArray(actual.values) && actual.values.length > 0,
            `getValues should return non-empty array for scenario: ${scenario.name}`,
          ),
        );
      } else {
        assertions.push(
          testHelperProxy.assertTrue(
            Array.isArray(actual.values) && actual.values.length === 0,
            `getValues should return empty array for scenario: ${scenario.name}`,
          ),
        );
      }
    }

    if (scenario.expected.initialState) {
      assertions.push(
        testHelperProxy.assertEqual(
          null,
          actual.searchCriteria,
          `getSearchCriteria should return null before process() for scenario: ${scenario.name}`,
        ),
      );

      assertions.push(
        testHelperProxy.assertEqual(
          undefined,
          actual.searchScope,
          `getSearchScope should return undefined before process() for scenario: ${scenario.name}`,
        ),
      );

      assertions.push(
        testHelperProxy.assertFalse(
          actual.hasSearchScope,
          `hasSearchScope should return false before process() for scenario: ${scenario.name}`,
        ),
      );

      assertions.push(
        testHelperProxy.assertTrue(
          Array.isArray(actual.ignoredTerms) &&
            actual.ignoredTerms.length === 0,
          `getIgnoredTerms should return empty array before process() for scenario: ${scenario.name}`,
        ),
      );

      assertions.push(
        testHelperProxy.assertTrue(
          Array.isArray(actual.values) && actual.values.length === 0,
          `getValues should return empty array before process() for scenario: ${scenario.name}`,
        ),
      );
    }

    // Test requestOptions are always available
    assertions.push(
      testHelperProxy.assertTrue(
        actual.requestOptions !== null &&
          typeof actual.requestOptions === 'object',
        `getRequestOptions should return valid object for scenario: ${scenario.name}`,
      ),
    );

    assertions.push(
      testHelperProxy.assertTrue(
        actual.requestOptions.hasOwnProperty('filterResults'),
        `getRequestOptions should include filterResults property for scenario: ${scenario.name}`,
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
