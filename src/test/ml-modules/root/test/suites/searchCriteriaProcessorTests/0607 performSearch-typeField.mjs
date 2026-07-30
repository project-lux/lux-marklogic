import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import { PatternOptions } from '/lib/search/PatternOptions.mjs';
import { ML_APP_NAME } from '/lib/appConstants.mjs';

const LIB = '0607 performSearch-typeField.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Validates that every search result has a non-empty `type` string.
// Covers all three performSearch code paths:
//   Path 1 (Opt 20/fromSearch): CTS-eligible, no lexicon sort
//   Path 2 (fromLexicons+CTS): CTS-eligible, lexicon sort
//   Path 3 (full materialization): not CTS-eligible (has joins)
const scenarios = [
  {
    name: 'Path 1 (fromSearch): agent name search, default sort',
    input: {
      searchCriteria: { _scope: 'agent', name: 'john' },
      sortDelimitedStr: '',
    },
    expected: { error: false },
  },
  {
    name: 'Path 1 (fromSearch): item text search, default sort',
    input: {
      searchCriteria: { _scope: 'item', text: 'painting' },
      sortDelimitedStr: '',
    },
    expected: { error: false },
  },
  {
    name: 'Path 2 (fromLexicons+CTS): agent name search, lexicon sort',
    input: {
      searchCriteria: { _scope: 'agent', name: 'john' },
      sortDelimitedStr: 'agentActiveDate:asc',
    },
    expected: { error: false },
  },
  {
    name: 'Path 3 (full materialization): agent with hop',
    input: {
      searchCriteria: { _scope: 'agent', produced: { name: 'painting' } },
      sortDelimitedStr: '',
    },
    expected: { error: false },
  },
  {
    name: 'Path 3 (full materialization): item with IndexedRange',
    input: {
      searchCriteria: { _scope: 'item', depth: '100', _comp: '>=' },
      sortDelimitedStr: '',
    },
    expected: { error: false },
  },
];

const adjustedTenantName = ML_APP_NAME === 'luxCTS' ? 'lux' : ML_APP_NAME;
const invokeFunOptions = {
  database: xdmp.database(`${adjustedTenantName}-content`),
};

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();

    scp.prepare({
      searchCriteria: scenario.input.searchCriteria,
      scopeName: null,
      allowMultiScope: false,
      patternOptions: new PatternOptions(),
      includeTypeConstraint: true,
      filterResults: true,
      page: 1,
      pageLength: 5,
      pageWith: null,
      sortDelimitedStr: scenario.input.sortDelimitedStr,
    });

    return scp.execute();
  };

  const scenarioResults = executeScenario(
    scenario,
    zeroArityFun,
    invokeFunOptions,
  );

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const searchExecutionResult = scenarioResults.actualValue;
    const results = searchExecutionResult.getSearchResults();

    // Must have results to validate
    assertions.push(
      testHelperProxy.assertTrue(
        Array.isArray(results) && results.length > 0,
        `Scenario '${scenario.name}' should return at least one result.`,
      ),
    );

    // Every result must have a non-empty type string
    const badResults = results.filter(
      (r) => typeof r.type !== 'string' || r.type.length === 0,
    );
    assertions.push(
      testHelperProxy.assertEqual(
        0,
        badResults.length,
        `Scenario '${scenario.name}': ${badResults.length} of ${results.length} results have empty or missing type.`,
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
