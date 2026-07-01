import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { calculateFacets } from '/lib/search/engine.mjs';
import { FacetRequests } from '/lib/search/FacetRequests.mjs';
import { FACET_ITEM_URI } from '/test/unitTestConstants.mjs';

const LIB = '0820 calculateFacets-semanticFacet.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const UNIT_IRI = 'https://lux.collections.yale.edu/data/group/test-facet-unit';

const seedExists = fn.docAvailable(FACET_ITEM_URI);
if (!seedExists) {
  assertions.push(
    testHelperProxy.assertTrue(
      fn.false(),
      `${LIB}: seed document '${FACET_ITEM_URI}' does not exist; skipping.`,
    ),
  );
} else {
  const scenarios = [
    {
      name: 'responsibleUnits returns unit IRI as facet value',
      input: {
        rows: [{ id: FACET_ITEM_URI }],
        facetName: 'responsibleUnits',
      },
      expected: {
        error: false,
        totalItems: 1,
        firstValue: UNIT_IRI,
        firstCount: 1,
      },
    },
  ];

  for (const scenario of scenarios) {
    const zeroArityFun = () => {
      const facetRequests = new FacetRequests(1, 20);
      facetRequests.addFacetRequest('item', scenario.input.facetName);
      return calculateFacets(scenario.input.rows, facetRequests);
    };

    const scenarioResults = executeScenario(scenario, zeroArityFun);

    if (scenarioResults.applyErrorNotExpectedAssertions) {
      const facetResponses = scenarioResults.actualValue;
      const facet = facetResponses.getFacet(scenario.input.facetName);

      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.totalItems,
          facet.totalItems,
          `${scenario.name}: totalItems`,
        ),
      );

      assertions.push(
        testHelperProxy.assertTrue(
          facet.facetValues.length >= 1,
          `${scenario.name}: expected at least one facet value`,
        ),
      );

      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.firstValue,
          facet.facetValues[0].value,
          `${scenario.name}: facet value should be the unit IRI, not undefined`,
        ),
      );

      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.firstCount,
          facet.facetValues[0].count,
          `${scenario.name}: count`,
        ),
      );
    }

    assertions = assertions.concat(scenarioResults.assertions);
  }
}

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
export default assertions;
