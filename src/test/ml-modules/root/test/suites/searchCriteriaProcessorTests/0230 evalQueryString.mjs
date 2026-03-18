import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { isDefined } from '/utils/utils.mjs';

const LIB = '0230 evalQueryString.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Simple CTS text query',
    input: {
      queryStr: 'cts.wordQuery("test")',
    },
    expected: {
      error: false,
      valueExpected: true,
    },
  },
  {
    name: 'CTS and query',
    input: {
      queryStr:
        'cts.andQuery([cts.wordQuery("test"), cts.wordQuery("example")])',
    },
    expected: {
      error: false,
      valueExpected: true,
    },
  },
  {
    name: 'CTS or query',
    input: {
      queryStr:
        'cts.orQuery([cts.wordQuery("test"), cts.wordQuery("example")])',
    },
    expected: {
      error: false,
      valueExpected: true,
    },
  },
  {
    name: 'CTS JSON property value query',
    input: {
      queryStr: 'cts.jsonPropertyValueQuery("type", "agent", ["exact"])',
    },
    expected: {
      error: false,
      valueExpected: true,
    },
  },
  {
    name: 'CTS field range query',
    input: {
      queryStr:
        'cts.fieldRangeQuery("agentActiveStartDateLong", ">=", -6048259200)',
    },
    expected: {
      error: false,
      valueExpected: true,
    },
  },
  {
    name: 'CTS true query',
    input: {
      queryStr: 'cts.trueQuery()',
    },
    expected: {
      error: false,
      valueExpected: true,
    },
  },
  {
    name: 'CTS false query',
    input: {
      queryStr: 'cts.falseQuery()',
    },
    expected: {
      error: false,
      valueExpected: true,
    },
  },
  {
    name: 'CTS values lexicon query',
    input: {
      queryStr:
        'fn.subsequence(cts.fieldValues("agentPrimaryName"), 1, 10).toArray()',
    },
    expected: {
      error: false,
      valueExpected: true,
    },
  },
  {
    name: 'Invalid query syntax',
    input: {
      queryStr: 'cts.invalidQuery(syntax error',
    },
    expected: {
      error: true,
      stackToInclude: '',
    },
  },
  {
    name: 'Empty query string',
    input: {
      queryStr: '',
    },
    expected: {
      error: true,
      stackToInclude: 'Error running JavaScript request',
    },
  },
  {
    name: 'Null query string',
    input: {
      queryStr: null,
    },
    expected: {
      error: false,
      valueExpected: false,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return SearchCriteriaProcessor.evalQueryString(scenario.input.queryStr);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.valueExpected === true,
        isDefined(scenarioResults.actualValue),
        `Value ${scenario.expected.valueExpected === true ? '' : 'not '} expected in scenario '${scenario.name}'`,
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
