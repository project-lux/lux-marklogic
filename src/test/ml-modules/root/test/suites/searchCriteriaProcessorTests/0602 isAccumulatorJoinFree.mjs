import { testHelperProxy } from '/test/test-helper.mjs';
import { isAccumulatorJoinFree } from '/lib/search/engine.mjs';

const LIB = '0602 isAccumulatorJoinFree.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

function makeAcc(overrides = {}) {
  return {
    constraints: [],
    _initialConstraintCount: 0,
    ctsConstraints: [cts.trueQuery()],
    conjunctionJoins: [],
    andOrSubPlans: [],
    patternJoins: [],
    ...overrides,
  };
}

const scenarios = [
  {
    name: 'pure CTS with no joins returns true',
    acc: makeAcc(),
    expected: true,
  },
  {
    name: 'dataType constraint only (matching initial count) returns true',
    acc: makeAcc({
      constraints: ['dataTypeConstraint'],
      _initialConstraintCount: 1,
    }),
    expected: true,
  },
  {
    name: 'conjunctionJoins present returns false',
    acc: makeAcc({ conjunctionJoins: [{ type: 'joinInner' }] }),
    expected: false,
  },
  {
    name: 'andOrSubPlans present returns false',
    acc: makeAcc({ andOrSubPlans: [{ plan: {} }] }),
    expected: false,
  },
  {
    name: 'patternJoins present returns false',
    acc: makeAcc({ patternJoins: [{ right: {}, on: [] }] }),
    expected: false,
  },
  {
    name: 'no ctsConstraints returns false',
    acc: makeAcc({ ctsConstraints: [] }),
    expected: false,
  },
  {
    name: 'pattern-added constraint beyond initial count returns false',
    acc: makeAcc({
      constraints: ['dataType', 'patternAdded'],
      _initialConstraintCount: 1,
    }),
    expected: false,
  },
  {
    name: 'multiple ctsConstraints with no joins returns true',
    acc: makeAcc({
      ctsConstraints: [cts.trueQuery(), cts.trueQuery()],
      constraints: ['dataType'],
      _initialConstraintCount: 1,
    }),
    expected: true,
  },
];

for (const scenario of scenarios) {
  const actual = isAccumulatorJoinFree(scenario.acc);
  assertions.push(
    testHelperProxy.assertEqual(
      scenario.expected,
      actual,
      `Scenario '${scenario.name}': expected ${scenario.expected}, got ${actual}`,
    ),
  );
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
