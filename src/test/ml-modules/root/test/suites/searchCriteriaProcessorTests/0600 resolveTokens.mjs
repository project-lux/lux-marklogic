import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import {
  TOKEN_FIELDS,
  TOKEN_PREDICATES,
  TOKEN_TYPES,
} from '/lib/searchLib.mjs';

const LIB = '0600 resolveTokens.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'resolveTokens with field token substitution',
    input: {
      ctsQueryStrWithTokens: `cts.fieldWordQuery(${TOKEN_FIELDS}, "Pablo")`,
      fieldsArr: ['agentPrimaryName'],
      predicatesArr: [],
      typesArr: [],
    },
    expected: {
      error: false,
      value: 'cts.fieldWordQuery(["agentPrimaryName"], "Pablo")',
    },
  },
  {
    name: 'resolveTokens with multiple field tokens',
    input: {
      ctsQueryStrWithTokens: `cts.fieldWordQuery(${TOKEN_FIELDS}, "text")`,
      fieldsArr: ['field1', 'field2', 'field3'],
      predicatesArr: [],
      typesArr: [],
    },
    expected: {
      error: false,
      value: 'cts.fieldWordQuery(["field1", "field2", "field3"], "text")',
    },
  },
  {
    name: 'resolveTokens with predicate token substitution',
    input: {
      ctsQueryStrWithTokens: `cts.tripleRangeQuery(null, ${TOKEN_PREDICATES}, "value")`,
      fieldsArr: [],
      predicatesArr: ['lux("agentName")'],
      typesArr: [],
    },
    expected: {
      error: false,
      value: 'cts.tripleRangeQuery(null, [lux("agentName")], "value")',
    },
  },
  {
    name: 'resolveTokens with type token substitution',
    input: {
      ctsQueryStrWithTokens: `cts.jsonPropertyValueQuery("dataType", ${TOKEN_TYPES})`,
      fieldsArr: [],
      predicatesArr: [],
      typesArr: ['Agent', 'Person'],
    },
    expected: {
      error: false,
      value: 'cts.jsonPropertyValueQuery("dataType", ["Agent", "Person"])',
    },
  },
  {
    name: 'resolveTokens with all token types',
    input: {
      ctsQueryStrWithTokens: `cts.andQuery([cts.fieldWordQuery(${TOKEN_FIELDS}, "Pablo"), cts.tripleRangeQuery(null, ${TOKEN_PREDICATES}, "value"), cts.jsonPropertyValueQuery("dataType", ${TOKEN_TYPES})])`,
      fieldsArr: ['agentName'],
      predicatesArr: ['lux("name")', 'skos("prefLabel")'],
      typesArr: ['Agent'],
    },
    expected: {
      error: false,
      value:
        'cts.andQuery([cts.fieldWordQuery(["agentName"], "Pablo"), cts.tripleRangeQuery(null, [lux("name"), skos("prefLabel")], "value"), cts.jsonPropertyValueQuery("dataType", ["Agent"])])',
    },
  },
  {
    name: 'resolveTokens with repeated tokens',
    input: {
      ctsQueryStrWithTokens: `cts.orQuery([cts.fieldWordQuery(${TOKEN_FIELDS}, "first"), cts.fieldWordQuery(${TOKEN_FIELDS}, "second")])`,
      fieldsArr: ['testField'],
      predicatesArr: [],
      typesArr: [],
    },
    expected: {
      error: false,
      value:
        'cts.orQuery([cts.fieldWordQuery(["testField"], "first"), cts.fieldWordQuery(["testField"], "second")])',
    },
  },
  {
    name: 'resolveTokens with empty arrays',
    input: {
      ctsQueryStrWithTokens: `cts.andQuery([${TOKEN_FIELDS}, ${TOKEN_PREDICATES}, ${TOKEN_TYPES}])`,
      fieldsArr: [],
      predicatesArr: [],
      typesArr: [],
    },
    expected: {
      error: false,
      value: 'cts.andQuery([[], [], []])',
    },
  },
  {
    name: 'resolveTokens with null arrays',
    input: {
      ctsQueryStrWithTokens: `cts.fieldWordQuery(${TOKEN_FIELDS}, "test")`,
      fieldsArr: null,
      predicatesArr: null,
      typesArr: null,
    },
    expected: {
      error: false,
      value: 'cts.fieldWordQuery(null, "test")',
    },
  },
  {
    name: 'resolveTokens with no tokens in string',
    input: {
      ctsQueryStrWithTokens: 'cts.wordQuery("simple query")',
      fieldsArr: ['field1'],
      predicatesArr: ['pred1'],
      typesArr: ['type1'],
    },
    expected: {
      error: false,
      value: 'cts.wordQuery("simple query")',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true, true, true);

    // Set the query string with tokens directly
    processor.ctsQueryStrWithTokens = scenario.input.ctsQueryStrWithTokens;

    return processor.resolveTokens(
      scenario.input.fieldsArr,
      scenario.input.predicatesArr,
      scenario.input.typesArr,
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const actualValue = scenarioResults.actualValue;

    if (scenario.expected.value !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.value,
          actualValue,
          `Scenario '${scenario.name}' did not return the expected value.`,
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
