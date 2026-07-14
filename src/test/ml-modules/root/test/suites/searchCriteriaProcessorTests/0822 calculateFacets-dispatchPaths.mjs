import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { calculateFacets } from '/lib/search/engine.mjs';
import { FacetRequests } from '/lib/search/FacetRequests.mjs';

const LIB = '0822 calculateFacets-dispatchPaths.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

function extractDispatchResult(result, facetName) {
  const isFacetResponses =
    result &&
    typeof result.getFacet === 'function' &&
    typeof result.getFacets === 'function';

  if (isFacetResponses) {
    const facets = result.getFacets() ?? {};
    const dispatchCounts = {
      semanticFacetViaCts: 0,
      nonSemanticFacetViaCts: 0,
      facetViaOptic: 0,
    };
    Object.values(facets).forEach((value) => {
      if (value === 'semanticFacetViaCts') {
        dispatchCounts.semanticFacetViaCts += 1;
      } else if (value === 'nonSemanticFacetViaCts') {
        dispatchCounts.nonSemanticFacetViaCts += 1;
      } else if (value === 'facetViaOptic') {
        dispatchCounts.facetViaOptic += 1;
      }
    });

    return {
      isFacetResponses: true,
      dispatchCounts,
    };
  }

  return {
    isFacetResponses: false,
    dispatchCounts: {
      semanticFacetViaCts: 0,
      nonSemanticFacetViaCts: 0,
      facetViaOptic: 0,
    },
  };
}

const scenarios = [
  {
    name: 'Path 1: semantic facet with scopedCtsQuery uses semanticFacetViaCts',
    input: {
      rows: [{ id: '/test/doc/1' }],
      facetName: 'responsibleCollections',
      facetRequests: new FacetRequests(1, 20).addFacetRequest(
        'item',
        'responsibleCollections',
      ),
      scopedCtsQuery: cts.trueQuery(),
    },
    expected: {
      error: false,
      value: {
        semanticFacetViaCts: 1,
        nonSemanticFacetViaCts: 0,
        facetViaOptic: 0,
      },
    },
  },
  {
    name: 'Path 2: non-semantic facet with scopedCtsQuery uses nonSemanticFacetViaCts',
    input: {
      rows: [{ id: '/test/doc/1' }],
      facetName: 'itemRecordType',
      facetRequests: new FacetRequests(1, 20).addFacetRequest(
        'item',
        'itemRecordType',
      ),
      scopedCtsQuery: cts.trueQuery(),
    },
    expected: {
      error: false,
      value: {
        semanticFacetViaCts: 0,
        nonSemanticFacetViaCts: 1,
        facetViaOptic: 0,
      },
    },
  },
  {
    name: 'Path 3: no scopedCtsQuery uses facetViaOptic',
    input: {
      rows: [{ id: '/test/doc/1' }],
      facetName: 'itemRecordType',
      facetRequests: new FacetRequests(1, 20).addFacetRequest(
        'item',
        'itemRecordType',
      ),
      scopedCtsQuery: null,
    },
    expected: {
      error: false,
      value: {
        semanticFacetViaCts: 0,
        nonSemanticFacetViaCts: 0,
        facetViaOptic: 1,
      },
    },
  },
  {
    name: 'No scopedCtsQuery + empty rows returns empty facet response and no dispatch call',
    input: {
      rows: [],
      facetName: 'itemRecordType',
      facetRequests: new FacetRequests(1, 20).addFacetRequest(
        'item',
        'itemRecordType',
      ),
      scopedCtsQuery: null,
    },
    expected: {
      error: false,
      value: {
        semanticFacetViaCts: 0,
        nonSemanticFacetViaCts: 0,
        facetViaOptic: 0,
      },
    },
  },
  {
    name: 'Single request with mixed facets yields semantic=2 and nonSemantic=2',
    input: {
      rows: [{ id: '/test/doc/1' }],
      facetName: 'responsibleCollections',
      facetRequests: new FacetRequests(1, 20)
        .addFacetRequest('item', 'responsibleCollections')
        .addFacetRequest('item', 'responsibleUnits')
        .addFacetRequest('item', 'itemRecordType')
        .addFacetRequest('item', 'itemHasDigitalImage'),
      scopedCtsQuery: cts.trueQuery(),
    },
    expected: {
      error: false,
      value: {
        semanticFacetViaCts: 2,
        nonSemanticFacetViaCts: 2,
        facetViaOptic: 0,
      },
    },
  },
  {
    name: 'Semantic counter is 2 for multi-facet CTS semantic request',
    input: {
      rows: [{ id: '/test/doc/1' }],
      facetName: 'responsibleCollections',
      facetRequests: new FacetRequests(1, 20)
        .addFacetRequest('item', 'responsibleCollections')
        .addFacetRequest('item', 'responsibleUnits'),
      scopedCtsQuery: cts.trueQuery(),
    },
    expected: {
      error: false,
      value: {
        semanticFacetViaCts: 2,
        nonSemanticFacetViaCts: 0,
        facetViaOptic: 0,
      },
    },
  },
  {
    name: 'Non-semantic counter is 2 for multi-facet CTS request',
    input: {
      rows: [{ id: '/test/doc/1' }],
      facetName: 'itemRecordType',
      facetRequests: new FacetRequests(1, 20)
        .addFacetRequest('item', 'itemRecordType')
        .addFacetRequest('item', 'itemHasDigitalImage'),
      scopedCtsQuery: cts.trueQuery(),
    },
    expected: {
      error: false,
      value: {
        semanticFacetViaCts: 0,
        nonSemanticFacetViaCts: 2,
        facetViaOptic: 0,
      },
    },
  },
  {
    name: 'Optic counter is 2 for multi-facet non-CTS request',
    input: {
      rows: [{ id: '/test/doc/1' }],
      facetName: 'itemRecordType',
      facetRequests: new FacetRequests(1, 20)
        .addFacetRequest('item', 'itemRecordType')
        .addFacetRequest('item', 'itemHasDigitalImage'),
      scopedCtsQuery: null,
    },
    expected: {
      error: false,
      value: {
        semanticFacetViaCts: 0,
        nonSemanticFacetViaCts: 0,
        facetViaOptic: 2,
      },
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const dispatchesOrFacetResponses = calculateFacets(
      scenario.input.rows,
      scenario.input.facetRequests,
      scenario.input.scopedCtsQuery,
      null,
      true,
    );

    return extractDispatchResult(
      dispatchesOrFacetResponses,
      scenario.input.facetName,
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const actual = scenarioResults.actualValue;

    assertions.push(
      testHelperProxy.assertTrue(
        actual.isFacetResponses === true,
        `Scenario '${scenario.name}' should return FacetResponses.`,
      ),
    );

    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value.semanticFacetViaCts,
        actual.dispatchCounts.semanticFacetViaCts,
        `Scenario '${scenario.name}' semanticFacetViaCts dispatch count`,
      ),
    );

    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value.nonSemanticFacetViaCts,
        actual.dispatchCounts.nonSemanticFacetViaCts,
        `Scenario '${scenario.name}' nonSemanticFacetViaCts dispatch count`,
      ),
    );

    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value.facetViaOptic,
        actual.dispatchCounts.facetViaOptic,
        `Scenario '${scenario.name}' facetViaOptic dispatch count`,
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
