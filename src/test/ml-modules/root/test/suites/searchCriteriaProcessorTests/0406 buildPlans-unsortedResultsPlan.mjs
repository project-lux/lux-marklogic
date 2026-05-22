/**
 * Test suite for the unsorted result plan returned by SCP.buildPlans().
 *
 * Verifies that sort-specific artifacts never leak into the unsorted plan,
 * regardless of which sort criteria are provided. The unsorted plan is used
 * by facets and should be free of sort-branch side effects.
 *
 * Sort-only markers that must never appear in the unsorted plan:
 *   - randomSortCol  — random sort column (from .bind in random branch)
 *   - sortByMe       — semantic sort column (from applySemanticSort)
 *   - orderBy        — sort ordering (never applied to unsorted plan)
 *   - sort_          — non-semantic sort column prefix (e.g. sort_agentActiveStartDateLong)
 *
 * Additionally verifies that unsorted plans are consistent across sort
 * criteria that share the same areScoresRequired() value:
 *   - Group A (areScoresRequired = true): empty, 'relevance', non-semantic sorts
 *   - Group B (areScoresRequired = false): 'random', semantic sorts
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0406 buildPlans-unsortedResultsPlan.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Keyword search produces CTS constraints — exercises the areScoresRequired path.
const TEXT_CRITERIA = { _scope: 'agent', text: 'Pablo' };

// Markers that are exclusively produced by sort branches and must never
// appear in the unsorted plan.
const SORT_ONLY_MARKERS = ['randomSortCol', 'sortByMe', 'orderBy', 'sort_'];

// Each scenario exercises a different sort branch while capturing the
// unsorted plan for marker and consistency assertions.
//
// consistencyGroup groups scenarios that should produce identical unsorted
// plans (same areScoresRequired value with the same search criteria).
const scenarios = [
  // --- Group A: areScoresRequired() = true ---
  {
    name: 'No sort string (default relevance)',
    input: { sortDelimitedStr: '' },
    expected: { error: false },
    consistencyGroup: 'A',
  },
  {
    name: 'Explicit relevance',
    input: { sortDelimitedStr: 'relevance' },
    expected: { error: false },
    consistencyGroup: 'A',
  },
  {
    name: 'Single non-semantic sort',
    input: { sortDelimitedStr: 'agentActiveDate' },
    expected: { error: false },
    consistencyGroup: 'A',
  },
  {
    name: 'Multiple non-semantic sorts',
    input: { sortDelimitedStr: 'agentActiveDate,agentEndDate' },
    expected: { error: false },
    consistencyGroup: 'A',
  },
  {
    name: 'Non-semantic descending',
    input: { sortDelimitedStr: 'agentActiveDate:desc' },
    expected: { error: false },
    consistencyGroup: 'A',
  },

  // --- Group B: areScoresRequired() = false ---
  {
    name: 'Random sort',
    input: { sortDelimitedStr: 'random' },
    expected: { error: false },
    consistencyGroup: 'B',
  },
  {
    name: 'Random after non-semantic',
    input: { sortDelimitedStr: 'agentActiveDate,random' },
    expected: { error: false },
    consistencyGroup: 'B',
  },
  {
    name: 'Semantic sort',
    input: { sortDelimitedStr: 'agentClassificationConceptName' },
    expected: { error: false },
    consistencyGroup: 'B',
  },
  {
    name: 'Semantic after non-semantic',
    input: {
      sortDelimitedStr: 'agentActiveDate,agentClassificationConceptName',
    },
    expected: { error: false },
    consistencyGroup: 'B',
  },
];

// Collect unsorted plan sources by consistency group for cross-scenario comparison.
const unsortedByGroup = {};

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();
    scp.prepare({
      searchCriteria: TEXT_CRITERIA,
      scopeName: 'agent',
      sortDelimitedStr: scenario.input.sortDelimitedStr,
    });
    const { unsortedResultsPlan } = scp.buildPlans();
    return op.toSource(unsortedResultsPlan.export());
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const unsortedSource = scenarioResults.actualValue;
    const p = scenario.name;

    // Assert no sort-only markers appear in the unsorted plan.
    for (const marker of SORT_ONLY_MARKERS) {
      assertions.push(
        testHelperProxy.assertFalse(
          typeof unsortedSource === 'string' && unsortedSource.includes(marker),
          `${p}: unsorted plan should NOT contain '${marker}'`,
        ),
      );
    }

    // Store for cross-scenario consistency check.
    const group = scenario.consistencyGroup;
    if (!unsortedByGroup[group]) {
      unsortedByGroup[group] = { source: unsortedSource, name: p };
    } else {
      assertions.push(
        testHelperProxy.assertEqual(
          unsortedByGroup[group].source,
          unsortedSource,
          `${p}: unsorted plan should match '${unsortedByGroup[group].name}' (same areScoresRequired group)`,
        ),
      );
    }
  }

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }
}

// Verify the two groups actually differ (fromSearch presence should differ).
if (unsortedByGroup['A'] && unsortedByGroup['B']) {
  assertions.push(
    testHelperProxy.assertNotEqual(
      unsortedByGroup['A'].source,
      unsortedByGroup['B'].source,
      'Group A (areScoresRequired=true) and Group B (areScoresRequired=false) unsorted plans should differ',
    ),
  );
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
