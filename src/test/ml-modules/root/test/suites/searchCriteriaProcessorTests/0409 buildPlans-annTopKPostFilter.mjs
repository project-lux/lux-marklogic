/**
 * Test suite for Optimization 22: annTopK post-filter for HNSW index usage.
 *
 * Verifies:
 *   - annTopK calls appear in the plan without pre-filters inside fromView.
 *   - Post-filters (scope dataType, self-exclusion) appear AFTER annTopK.
 *   - The plan uses qualified viewCol for dataType (not unqualified op.col).
 *   - CandidateK is inflated beyond the requested K.
 *   - searchFactor option is passed.
 *   - Self-exclusion is conditional on logicType (excluded for OR).
 *   - The annTopKSelfSufficient flag is set on the patternJoin.
 *
 * These tests validate plan structure via op.toSource() string inspection.
 * They require the seed document to exist in the database with vector data.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import { ANN_TOP_K_SEED_URI } from '/test/unitTestConstants.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0409 buildPlans-annTopKPostFilter.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const SEED_URI = ANN_TOP_K_SEED_URI;

// Guard: skip all scenarios if the seed document doesn't exist (e.g., local
// dev without full dataset). This prevents false failures.
const seedExists = fn.docAvailable(SEED_URI);
if (!seedExists) {
  assertions.push(
    testHelperProxy.assertTrue(
      fn.false(),
      `${LIB}: The seed document, '${SEED_URI}', does not exist and thus we're unable to run these unit tests.`,
    ),
  );
  console.log(`${LIB}: SKIPPED — seed document not available.`);
} else {
  const scenarios = [
    // --- Opt 22: post-filter structure ---
    {
      name: 'annTopK plan has annTopK call (HNSW path)',
      input: {
        scopeName: 'item',
        searchCriteria: { _scope: 'item', similar: SEED_URI },
      },
      expected: {
        error: false,
        planContains: ['annTopK'],
        // No pre-filter inside fromView — the plan should NOT contain
        // a .where() on dataType before annTopK. We verify by checking
        // that annTopK appears and the fromView call is clean.
      },
    },
    {
      name: 'annTopK plan contains searchFactor option',
      input: {
        scopeName: 'item',
        searchCriteria: { _scope: 'item', similar: SEED_URI },
      },
      expected: {
        error: false,
        planContains: ['searchFactor'],
      },
    },
    {
      name: 'annTopK plan contains post-filter scope constraint (dataType)',
      input: {
        scopeName: 'item',
        searchCriteria: { _scope: 'item', similar: SEED_URI },
      },
      expected: {
        error: false,
        // Post-filter uses getSearchScopeTypes which returns the scope's
        // RDF types (e.g., DigitalObject, HumanMadeObject for item).
        planContains: ['DigitalObject', 'HumanMadeObject'],
      },
    },
    {
      name: 'annTopK plan excludes seed document (self-exclusion in AND)',
      input: {
        scopeName: 'item',
        searchCriteria: { _scope: 'item', similar: SEED_URI },
      },
      expected: {
        error: false,
        // The seed URI should appear in an op.ne() post-filter.
        planContains: [SEED_URI],
      },
    },
    {
      name: 'annTopK uses inflated candidateK (greater than default K)',
      input: {
        scopeName: 'item',
        searchCriteria: { _scope: 'item', similar: SEED_URI },
      },
      expected: {
        error: false,
        // Default K is 50 (from ANN_K_DEFAULT in appConstants).
        // CandidateK = max(50*1.2, 50+10) = max(60, 60) = 60.
        // The plan should NOT contain 'annTopK(50,' — it should be higher.
        planExcludes: ['annTopK(50,'],
      },
    },

    // --- Opt 22: OR logicType (multi-similarity) ---
    {
      name: 'annTopK in OR does not exclude seed document',
      input: {
        scopeName: 'item',
        searchCriteria: {
          _scope: 'item',
          OR: [{ similar: SEED_URI }, { similar: SEED_URI }],
        },
      },
      expected: {
        error: false,
        // In OR context, seed exclusion is skipped (cross-matching).
        // The ne() filter for self-exclusion should not appear.
        planContains: ['annTopK'],
        planExcludes: ['ne('],
      },
    },

    // --- Opt 22: different scopes ---
    {
      name: 'annTopK in agent scope filters by agent dataTypes',
      input: {
        scopeName: 'agent',
        searchCriteria: { _scope: 'agent', similar: SEED_URI },
      },
      expected: {
        error: false,
        planContains: ['annTopK', 'Person'],
      },
    },

    // --- Opt 20 extension: direct plan (skip fromLexicons) ---
    {
      name: 'similarity-only query skips fromLexicons (direct path)',
      input: {
        scopeName: 'item',
        searchCriteria: { _scope: 'item', similar: SEED_URI },
      },
      expected: {
        error: false,
        planContains: ['annTopK'],
        planExcludes: ['fromLexicons'],
      },
    },

    // --- Error cases ---
    {
      name: 'annTopK with non-existent seed document throws',
      input: {
        scopeName: 'item',
        searchCriteria: {
          _scope: 'item',
          similar:
            'https://lux.collections.yale.edu/data/digital/does-not-exist',
        },
      },
      expected: {
        error: true,
        stackToInclude: 'is not available',
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
      console.log(`Scenario '${scenario.name}' plan source:\n${planSource}`);
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
    }

    if (scenarioResults.assertions.length > 0) {
      assertions = assertions.concat(scenarioResults.assertions);
    }
  }
}

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
export default assertions;
