import { testHelperProxy } from '/test/test-helper.mjs';
import { buildScopedCtsQuery } from '/lib/search/engine.mjs';

const LIB = '0603 buildScopedCtsQuery.mjs';
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
  {
    // Multi-scope groups pass scope='multi' (once analyzeCriteria correctly
    // reports it rather than leaking the last-processed branch's scope).
    // getSearchScopeTypes('multi', false) is [], so no aggregate dataType
    // filter should be added here — each branch's own ctsConstraint already
    // carries its own dataType filter (see applyChildScopeFilter in
    // engine.mjs), applied before this function ever sees them.
    name: 'returns composedCts unwrapped for multi scope (no aggregate dataType filter)',
    acc: makeAccumulator({
      ctsConstraints: [
        cts.fieldValueQuery('itemMemberOfId', 'x'),
        cts.tripleRangeQuery(
          [],
          sem.iri('https://linked.art/ns/terms/member_of'),
          sem.iri('https://example.org/set/x'),
          '=',
        ),
      ],
    }),
    assemblyContext: { logicType: 'or' },
    scope: 'multi',
    expected: {
      isNull: false,
      contains: ['orQuery'],
      excludes: ['anyDataTypeName'],
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

    if (scenario.expected.excludes) {
      const serialized = xdmp.quote(result);
      for (const text of scenario.expected.excludes) {
        assertions.push(
          testHelperProxy.assertFalse(
            serialized.includes(text),
            `Scenario '${scenario.name}': serialized query should NOT contain '${text}'`,
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
