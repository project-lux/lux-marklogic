import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0200 getSortTypeFromSortBinding.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Semantic sort type - has predicate',
    input: {
      sortBinding: {
        predicate: 'http://example.org/some-predicate',
        indexReference: 'someIndex',
        order: 'ascending',
      },
    },
    expected: {
      error: false,
      sortType: 'semantic',
    },
  },
  {
    name: 'Non-semantic sort type - no predicate',
    input: {
      sortBinding: {
        indexReference: 'primaryName',
        order: 'descending',
      },
    },
    expected: {
      error: false,
      sortType: 'nonSemantic',
    },
  },
  {
    name: 'Null sortBinding',
    input: {
      sortBinding: null,
    },
    expected: {
      error: true,
      stackToInclude: 'sortBinding is required to determine sort type',
    },
  },
  {
    name: 'Undefined sortBinding',
    input: {
      sortBinding: undefined,
    },
    expected: {
      error: true,
      stackToInclude: 'sortBinding is required to determine sort type',
    },
  },
  {
    name: 'Empty object sortBinding',
    input: {
      sortBinding: {},
    },
    expected: {
      error: false,
      sortType: 'nonSemantic',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return SCP.getSortTypeFromSortBinding(scenario.input.sortBinding);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (
    scenarioResults.actualValue &&
    scenarioResults.applyErrorNotExpectedAssertions
  ) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.sortType,
        scenarioResults.actualValue,
        `getSortTypeFromSortBinding should return ${scenario.expected.sortType} for scenario: ${scenario.name}`,
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
