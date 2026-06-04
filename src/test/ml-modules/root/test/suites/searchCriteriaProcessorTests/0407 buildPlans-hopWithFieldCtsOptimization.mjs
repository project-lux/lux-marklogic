/**
 * Test suite for the HopWithField CTS optimization (cts.tripleRangeQuery path).
 *
 * When a non-transitive HopWithField term's inner criteria resolves to pure
 * CTS, the pattern emits cts.tripleRangeQuery instead of an Optic
 * fromTriples join. This test verifies:
 *   - The optimization fires for id-leaf criteria (terms without idIndexReferences).
 *   - The optimization fires for nested criteria that folds to pure CTS.
 *   - The optimization does NOT fire when inner criteria requires Optic joins.
 *   - The engine's idIndexReferences rewrite preempts HopWithField entirely.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0407 buildPlans-hopWithFieldCtsOptimization.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const MOCK_IRI =
  'https://lux.collections.yale.edu/data/concept/75b52304-86e2-48d9-bf24-0f56b75c23f0';

const scenarios = [
  // --- Optimization fires ---
  {
    name: 'Id-leaf on term without idIndexReferences emits tripleRangeQuery',
    input: {
      scopeName: 'work',
      searchCriteria: {
        _scope: 'work',
        // creationInfluencedBy has no facet → no runtime idIndexReferences →
        // engine rewrite does NOT fire → HopWithField CTS optimization kicks in.
        creationInfluencedBy: { id: MOCK_IRI },
      },
    },
    expected: {
      error: false,
      // CTS path: cts.tripleRangeQuery with the term's predicate.
      // cts.documentQuery is inside cts.values() which is evaluated at plan
      // build time, so it doesn't survive into op.toSource() output.
      planContains: ['cts.tripleRangeQuery', 'agentInfluencedCreation'],
      planExcludes: ['op.fromTriples'],
    },
  },
  {
    name: 'Nested OR with pure-CTS inner criteria emits tripleRangeQuery',
    input: {
      scopeName: 'work',
      searchCriteria: {
        _scope: 'work',
        classification: {
          OR: [{ id: MOCK_IRI }, { influencedByConcept: { id: MOCK_IRI } }],
        },
      },
    },
    expected: {
      error: false,
      // Inner CTS (orQuery, documentQuery, fieldValueQuery) is inside
      // cts.values() — evaluated at plan build time, not serialized.
      planContains: ['cts.tripleRangeQuery', 'workClassifiedAs'],
      planExcludes: ['op.fromTriples'],
    },
  },
  {
    name: 'Nested AND with pure-CTS inner criteria emits tripleRangeQuery',
    input: {
      scopeName: 'work',
      searchCriteria: {
        _scope: 'work',
        classification: { name: 'painting' },
      },
    },
    expected: {
      error: false,
      // name is indexedWord → ctsConstraints → inner folds to CTS.
      // Inner CTS details (conceptName, 'painting') are consumed by
      // cts.values() at build time.
      planContains: ['cts.tripleRangeQuery', 'workClassifiedAs'],
      planExcludes: ['op.fromTriples'],
    },
  },

  // --- Optimization does NOT fire ---
  // Note: HopWithField rejects atomic values (getAllowedChildren excludes
  // CHILD_TYPE_ATOMIC), so there is no atomic-value fallback to test.
  {
    name: 'Inner criteria with non-CTS contributions falls back to Optic join',
    input: {
      scopeName: 'work',
      searchCriteria: {
        _scope: 'work',
        // DocumentIdOrIri returns Optic constraints (not ctsConstraints) for
        // AND logic, so the inner accumulator is not pure CTS and
        // processCriteriaAsCts returns null → Optic fallback fires.
        classification: { AND: [{ id: MOCK_IRI }, { name: 'painting' }] },
      },
    },
    expected: {
      error: false,
      planContains: ['op.fromTriples'],
      planExcludes: ['cts.tripleRangeQuery'],
    },
  },

  // --- Engine idIndexReferences rewrite preempts HopWithField ---
  {
    name: 'Term with idIndexReferences uses fieldValueQuery (engine rewrite)',
    input: {
      scopeName: 'work',
      searchCriteria: {
        _scope: 'work',
        aboutConcept: { id: MOCK_IRI },
      },
    },
    expected: {
      error: false,
      // Engine rewrites to indexedValue → cts.fieldValueQuery on the ID index.
      // No tripleRangeQuery and no fromTriples — HopWithField is never called.
      planContains: ['workAboutConceptId', 'cts.fieldValueQuery'],
      planExcludes: ['cts.tripleRangeQuery', 'op.fromTriples'],
    },
  },

  // --- Shape-level integration: mirrors 5k-pattern-analysis shapes ---
  {
    name: 'Shape 2 pattern: OR(classification, language, aboutConcept) all fold to CTS',
    input: {
      scopeName: 'work',
      searchCriteria: {
        _scope: 'work',
        OR: [
          {
            classification: {
              OR: [{ id: MOCK_IRI }, { influencedByConcept: { id: MOCK_IRI } }],
            },
          },
          {
            language: {
              OR: [{ id: MOCK_IRI }, { influencedByConcept: { id: MOCK_IRI } }],
            },
          },
          { aboutConcept: { id: MOCK_IRI } },
        ],
      },
    },
    expected: {
      error: false,
      // classification and language emit tripleRangeQuery.
      // aboutConcept uses engine rewrite → fieldValueQuery (has idIndexReferences).
      planContains: [
        'cts.tripleRangeQuery',
        'workAboutConceptId',
        'workClassifiedAs',
        'P72_has_language',
      ],
      planExcludes: ['op.fromTriples'],
      planCounts: {
        'cts.tripleRangeQuery': 2,
      },
    },
  },
  {
    name: 'Shape 9 pattern: OR of two terms without idIndexReferences, both fold',
    input: {
      scopeName: 'work',
      searchCriteria: {
        _scope: 'work',
        // Both terms lack facets → no runtime idIndexReferences → HopWithField
        // CTS optimization fires for each.
        OR: [
          { creationInfluencedBy: { id: MOCK_IRI } },
          { creationCausedBy: { id: MOCK_IRI } },
        ],
      },
    },
    expected: {
      error: false,
      planContains: [
        'cts.tripleRangeQuery',
        'agentInfluencedCreation',
        'causeOfCreation',
      ],
      planExcludes: ['op.fromTriples'],
      planCounts: {
        'cts.tripleRangeQuery': 2,
      },
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();
    scp.prepare({
      searchCriteria: scenario.input.searchCriteria,
      scopeName: scenario.input.scopeName,
    });
    const { sortedResultsPlan } = scp.buildPlans();
    return op.toSource(sortedResultsPlan.export());
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const planSource = scenarioResults.actualValue;
    const e = scenario.expected;
    const p = scenario.name;

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

    if (e.planCounts) {
      for (const [text, expected] of Object.entries(e.planCounts)) {
        const actual =
          typeof planSource === 'string'
            ? planSource.split(text).length - 1
            : -1;
        assertions.push(
          testHelperProxy.assertEqual(
            expected,
            actual,
            `${p}: plan should contain '${text}' exactly ${expected} time(s); got ${actual}`,
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
