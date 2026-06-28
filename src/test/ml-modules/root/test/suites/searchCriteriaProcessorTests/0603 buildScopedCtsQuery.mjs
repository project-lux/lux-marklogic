import { testHelperProxy } from '/test/test-helper.mjs';
import { buildScopedCtsQuery } from '/lib/search/engine.mjs';

const LIB = '0603 buildEstimateQuery.mjs';
console.log(`${LIB}: starting.`);

const assertions = [];

function makeAccumulator(overrides = {}) {
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
    name: 'returns null when acc has conjunctionJoins',
    acc: makeAccumulator({ conjunctionJoins: [{ type: 'joinInner' }] }),
    assemblyContext: { logicType: 'and' },
    scope: 'item',
    expected: { isNull: true },
  },
  {
    name: 'returns null when acc has patternJoins',
    acc: makeAccumulator({ patternJoins: [{ right: {}, on: [] }] }),
    assemblyContext: { logicType: 'and' },
    scope: 'item',
    expected: { isNull: true },
  },
  {
    name: 'returns null when acc has no ctsConstraints',
    acc: makeAccumulator({ ctsConstraints: [] }),
    assemblyContext: { logicType: 'and' },
    scope: 'item',
    expected: { isNull: true },
  },
  {
    name: 'returns CTS query for join-free AND accumulator with item scope',
    acc: makeAccumulator({
      ctsConstraints: [cts.fieldWordQuery('itemAnyText', 'blue')],
    }),
    assemblyContext: { logicType: 'and' },
    scope: 'item',
    expected: {
      isNull: false,
      contains: ['fieldWordQuery', 'fieldValueQuery', 'anyDataTypeName'],
    },
  },
  {
    name: 'returns CTS query for join-free OR accumulator with agent scope',
    acc: makeAccumulator({
      ctsConstraints: [
        cts.fieldWordQuery('agentPrimaryName', 'john'),
        cts.fieldWordQuery('agentPrimaryName', 'doe'),
      ],
    }),
    assemblyContext: { logicType: 'or' },
    scope: 'agent',
    expected: {
      isNull: false,
      contains: ['orQuery', 'fieldValueQuery', 'anyDataTypeName'],
    },
  },
  {
    name: 'includes scope dataType filter for work scope',
    acc: makeAccumulator({
      ctsConstraints: [cts.fieldWordQuery('workAnyText', 'painting')],
    }),
    assemblyContext: { logicType: 'and' },
    scope: 'work',
    expected: {
      isNull: false,
      contains: ['anyDataTypeName', 'LinguisticObject'],
    },
  },
];

for (const scenario of scenarios) {
  const result = buildScopedCtsQuery(
    scenario.acc,
    scenario.assemblyContext,
    scenario.scope,
  );

  if (scenario.expected.isNull) {
    assertions.push(
      testHelperProxy.assertEqual(
        null,
        result,
        `Scenario '${scenario.name}': expected null, got ${typeof result}`,
      ),
    );
  } else {
    assertions.push(
      testHelperProxy.assertTrue(
        result != null,
        `Scenario '${scenario.name}': expected non-null CTS query`,
      ),
    );

    if (scenario.expected.contains) {
      const serialized = xdmp.quote(result);
      for (const text of scenario.expected.contains) {
        assertions.push(
          testHelperProxy.assertTrue(
            serialized.includes(text),
            `Scenario '${scenario.name}': serialized query should contain '${text}'`,
          ),
        );
      }
    }
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
