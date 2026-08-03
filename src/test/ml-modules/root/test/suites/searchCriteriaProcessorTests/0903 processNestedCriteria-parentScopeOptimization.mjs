/**
 * Test suite for SCP.processNestedCriteria() — parentScope / empty-groups.
 *
 * When parentScope === planScope, the dataType constraint (op.in) is skipped
 * because the parent already constrains to the same scope (Opt 3). When
 * parentScope is null or differs from planScope, the constraint must be present
 * to prevent unconstrained lexicon scans that blow memory.
 *
 * Verifies:
 *   - parentScope = null → dataType constraint IS present.
 *   - parentScope differs from planScope → dataType constraint IS present.
 *   - parentScope === planScope → dataType constraint is NOT present.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0903 processNestedCriteria-parentScopeOptimization.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const PARENT_ID = 'test-parent-id';

const scenarios = [
  {
    name: 'parentScope null: dataType constraint present',
    input: {
      scopeName: 'agent',
      planCriteria: { text: 'Picasso' },
      parentId: PARENT_ID,
      parentScope: null,
    },
    expected: {
      error: false,
      // op.in with scope types signals the dataType constraint
      planContains: ['Person', 'Group'],
    },
  },
  {
    name: 'parentScope differs from planScope: dataType constraint present',
    input: {
      scopeName: 'item',
      planCriteria: { text: 'painting' },
      parentId: PARENT_ID,
      parentScope: 'agent',
    },
    expected: {
      error: false,
      planContains: ['HumanMadeObject', 'DigitalObject'],
    },
  },
  {
    name: 'parentScope === planScope: dataType constraint skipped',
    input: {
      scopeName: 'agent',
      planCriteria: { text: 'Picasso' },
      parentId: PARENT_ID,
      parentScope: 'agent',
    },
    expected: {
      error: false,
      // With same-scope parentScope, the op.in constraint is omitted.
      // 'Person' and 'Group' should not appear as constraint values.
      planExcludes: ['Person', 'Group'],
    },
  },
  {
    name: 'parentScope === planScope (item): dataType constraint skipped',
    input: {
      scopeName: 'item',
      planCriteria: { text: 'vase' },
      parentId: PARENT_ID,
      parentScope: 'item',
    },
    expected: {
      error: false,
      planExcludes: ['HumanMadeObject', 'DigitalObject'],
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
      parentScope: scenario.input.parentScope,
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
