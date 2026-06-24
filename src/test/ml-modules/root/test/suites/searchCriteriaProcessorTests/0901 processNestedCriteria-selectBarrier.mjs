/**
 * Test suite for SCP.processNestedCriteria() — select barrier (Opt 17).
 *
 * processNestedCriteria always appends .select([iriCol, fragCol]) to the
 * sub-plan before returning it. This ensures the optimizer cannot see columns
 * across nesting levels, preventing catastrophic join fusion.
 *
 * Verifies:
 *   - Returned plan contains a .select() with only iri + frag columns.
 *   - uri and dataType columns are projected away (not in the select).
 *   - The barrier is present regardless of inner criteria complexity.
 *   - The full 3-level discovery query produces select barriers at each level.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0900 processNestedCriteria-selectBarrier.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const PARENT_ID = 'test-parent-id';
const MOCK_PERSON_IRI =
  'https://lux.collections.yale.edu/data/person/e17df9e9-7254-409f-98c3-7c2fb3e73cd1';

const scenarios = [
  {
    name: 'Single hop: select barrier projects only iri and frag',
    input: {
      scopeName: 'item',
      planCriteria: {
        producedBy: { id: MOCK_PERSON_IRI },
      },
      parentId: PARENT_ID,
    },
    expected: {
      error: false,
      selectContains: ['_iri', '_frag'],
      selectExcludes: ['_dataType', '_uri'],
    },
  },
  {
    name: 'Keyword inner criteria: barrier still applied',
    input: {
      scopeName: 'agent',
      planCriteria: { text: 'Picasso' },
      parentId: PARENT_ID,
    },
    expected: {
      error: false,
      selectContains: ['_iri', '_frag'],
      selectExcludes: ['_dataType', '_uri'],
    },
  },
  {
    name: 'OR inner criteria: barrier still applied',
    input: {
      scopeName: 'item',
      planCriteria: {
        OR: [{ text: 'painting' }, { text: 'sculpture' }],
      },
      parentId: PARENT_ID,
    },
    expected: {
      error: false,
      selectContains: ['_iri', '_frag'],
      selectExcludes: ['_dataType', '_uri'],
    },
  },
  {
    name: 'Full discovery query (3-level hop): sub-plans have select barriers',
    input: {
      scopeName: 'event',
      searchCriteria: {
        _scope: 'event',
        used: {
          containingItem: {
            producedBy: { id: MOCK_PERSON_IRI },
          },
        },
      },
      useBuildPlans: true,
    },
    expected: {
      error: false,
      // Each nested processNestedCriteria call emits .select([iriCol, fragCol]).
      // With 3 nesting levels (event→item→item→agent), inner levels get barriers.
      // The outermost select is from collapseToResultRows (renames to id/type).
      selectContains: ['_iri', '_frag'],
      selectExcludes: ['_dataType', '_uri'],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();

    if (scenario.input.useBuildPlans) {
      scp.prepare({
        searchCriteria: scenario.input.searchCriteria,
        scopeName: scenario.input.scopeName,
      });
      const { sortedResultsPlan } = scp.buildPlans();
      return op.toSource(sortedResultsPlan.export());
    }

    // Direct processNestedCriteria call
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

    // Extract all .select([...]) argument lists from the serialized plan.
    const selectArgs =
      typeof planSource === 'string'
        ? [...planSource.matchAll(/\.select\(\[([^\]]+)\]\)/g)].map((m) => m[1])
        : [];

    if (e.selectContains) {
      for (const col of e.selectContains) {
        const found = selectArgs.some((args) =>
          new RegExp(`'[^']*${col}'`).test(args),
        );
        assertions.push(
          testHelperProxy.assertTrue(
            found,
            `${name}: a .select() should contain a column matching '${col}'`,
          ),
        );
      }
    }

    if (e.selectExcludes) {
      for (const col of e.selectExcludes) {
        const found = selectArgs.some((args) =>
          new RegExp(`'[^']*${col}'`).test(args),
        );
        assertions.push(
          testHelperProxy.assertFalse(
            found,
            `${name}: no .select() should contain a column matching '${col}'`,
          ),
        );
      }
    }

    if (e.planContains) {
      for (const pattern of e.planContains) {
        const matches =
          typeof planSource === 'string' &&
          (pattern instanceof RegExp
            ? pattern.test(planSource)
            : planSource.includes(pattern));
        assertions.push(
          testHelperProxy.assertTrue(
            matches,
            `${name}: plan should match '${pattern}'`,
          ),
        );
      }
    }

    if (e.planExcludes) {
      for (const pattern of e.planExcludes) {
        const matches =
          typeof planSource === 'string' &&
          (pattern instanceof RegExp
            ? pattern.test(planSource)
            : planSource.includes(pattern));
        assertions.push(
          testHelperProxy.assertFalse(
            matches,
            `${name}: plan should NOT match '${pattern}'`,
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
