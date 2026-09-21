import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { calculateFacets } from '/lib/search/engine.mjs';
import { FacetRequests } from '/lib/search/FacetRequests.mjs';
import { FACET_ITEM_URI, FACET_SET_URI } from '/test/unitTestConstants.mjs';

const LIB = '0821 calculateFacets-semanticFacetCts.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Path 1 requires: seed item with member_of.id → seed set classified as collection.
// The scopedCtsQuery must match the item so cts.estimate counts it.
const seedItemExists = fn.docAvailable(FACET_ITEM_URI);
const seedSetExists = fn.docAvailable(FACET_SET_URI);

if (!seedItemExists || !seedSetExists) {
  assertions.push(
    testHelperProxy.assertTrue(
      fn.false(),
      `${LIB}: seed documents not available (item: ${seedItemExists}, set: ${seedSetExists}); skipping.`,
    ),
  );
} else {
  // A scopedCtsQuery that matches the seed item document.
  const scopedCtsQuery = cts.andQuery([
    cts.jsonPropertyValueQuery('id', FACET_ITEM_URI, ['exact'], 1),
    cts.fieldValueQuery(
      'anyDataTypeName',
      ['HumanMadeObject', 'DigitalObject'],
      ['exact'],
    ),
  ]);

  const scenarios = [
    {
      name: 'itemResponsibleCollections via CTS path returns set URI as facet value',
      input: {
        facetName: 'itemResponsibleCollections',
        scopedCtsQuery,
      },
      expected: {
        error: false,
        totalItems: 1,
        firstValue: FACET_SET_URI,
        firstCount: 1,
      },
    },
  ];

  for (const scenario of scenarios) {
    const zeroArityFun = () => {
      const facetRequests = new FacetRequests(1, 20);
      facetRequests.addFacetRequest('item', scenario.input.facetName);
      // Path 1: rows=null, scopedCtsQuery provided → CTS enumerate + estimate.
      return calculateFacets(
        null,
        facetRequests,
        scenario.input.scopedCtsQuery,
      );
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
          `${scenario.name}: facet value should be the set URI`,
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
