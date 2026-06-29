/**
 * Test suite for SCP.processNestedCriteria() — column namespacing.
 *
 * processNestedCriteria uses `parentId` to namespace all columns in the
 * sub-plan (e.g., `parentId_iri`, `parentId_frag`). This prevents column
 * collisions when multiple sub-plans are joined into a parent plan.
 *
 * Verifies:
 *   - Returned plan contains parentId-prefixed column names.
 *   - Root-level column names ('iri', 'frag', 'uri', 'dataType') are absent.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0902 processNestedCriteria-columnNamespacing.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const PARENT_ID = 'myParent123';
const MOCK_PERSON_IRI =
  'https://lux.collections.yale.edu/data/person/e17df9e9-7254-409f-98c3-7c2fb3e73cd1';

const scenarios = [
  {
    name: 'Columns are prefixed with parentId',
    input: {
      scopeName: 'agent',
      planCriteria: { text: 'Picasso' },
      parentId: PARENT_ID,
    },
    expected: {
      error: false,
      planContains: [`${PARENT_ID}_iri`, `${PARENT_ID}_frag`],
      // Root-level names must not appear as standalone column references.
      // op.col('iri') or op.col('frag') without prefix would collide.
      planExcludes: ["op.col('iri')", "op.col('frag')", "op.col('uri')"],
    },
  },
  {
    name: 'Different parentId produces different column names',
    input: {
      scopeName: 'item',
      planCriteria: {
        producedBy: { id: MOCK_PERSON_IRI },
      },
      parentId: 'otherParent456',
    },
    expected: {
      error: false,
      planContains: ['otherParent456_iri', 'otherParent456_frag'],
      planExcludes: [`${PARENT_ID}_iri`, `${PARENT_ID}_frag`],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();
    scp.prepare({
      searchCriteria: scenario.input.planCriteria,
      scopeName: scenario.input.scopeName,
    });
    const plan = scp.processNestedCriteria({
      planCriteria: scenario.input.planCriteria,
      planScope: scenario.input.scopeName,
      patternOptions: scp.getPatternOptions(),
      parentId: scenario.input.parentId,
    });
    return op.toSource(plan.export());
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const planSource = scenarioResults.actualValue;
    const e = scenario.expected;
    const name = scenario.name;

    if (e.planContains) {
      for (const text of e.planContains) {
        assertions.push(
          testHelperProxy.assertTrue(
            typeof planSource === 'string' && planSource.includes(text),
            `${name}: plan should contain '${text}'`,
          ),
        );
      }
    }

    if (e.planExcludes) {
      for (const text of e.planExcludes) {
        assertions.push(
          testHelperProxy.assertFalse(
            typeof planSource === 'string' && planSource.includes(text),
            `${name}: plan should NOT contain '${text}'`,
          ),
        );
      }
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
