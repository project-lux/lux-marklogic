import op from '/MarkLogic/optic.mjs';
import { testHelperProxy } from '/test/test-helper.mjs';
import { SEMANTIC_FACETS_CONFIG } from '/config/semanticFacetsConfig.mjs';
import { isNonEmptyString } from '/utils/utils.mjs';

const LIB = '0810 semanticFacetsConfig-validation.mjs';
console.log(`${LIB}: starting.`);

// Validates every semantic facet config entry has the properties that
// calculateFacets depends on: facetValueColName (used as the groupBy column
// and to read values from result rows), constraintJoinColName (count target),
// sourceJoinColName (join key), scope, plan, and getFacetSelectedCriteria.
const REQUIRED_STRING_PROPS = [
  'facetValueColName',
  'constraintJoinColName',
  'sourceJoinColName',
  'scope',
];

const assertions = [];
const entries = Object.entries(SEMANTIC_FACETS_CONFIG);

// Guard: at least one semantic facet is configured.
assertions.push(
  testHelperProxy.assertTrue(
    entries.length > 0,
    'SEMANTIC_FACETS_CONFIG should have at least one entry.',
  ),
);

for (const [facetName, config] of entries) {
  // Required string properties.
  for (const prop of REQUIRED_STRING_PROPS) {
    assertions.push(
      testHelperProxy.assertTrue(
        isNonEmptyString(config[prop]),
        `'${facetName}.${prop}' must be a non-empty string; got '${config[prop]}'.`,
      ),
    );
  }

  // facetValueColName must differ from constraintJoinColName — they are
  // the groupBy column and the count column respectively. If equal, the
  // groupBy would count against itself.
  assertions.push(
    testHelperProxy.assertNotEqual(
      config.facetValueColName,
      config.constraintJoinColName,
      `'${facetName}': facetValueColName and constraintJoinColName must differ.`,
    ),
  );

  // plan must be an Optic plan (has .result and .export).
  const plan = config.plan;
  assertions.push(
    testHelperProxy.assertTrue(
      typeof plan?.result === 'function' && typeof plan?.export === 'function',
      `'${facetName}.plan' must be an Optic plan with .result() and .export().`,
    ),
  );

  // getFacetSelectedCriteria must be a function.
  assertions.push(
    testHelperProxy.assertTrue(
      typeof config.getFacetSelectedCriteria === 'function',
      `'${facetName}.getFacetSelectedCriteria' must be a function.`,
    ),
  );

  // The plan must include the facetValueColName column. We can verify this
  // from the exported plan JSON without executing against the database.
  const planSource = op.toSource(plan.export()).replace(/\n\s*/g, ' ');
  assertions.push(
    testHelperProxy.assertTrue(
      planSource.includes(config.facetValueColName),
      `'${facetName}' plan source must reference the facetValueColName '${config.facetValueColName}'.`,
    ),
  );

  // The plan must include the constraintJoinColName column.
  assertions.push(
    testHelperProxy.assertTrue(
      planSource.includes(config.constraintJoinColName),
      `'${facetName}' plan source must reference the constraintJoinColName '${config.constraintJoinColName}'.`,
    ),
  );
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${entries.length} semantic facet configs.`,
);

const results = assertions;
export default results;
