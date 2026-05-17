import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import { PatternOptions } from '/lib/search/patterns.mjs';

const LIB = '0500 instanceMethodsBasic.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'getSearchCriteria after successful process',
    input: {
      searchCriteria: { _scope: 'agent', text: 'Pablo Picasso' },
      callPrepare: true,
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
      callPrepare: true,
    },
    expected: {
      error: false,
      searchScope: 'work',
    },
  },
  {
    name: 'getQueryStr after successful process',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
      callPrepare: true,
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
      callPrepare: true,
    },
    expected: {
      error: true,
      stackToInclude: 'ignored term',
    },
  },
  {
    name: 'Methods before process is called',
    input: {
      searchCriteria: null,
      callPrepare: false,
    },
    expected: {
      error: false,
      initialState: true,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();

    if (scenario.input.callPrepare) {
      scp.prepare({
        searchCriteria: scenario.input.searchCriteria,
        scopeName: null, // scopeName from criteria
        allowMultiScope: false,
        patternOptions: new PatternOptions(),
        includeTypeConstraint: true,
        filterResults: true,
        page: 1,
        pageLength: 20,
        pageWith: null,
        sortCriteria: null,
      });
    }

    return {
      searchCriteria: scp.getSearchCriteria(),
      searchScope: scp.getSearchScope(),
      ctsQueryStr: scp.getQueryStr(),
      ignoredTerms: scp.getIgnoredTerms(),
      values: scp.getValues(),
      hasSearchScope: scp.hasSearchScope(),
      filterResults: scp.getFilterResults(),
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
          `getQueryStr should return non-empty query string for scenario: ${scenario.name}`,
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

    // Test filterResults is always a boolean
    assertions.push(
      testHelperProxy.assertTrue(
        typeof actual.filterResults === 'boolean',
        `getFilterResults should return a boolean for scenario: ${scenario.name}`,
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
