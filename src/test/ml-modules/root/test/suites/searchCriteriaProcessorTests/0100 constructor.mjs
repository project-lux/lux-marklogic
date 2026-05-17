import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0100 constructor.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Constructor initializes with correct defaults',
    input: {},
    expected: {
      error: false,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();

    // Validate the constructor properly initializes defaults
    const filterResults = scp.getFilterResults();

    // Return an object with the properties we want to test
    return {
      // Test initial state of properties set by prepare()
      filterResults,
      scopeName: scp.getSearchScope(),
      resolvedSearchCriteria: scp.getSearchCriteria(),
      criteriaCnt: scp.getCriteriaCount(),
      ignoredTerms: scp.getIgnoredTerms(),
      ctsQueryStr: scp.getQueryStr(),
      values: scp.getValues(),
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (
    scenarioResults.actualValue &&
    scenarioResults.applyErrorNotExpectedAssertions
  ) {
    const actual = scenarioResults.actualValue;

    // Test that prepare() properties are in their initial state
    assertions.push(
      testHelperProxy.assertEqual(
        undefined,
        actual.scopeName,
        'scopeName should be undefined before prepare() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        null,
        actual.resolvedSearchCriteria,
        'resolvedSearchCriteria should be null before prepare() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        0,
        actual.criteriaCnt,
        'criteriaCnt should be 0 before prepare() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        Array.isArray(actual.ignoredTerms) && actual.ignoredTerms.length === 0,
        'ignoredTerms should be empty array before prepare() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        actual.ctsQueryStr != null,
        'getQueryStr() should return a value before prepare() is called',
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        Array.isArray(actual.values) && actual.values.length === 0,
        'values should be empty array before prepare() is called',
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
