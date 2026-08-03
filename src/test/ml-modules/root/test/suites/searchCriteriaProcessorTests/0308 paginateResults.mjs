/**
 * Test suite for paginateResults - Pagination logic including pageWith.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import {
  paginateResults,
  MAXIMUM_PAGE_WITH_LENGTH,
} from '/lib/search/engine.mjs';

const LIB = '0308 paginateResults.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Helper to build rows with sequential IDs.
function buildRows(count) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push({ id: `/doc/${i}.json`, type: 'item' });
  }
  return rows;
}

const scenarios = [
  {
    name: 'Normal pagination - page 1',
    input: {
      rows: buildRows(60),
      pageWith: null,
      page: 1,
      pageLength: 20,
    },
    expected: {
      error: false,
      value: {
        resultPage: 1,
        firstId: '/doc/1.json',
        lastId: '/doc/20.json',
        resultCount: 20,
      },
    },
  },
  {
    name: 'Normal pagination - page 3',
    input: {
      rows: buildRows(60),
      pageWith: null,
      page: 3,
      pageLength: 20,
    },
    expected: {
      error: false,
      value: {
        resultPage: 3,
        firstId: '/doc/41.json',
        lastId: '/doc/60.json',
        resultCount: 20,
      },
    },
  },
  {
    name: 'Normal pagination - partial last page',
    input: {
      rows: buildRows(50),
      pageWith: null,
      page: 3,
      pageLength: 20,
    },
    expected: {
      error: false,
      value: {
        resultPage: 3,
        firstId: '/doc/41.json',
        lastId: '/doc/50.json',
        resultCount: 10,
      },
    },
  },
  {
    name: 'pageWith - target on page 1',
    input: {
      rows: buildRows(60),
      pageWith: '/doc/15.json',
      page: 1,
      pageLength: 20,
    },
    expected: {
      error: false,
      value: {
        resultPage: 1,
        firstId: '/doc/1.json',
        lastId: '/doc/20.json',
        resultCount: 20,
      },
    },
  },
  {
    name: 'pageWith - target on page 3 (position 53)',
    input: {
      rows: buildRows(60),
      pageWith: '/doc/53.json',
      page: 1,
      pageLength: 20,
    },
    expected: {
      error: false,
      value: {
        resultPage: 3,
        firstId: '/doc/41.json',
        lastId: '/doc/60.json',
        resultCount: 20,
      },
    },
  },
  {
    name: 'pageWith - target at exact page boundary (position 20)',
    input: {
      rows: buildRows(60),
      pageWith: '/doc/20.json',
      page: 1,
      pageLength: 20,
    },
    expected: {
      error: false,
      value: {
        resultPage: 1,
        firstId: '/doc/1.json',
        lastId: '/doc/20.json',
        resultCount: 20,
      },
    },
  },
  {
    name: 'pageWith - target at position 21 lands on page 2',
    input: {
      rows: buildRows(60),
      pageWith: '/doc/21.json',
      page: 1,
      pageLength: 20,
    },
    expected: {
      error: false,
      value: {
        resultPage: 2,
        firstId: '/doc/21.json',
        lastId: '/doc/40.json',
        resultCount: 20,
      },
    },
  },
  {
    name: 'pageWith - target not found throws',
    input: {
      rows: buildRows(60),
      pageWith: '/doc/999.json',
      page: 1,
      pageLength: 20,
    },
    expected: {
      error: true,
      stackToInclude: 'could not be found in the search results',
    },
  },
  {
    name: 'pageWith - exceeds maximum result limit throws',
    input: {
      rows: buildRows(MAXIMUM_PAGE_WITH_LENGTH + 1),
      pageWith: '/doc/1.json',
      page: 1,
      pageLength: 20,
    },
    expected: {
      error: true,
      stackToInclude: `first ${MAXIMUM_PAGE_WITH_LENGTH} results`,
    },
  },
  {
    name: 'Normal pagination - page defaults to 1 when 0',
    input: {
      rows: buildRows(40),
      pageWith: null,
      page: 0,
      pageLength: 20,
    },
    expected: {
      error: false,
      value: {
        resultPage: 1,
        firstId: '/doc/1.json',
        lastId: '/doc/20.json',
        resultCount: 20,
      },
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return paginateResults(scenario.input);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorExpectedAssertions) {
    if (scenario.expected.stackToInclude) {
      assertions.push(
        testHelperProxy.assertTrue(
          scenarioResults.error.stack.includes(
            scenario.expected.stackToInclude,
          ),
          `Scenario '${scenario.name}' should include error message: ${scenario.expected.stackToInclude}. Actual error: ${scenarioResults.error.stack}`,
        ),
      );
    }
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const actual = scenarioResults.actualValue;
    const expected = scenario.expected.value;

    assertions.push(
      testHelperProxy.assertEqual(
        expected.resultPage,
        actual.resultPage,
        `Scenario '${scenario.name}' resultPage`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        expected.resultCount,
        actual.searchResults.length,
        `Scenario '${scenario.name}' result count`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        expected.firstId,
        actual.searchResults[0].id,
        `Scenario '${scenario.name}' first result id`,
      ),
    );
    assertions.push(
      testHelperProxy.assertEqual(
        expected.lastId,
        actual.searchResults[actual.searchResults.length - 1].id,
        `Scenario '${scenario.name}' last result id`,
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
