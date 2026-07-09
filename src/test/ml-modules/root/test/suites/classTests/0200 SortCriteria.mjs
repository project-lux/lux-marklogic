import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SortCriteria } from '/lib/SortCriteria.mjs';

const LIB = '0200 SortCriteria.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  // --- Default / relevance ---
  {
    name: 'Empty string defaults to relevance sort',
    input: { scopeName: 'agent', sortCriteriaStr: '' },
    expected: {
      error: false,
      isRelevanceSort: true,
      isRandomSort: false,
      areScoresRequired: true,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Explicit relevance keyword',
    input: { scopeName: 'agent', sortCriteriaStr: 'relevance' },
    expected: {
      error: false,
      isRelevanceSort: true,
      isRandomSort: false,
      areScoresRequired: true,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Relevance keyword is case-insensitive',
    input: { scopeName: 'agent', sortCriteriaStr: 'Relevance' },
    expected: {
      error: false,
      isRelevanceSort: true,
      isRandomSort: false,
      areScoresRequired: true,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },

  // --- Random sort ---
  {
    name: 'Random sort clears all other state',
    input: { scopeName: 'agent', sortCriteriaStr: 'random' },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: true,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Random keyword is case-insensitive',
    input: { scopeName: 'agent', sortCriteriaStr: 'Random' },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: true,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Random after non-semantic clears preceding sort',
    input: { scopeName: 'agent', sortCriteriaStr: 'agentActiveDate,random' },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: true,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },

  // --- Random vs semantic precedence (order-dependent) ---
  {
    name: 'Random before semantic — random wins (stops iteration)',
    input: {
      scopeName: 'agent',
      sortCriteriaStr: 'random,agentClassificationConceptName',
    },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: true,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Semantic before random — semantic wins (stops iteration)',
    input: {
      scopeName: 'agent',
      sortCriteriaStr: 'agentClassificationConceptName,random',
    },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: false,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: true,
      getSemanticSortOption: {
        predicate: 'lux:agentClassifiedAs',
        indexReference: 'anySortName',
        order: 'ascending',
      },
    },
  },

  // --- Non-semantic sort ---
  {
    name: 'Single non-semantic sort with default ascending order',
    input: { scopeName: 'agent', sortCriteriaStr: 'agentActiveDate' },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: false,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: true,
      getNonSemanticSortDescriptors: [
        { indexReference: 'agentActiveStartDateLong', order: 'ascending' },
      ],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Non-semantic sort with explicit descending order',
    input: { scopeName: 'agent', sortCriteriaStr: 'agentActiveDate:desc' },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: false,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: true,
      getNonSemanticSortDescriptors: [
        { indexReference: 'agentActiveStartDateLong', order: 'descending' },
      ],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Non-semantic sort uses binding defaultOrder when no order specified',
    input: { scopeName: 'agent', sortCriteriaStr: 'agentHasDigitalImage' },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: false,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: true,
      getNonSemanticSortDescriptors: [
        { indexReference: 'agentHasDigitalImageBoolean', order: 'descending' },
      ],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Multiple non-semantic sort descriptors',
    input: {
      scopeName: 'agent',
      sortCriteriaStr: 'agentActiveDate,agentEndDate',
    },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: false,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: true,
      getNonSemanticSortDescriptors: [
        { indexReference: 'agentActiveStartDateLong', order: 'ascending' },
        { indexReference: 'agentDiedStartDateLong', order: 'ascending' },
      ],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },

  // --- Semantic sort ---
  {
    name: 'Semantic sort sets option and clears relevance',
    input: {
      scopeName: 'agent',
      sortCriteriaStr: 'agentClassificationConceptName',
    },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: false,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: true,
      getSemanticSortOption: {
        predicate: 'lux:agentClassifiedAs',
        indexReference: 'anySortName',
        order: 'ascending',
      },
    },
  },
  {
    name: 'Semantic sort after non-semantic clears preceding descriptors',
    input: {
      scopeName: 'agent',
      sortCriteriaStr: 'agentActiveDate,agentClassificationConceptName',
    },
    expected: {
      error: false,
      isRelevanceSort: false,
      isRandomSort: false,
      areScoresRequired: false,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: true,
      getSemanticSortOption: {
        predicate: 'lux:agentClassifiedAs',
        indexReference: 'anySortName',
        order: 'ascending',
      },
    },
  },

  // --- Mixed relevance + non-semantic ---
  {
    name: 'Relevance then non-semantic — both active, scores required',
    input: {
      scopeName: 'agent',
      sortCriteriaStr: 'relevance,agentActiveDate',
    },
    expected: {
      error: false,
      isRelevanceSort: true,
      isRandomSort: false,
      areScoresRequired: true,
      hasNonSemanticSortDescriptors: true,
      getNonSemanticSortDescriptors: [
        { indexReference: 'agentActiveStartDateLong', order: 'ascending' },
      ],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Non-semantic then relevance — both active, scores required',
    input: {
      scopeName: 'agent',
      sortCriteriaStr: 'agentActiveDate,relevance',
    },
    expected: {
      error: false,
      isRelevanceSort: true,
      isRandomSort: false,
      areScoresRequired: true,
      hasNonSemanticSortDescriptors: true,
      getNonSemanticSortDescriptors: [
        { indexReference: 'agentActiveStartDateLong', order: 'ascending' },
      ],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  // --- Invalid / ignored bindings ---
  {
    name: 'Wrong scope binding is ignored — defaults to relevance',
    input: { scopeName: 'agent', sortCriteriaStr: 'workCreationDate' },
    expected: {
      error: false,
      isRelevanceSort: true,
      isRandomSort: false,
      areScoresRequired: true,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
  {
    name: 'Unknown binding name is ignored — defaults to relevance',
    input: { scopeName: 'agent', sortCriteriaStr: 'unknownBinding' },
    expected: {
      error: false,
      isRelevanceSort: true,
      isRandomSort: false,
      areScoresRequired: true,
      hasNonSemanticSortDescriptors: false,
      getNonSemanticSortDescriptors: [],
      hasSemanticSortOption: false,
      getSemanticSortOption: null,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const sc = new SortCriteria(
      scenario.input.scopeName,
      scenario.input.sortCriteriaStr,
    );
    return JSON.stringify({
      isRelevanceSort: sc.isRelevanceSort(),
      isRandomSort: sc.isRandomSort(),
      areScoresRequired: sc.areScoresRequired(),
      hasNonSemanticSortDescriptors: sc.hasNonSemanticSortDescriptors(),
      getNonSemanticSortDescriptors: sc.getNonSemanticSortDescriptors(),
      hasSemanticSortOption: sc.hasSemanticSortOption(),
      getSemanticSortOption: sc.getSemanticSortOption(),
    });
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const actual = JSON.parse(scenarioResults.actualValue);
    const e = scenario.expected;
    const p = scenario.name;

    assertions.push(
      testHelperProxy.assertEqual(
        e.isRelevanceSort,
        actual.isRelevanceSort,
        `${p}: isRelevanceSort`,
      ),
      testHelperProxy.assertEqual(
        e.isRandomSort,
        actual.isRandomSort,
        `${p}: isRandomSort`,
      ),
      testHelperProxy.assertEqual(
        e.areScoresRequired,
        actual.areScoresRequired,
        `${p}: areScoresRequired`,
      ),
      testHelperProxy.assertEqual(
        e.hasNonSemanticSortDescriptors,
        actual.hasNonSemanticSortDescriptors,
        `${p}: hasNonSemanticSortDescriptors`,
      ),
      testHelperProxy.assertEqual(
        e.hasSemanticSortOption,
        actual.hasSemanticSortOption,
        `${p}: hasSemanticSortOption`,
      ),
      testHelperProxy.assertEqual(
        JSON.stringify(e.getNonSemanticSortDescriptors),
        JSON.stringify(actual.getNonSemanticSortDescriptors),
        `${p}: getNonSemanticSortDescriptors`,
      ),
      testHelperProxy.assertEqual(
        JSON.stringify(e.getSemanticSortOption),
        JSON.stringify(actual.getSemanticSortOption),
        `${p}: getSemanticSortOption`,
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
