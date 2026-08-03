import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { FacetRequests } from '/lib/search/FacetRequests.mjs';
import { FACETS_CONFIG } from '/config/facetsConfig.mjs';
import { SEMANTIC_FACETS_CONFIG } from '/config/semanticFacetsConfig.mjs';
import { getSearchScopeNames } from '/lib/searchScope.mjs';

const LIB = '0800 addFacetRequest.mjs';
console.log(`${LIB}: starting.`);

const SCOPES = getSearchScopeNames();

function getScopeFromFacetName(facetName) {
  return SCOPES.find((s) => facetName.startsWith(s));
}

function getWrongScope(correctScope) {
  return SCOPES.find((s) => s !== correctScope);
}

const scenarios = [];

// Non-semantic facets: correct scope accepts, wrong scope rejects.
for (const facetName of Object.keys(FACETS_CONFIG)) {
  const correctScope = getScopeFromFacetName(facetName);
  const wrongScope = getWrongScope(correctScope);

  scenarios.push({
    name: `${facetName}: accepted with correct scope '${correctScope}'`,
    input: { scopeName: correctScope, facetName },
    expected: { error: false, value: 1 },
  });

  scenarios.push({
    name: `${facetName}: rejected with wrong scope '${wrongScope}'`,
    input: { scopeName: wrongScope, facetName },
    expected: {
      error: true,
      stackToInclude: `is not defined in the '${wrongScope}' search scope`,
    },
  });
}

// Semantic facets: correct scope accepts, wrong scope rejects.
for (const [facetName, config] of Object.entries(SEMANTIC_FACETS_CONFIG)) {
  const correctScope = config.scope;
  const wrongScope = getWrongScope(correctScope);

  scenarios.push({
    name: `${facetName}: accepted with correct scope '${correctScope}'`,
    input: { scopeName: correctScope, facetName },
    expected: { error: false, value: 1 },
  });

  scenarios.push({
    name: `${facetName}: rejected with wrong scope '${wrongScope}'`,
    input: { scopeName: wrongScope, facetName },
    expected: {
      error: true,
      stackToInclude: `is not defined in the '${wrongScope}' search scope`,
    },
  });
}

// Unknown facet names.
for (const unknownName of [
  'notARealFacet',
  'itemDimensionValueTypo_',
  'responsibleCollectionsX',
]) {
  scenarios.push({
    name: `'${unknownName}': rejected as unknown`,
    input: { scopeName: 'item', facetName: unknownName },
    expected: {
      error: true,
      stackToInclude: 'is not a configured facet',
    },
  });
}

let assertions = [];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const facetRequests = new FacetRequests(1, 20);
    facetRequests.addFacetRequest(
      scenario.input.scopeName,
      scenario.input.facetName,
    );
    return facetRequests.length;
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value,
        scenarioResults.actualValue,
        `Scenario '${scenario.name}' did not return the expected value.`,
      ),
    );
  }

  assertions = assertions.concat(scenarioResults.assertions);
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
