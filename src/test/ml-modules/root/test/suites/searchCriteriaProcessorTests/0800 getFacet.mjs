import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { FacetRequests } from '/lib/search/FacetRequests.mjs';
import { ML_APP_NAME } from '/lib/appConstants.mjs';

const LIB = '0800 getFacetTests.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'itemDimensionValue facet for name=table: totalItems',
    input: {
      searchCriteria: { _scope: 'item', name: 'table' },
      facetName: 'itemDimensionValue',
      page: 1,
      pageLength: 20,
      sort: 'count',
    },
    expected: {
      error: false,
      totalItems: 888,
    },
  },
  {
    name: 'itemDimensionValue facet for name=table: page 1 returns pageLength items',
    input: {
      searchCriteria: { _scope: 'item', name: 'table' },
      facetName: 'itemDimensionValue',
      page: 1,
      pageLength: 20,
      sort: 'count',
    },
    expected: {
      error: false,
      facetValuesLength: 20,
    },
  },
  {
    name: 'itemDimensionValue facet for name=table: values sorted descending by count',
    input: {
      searchCriteria: { _scope: 'item', name: 'table' },
      facetName: 'itemDimensionValue',
      page: 1,
      pageLength: 20,
      sort: 'count',
    },
    expected: {
      error: false,
      sortedDescendingByCount: true,
    },
  },
  {
    name: 'itemDimensionValue facet for name=table: each value has count and value properties',
    input: {
      searchCriteria: { _scope: 'item', name: 'table' },
      facetName: 'itemDimensionValue',
      page: 1,
      pageLength: 20,
      sort: 'count',
    },
    expected: {
      error: false,
      allItemsHaveShape: true,
    },
  },
  {
    name: 'itemDimensionValue facet for name=table: top value has count 23',
    input: {
      searchCriteria: { _scope: 'item', name: 'table' },
      facetName: 'itemDimensionValue',
      page: 1,
      pageLength: 20,
      sort: 'count',
    },
    expected: {
      error: false,
      firstItemCount: 23,
    },
  },
  {
    name: 'itemDimensionValue facet for name=table: smaller page size',
    input: {
      searchCriteria: { _scope: 'item', name: 'table' },
      facetName: 'itemDimensionValue',
      page: 1,
      pageLength: 5,
      sort: 'count',
    },
    expected: {
      error: false,
      totalItems: 888,
      facetValuesLength: 5,
    },
  },
  {
    name: 'itemDimensionValue facet for name=table: page 2',
    input: {
      searchCriteria: { _scope: 'item', name: 'table' },
      facetName: 'itemDimensionValue',
      page: 2,
      pageLength: 20,
      sort: 'count',
    },
    expected: {
      error: false,
      totalItems: 888,
      facetValuesLength: 20,
    },
  },
];

const failures = [];

const adjustedTenantName = ML_APP_NAME === 'luxCTS' ? 'lux' : ML_APP_NAME;
const invokeFunOptions = {
  database: xdmp.database(`${adjustedTenantName}-content`),
};

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const facetRequests = new FacetRequests(
      scenario.input.page,
      scenario.input.pageLength,
    );
    facetRequests.addFacetRequest(
      scenario.input.facetName,
      scenario.input.sort,
    );

    const processor = new SearchCriteriaProcessor(false);
    const searchExecutionResult = processor
      .prepare({
        searchCriteria: scenario.input.searchCriteria,
        scopeName: null,
        allowMultiScope: false,
        filterResults: false,
      })
      .execute(facetRequests);

    return searchExecutionResult.getFacet(scenario.input.facetName);
  };

  const scenarioResults = executeScenario(
    scenario,
    zeroArityFun,
    invokeFunOptions,
  );

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const { facetValues, totalItems } = scenarioResults.actualValue;

    if (scenario.expected.totalItems !== undefined) {
      if (totalItems !== scenario.expected.totalItems) {
        failures.push({
          name: scenario.name,
          detail: `totalItems: expected ${scenario.expected.totalItems}, got ${totalItems}`,
        });
      }
    }

    if (scenario.expected.facetValuesLength !== undefined) {
      const actualLength = facetValues ? facetValues.length : 0;
      if (actualLength !== scenario.expected.facetValuesLength) {
        failures.push({
          name: scenario.name,
          detail: `facetValues.length: expected ${scenario.expected.facetValuesLength}, got ${actualLength}`,
        });
      }
    }

    if (scenario.expected.firstItemCount !== undefined) {
      const actualCount =
        facetValues && facetValues.length > 0 ? facetValues[0].count : null;
      if (actualCount !== scenario.expected.firstItemCount) {
        failures.push({
          name: scenario.name,
          detail: `first item count: expected ${scenario.expected.firstItemCount}, got ${actualCount}`,
        });
      }
    }

    if (scenario.expected.sortedDescendingByCount) {
      if (facetValues && facetValues.length > 1) {
        for (let i = 1; i < facetValues.length; i++) {
          if (facetValues[i].count > facetValues[i - 1].count) {
            failures.push({
              name: scenario.name,
              detail: `facet values not sorted descending by count at index ${i}: ${facetValues[i - 1].count} < ${facetValues[i].count}`,
            });
            break;
          }
        }
      }
    }

    if (scenario.expected.allItemsHaveShape) {
      if (!facetValues || facetValues.length === 0) {
        failures.push({
          name: scenario.name,
          detail: 'facetValues is empty or null',
        });
      } else {
        for (let i = 0; i < facetValues.length; i++) {
          const item = facetValues[i];
          if (
            typeof item.count !== 'number' ||
            item.value === undefined ||
            item.value === null
          ) {
            failures.push({
              name: scenario.name,
              detail: `facet value at index ${i} missing count (number) or value: ${JSON.stringify(item)}`,
            });
            break;
          }
        }
      }
    }
  } else if (
    scenario.expected.error !== true &&
    scenarioResults.assertions.length > 0
  ) {
    failures.push({
      name: scenario.name,
      detail: `ERROR: ${scenarioResults.assertions.map((a) => a.toString()).join('; ')}`,
    });
  }
}

if (failures.length > 0) {
  const details = failures.map((f) => `  '${f.name}': ${f.detail}`).join('\n');
  assertions.push(
    testHelperProxy.assertTrue(
      false,
      `${failures.length} of ${scenarios.length} scenario(s) failed:\n${details}`,
    ),
  );
} else {
  scenarios.forEach((scenario) => {
    assertions.push(testHelperProxy.success());
  });
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
