/**
 * Test suite for getDirectPlan (Opt 20 extension for annTopK).
 *
 * Verifies:
 *   - Returns a plan when the accumulator has a single annTopK patternJoin
 *     with annTopKSelfSufficient=true and no other contributions.
 *   - Returns null when logicType is not 'and'.
 *   - Returns null when multiple patternJoins exist.
 *   - Returns null when ctsConstraints are present.
 *   - Returns null when conjunctionJoins are present.
 *   - Returns null when extra constraints beyond initial exist.
 *   - Returns null when annTopKSelfSufficient is not set.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { getDirectPlan } from '/lib/search/engine.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0606 getDirectPlan.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

// Minimal mock plan that has the columns getDirectPlan expects.
const MOCK_QUALIFIER = 'mock';
const mockDirectPlan = op
  .fromView('lux', 'vectors', MOCK_QUALIFIER, op.fragmentIdCol('mock_vecFrag'))
  .select([
    op.as('uri', op.col('uri')),
    op.as('dataType', op.viewCol(MOCK_QUALIFIER, 'dataType')),
    op.fragmentIdCol('mock_vecFrag'),
    'mock_distance',
  ]);

function makeAcc(overrides = {}) {
  return {
    constraints: [],
    _initialConstraintCount: 0,
    ctsConstraints: [],
    conjunctionJoins: [],
    andOrSubPlans: [],
    patternJoins: [
      {
        right: {},
        on: {},
        extraCols: ['mock_distance'],
        annTopKSelfSufficient: true,
        annTopKPlanForDirect: mockDirectPlan,
        annTopKViewQualifier: MOCK_QUALIFIER,
      },
    ],
    ...overrides,
  };
}

function makeContext(overrides = {}) {
  return {
    logicType: 'and',
    fragCol: 'frag',
    uriCol: 'uri',
    dataTypeCol: 'dataType',
    scope: 'item',
    isTopLevel: true,
    hasScoreContributingCriteria: false,
    ...overrides,
  };
}

const scenarios = [
  // --- Should return a plan ---
  {
    name: 'single annTopK join with selfSufficient flag returns a plan',
    acc: makeAcc(),
    context: makeContext(),
    expected: true,
  },
  {
    name: 'works with initial dataType constraint present',
    acc: makeAcc({
      constraints: ['dataTypeConstraint'],
      _initialConstraintCount: 1,
    }),
    context: makeContext(),
    expected: true,
  },

  // --- Should return null ---
  {
    name: 'logicType OR returns null',
    acc: makeAcc(),
    context: makeContext({ logicType: 'or' }),
    expected: false,
  },
  {
    name: 'logicType NOT returns null',
    acc: makeAcc(),
    context: makeContext({ logicType: 'not' }),
    expected: false,
  },
  {
    name: 'multiple patternJoins returns null',
    acc: makeAcc({
      patternJoins: [
        {
          right: {},
          on: {},
          extraCols: [],
          annTopKSelfSufficient: true,
          annTopKPlanForDirect: mockDirectPlan,
        },
        { right: {}, on: {}, extraCols: [] },
      ],
    }),
    context: makeContext(),
    expected: false,
  },
  {
    name: 'ctsConstraints present returns null',
    acc: makeAcc({ ctsConstraints: [cts.trueQuery()] }),
    context: makeContext(),
    expected: false,
  },
  {
    name: 'conjunctionJoins present returns null',
    acc: makeAcc({ conjunctionJoins: [{ type: 'joinInner' }] }),
    context: makeContext(),
    expected: false,
  },
  {
    name: 'andOrSubPlans present returns null',
    acc: makeAcc({ andOrSubPlans: [{ plan: {} }] }),
    context: makeContext(),
    expected: false,
  },
  {
    name: 'pattern-added constraint beyond initial returns null',
    acc: makeAcc({
      constraints: ['dataType', 'extra'],
      _initialConstraintCount: 1,
    }),
    context: makeContext(),
    expected: false,
  },
  {
    name: 'patternJoin without annTopKSelfSufficient returns null',
    acc: makeAcc({
      patternJoins: [{ right: {}, on: {}, extraCols: [] }],
    }),
    context: makeContext(),
    expected: false,
  },
  {
    name: 'patternJoin with selfSufficient but no directPlan returns null',
    acc: makeAcc({
      patternJoins: [
        {
          right: {},
          on: {},
          extraCols: [],
          annTopKSelfSufficient: true,
          annTopKPlanForDirect: null,
        },
      ],
    }),
    context: makeContext(),
    expected: false,
  },
  {
    name: 'empty patternJoins returns null',
    acc: makeAcc({ patternJoins: [] }),
    context: makeContext(),
    expected: false,
  },
];

for (const scenario of scenarios) {
  const actual = getDirectPlan(scenario.acc, scenario.context);
  const gotPlan = actual != null;
  assertions.push(
    testHelperProxy.assertEqual(
      scenario.expected,
      gotPlan,
      `Scenario '${scenario.name}': expected ${scenario.expected ? 'a plan' : 'null'}, got ${gotPlan ? 'a plan' : 'null'}`,
    ),
  );
}

// --- Integration: verify the direct plan produces correct column names ---
{
  const acc = makeAcc();
  const ctx = makeContext();
  const plan = getDirectPlan(acc, ctx);
  if (plan) {
    const planSource = op
      .toSource(plan.export())
      .replace(/\n\s*/g, ' ')
      .replace(/"/g, "'");
    assertions.push(
      testHelperProxy.assertTrue(
        planSource.includes("'id'") || planSource.includes('id'),
        'Direct plan should produce an id column (renamed from uri)',
      ),
    );
    assertions.push(
      testHelperProxy.assertTrue(
        planSource.includes("'type'") || planSource.includes('type'),
        'Direct plan should produce a type column (renamed from dataType)',
      ),
    );
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length + 1} scenarios.`,
);

assertions;
export default assertions;
