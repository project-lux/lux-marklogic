/**
 * Tests HopInverse.apply() Opt 24 CTS fast path.
 *
 * When inner criteria resolves to pure CTS (processNestedCriteriaAsCts
 * returns non-null), HopInverse applies .where(innerCts) directly on
 * fromTriples instead of building a fromLexicons plan and fragment-joining.
 *
 * Does not execute searches against the content database.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchPatternBase } from '/lib/search/patterns/SearchPatternBase.mjs';
import { PatternOptions } from '/lib/search/PatternOptions.mjs';
import '/lib/search/patterns/HopInverse.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '1030 HopInverse-ctsFastPath.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const pattern = SearchPatternBase.get('hopInverse');

const MOCK_PREDICATES = ['la:member_of'];
const MOCK_TARGET_SCOPE = 'item';
const MOCK_ID = 'containingItem';
const MOCK_PARENT_IRI_COL = 'set_iri';
const MOCK_CRITERIA = {
  id: 'https://lux.collections.yale.edu/data/object/mock-id',
};
const MOCK_CTS_QUERY = cts.documentQuery(MOCK_CRITERIA.id);

function mockSearchTerm() {
  return {
    getId: () => MOCK_ID,
    getParentIriColumn: () => MOCK_PARENT_IRI_COL,
    getCriteria: () => MOCK_CRITERIA,
    isTopLevel: () => false,
    getSearchTermConfig: () => ({
      getPredicates: () => MOCK_PREDICATES,
      getTargetScopeName: () => MOCK_TARGET_SCOPE,
      isTransitive: () => false,
    }),
  };
}

function mockPatternOptions() {
  return new PatternOptions();
}

// SCP mock where processNestedCriteriaAsCts returns a CTS query (fast path).
function mockScpWithCts() {
  return {
    processNestedCriteriaAsCts: () => MOCK_CTS_QUERY,
    processNestedCriteria: () => {
      throw new Error(
        'processNestedCriteria should not be called on CTS fast path',
      );
    },
  };
}

// SCP mock where processNestedCriteriaAsCts returns null (fallback path).
function mockScpFallback() {
  // processNestedCriteria returns a minimal plan with iri + frag columns.
  const nestedPlan = op
    .fromLexicons(
      { [MOCK_ID + '_iri']: cts.iriReference() },
      null,
      op.fragmentIdCol(MOCK_ID + '_frag'),
    )
    .select([MOCK_ID + '_iri', MOCK_ID + '_frag']);
  return {
    processNestedCriteriaAsCts: () => null,
    processNestedCriteria: () => nestedPlan,
  };
}

const scenarios = [
  // --- CTS fast path (Opt 24) ---
  {
    name: 'CTS fast path: plan uses fromTriples with .where(), no fromLexicons',
    input: { scp: mockScpWithCts() },
    expected: {
      error: false,
      hasPatternJoins: true,
      planContains: ['fromTriples', 'member_of', 'documentQuery'],
      planExcludes: ['fromLexicons'],
    },
  },
  {
    name: 'CTS fast path: no fragment join columns in the plan',
    input: { scp: mockScpWithCts() },
    expected: {
      error: false,
      hasPatternJoins: true,
      // Fragment join uses on(triFrag, refFrag) — with CTS fast path,
      // neither column name pattern should appear in a join context.
      planExcludes: ['fromLexicons', MOCK_ID + '_frag'],
    },
  },
  {
    name: 'CTS fast path: outer join key uses parent IRI and triple object',
    input: { scp: mockScpWithCts() },
    expected: {
      error: false,
      hasPatternJoins: true,
      joinOnContains: [MOCK_PARENT_IRI_COL, MOCK_ID + '_o'],
    },
  },

  // --- Fallback path (processNestedCriteriaAsCts returns null) ---
  {
    name: 'Fallback: plan uses fromTriples joined to fromLexicons via fragment',
    input: { scp: mockScpFallback() },
    expected: {
      error: false,
      hasPatternJoins: true,
      planContains: ['fromTriples', 'fromLexicons', 'member_of'],
      planExcludes: ['documentQuery'],
    },
  },
  {
    name: 'Fallback: plan includes fragment join columns',
    input: { scp: mockScpFallback() },
    expected: {
      error: false,
      hasPatternJoins: true,
      planContains: [MOCK_ID + '_triFrag', MOCK_ID + '_frag'],
    },
  },
  {
    name: 'Fallback: outer join key unchanged from CTS path',
    input: { scp: mockScpFallback() },
    expected: {
      error: false,
      hasPatternJoins: true,
      joinOnContains: [MOCK_PARENT_IRI_COL, MOCK_ID + '_o'],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return pattern.apply(
      scenario.input.scp,
      mockSearchTerm(),
      'and',
      mockPatternOptions(),
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const result = scenarioResults.actualValue;
    const e = scenario.expected;
    const p = scenario.name;

    if (e.hasPatternJoins) {
      assertions.push(
        testHelperProxy.assertTrue(
          result &&
            Array.isArray(result.patternJoins) &&
            result.patternJoins.length > 0,
          `${p}: should return patternJoins`,
        ),
      );
    }

    if (result && result.patternJoins && result.patternJoins.length > 0) {
      const pj = result.patternJoins[0];
      const planSource = op.toSource(pj.right.export());

      if (e.planContains) {
        for (const text of e.planContains) {
          assertions.push(
            testHelperProxy.assertTrue(
              typeof planSource === 'string' && planSource.includes(text),
              `${p}: plan should contain '${text}'`,
            ),
          );
        }
      }

      if (e.planExcludes) {
        for (const text of e.planExcludes) {
          assertions.push(
            testHelperProxy.assertFalse(
              typeof planSource === 'string' && planSource.includes(text),
              `${p}: plan should NOT contain '${text}'`,
            ),
          );
        }
      }

      if (e.joinOnContains) {
        const joinOnSource = JSON.stringify(pj.on);
        for (const text of e.joinOnContains) {
          assertions.push(
            testHelperProxy.assertTrue(
              typeof joinOnSource === 'string' && joinOnSource.includes(text),
              `${p}: join on should contain '${text}'`,
            ),
          );
        }
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
