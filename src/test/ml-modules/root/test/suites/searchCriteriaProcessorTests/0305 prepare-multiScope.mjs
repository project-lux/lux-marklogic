/**
 * Test suite for SCP.prepare() + buildPlans() - Multi-Scope Functionality
 * Tests multi-scope search processing, criteria counting, and ignored terms.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0305 prepare-multiScope.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Multi-scope with agent and work produces plan with both scope fields',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          { _scope: 'agent', name: 'Pablo' },
          { _scope: 'work', text: 'painting' },
        ],
      },
    },
    expected: {
      error: false,
      scopeName: 'multi',
      planContains: ['agentName', 'workAnyText', 'Pablo', 'painting'],
    },
  },
  {
    name: 'Multi-scope with three different scopes',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          { _scope: 'agent', text: 'artist' },
          { _scope: 'work', text: 'painting' },
          { _scope: 'place', text: 'museum' },
        ],
      },
    },
    expected: {
      error: false,
      scopeName: 'multi',
      planContains: ['agentAnyText', 'workAnyText', 'placeAnyText'],
    },
  },
  {
    name: 'Multi-scope with complex nested criteria',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          {
            _scope: 'agent',
            AND: [{ text: 'Pablo' }, { text: 'Picasso' }],
          },
          { _scope: 'work', text: 'Guernica' },
        ],
      },
    },
    expected: {
      error: false,
      scopeName: 'multi',
      planContains: ['Pablo', 'Picasso', 'Guernica'],
    },
  },
  {
    name: 'Multi-scope single scope in OR array',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [{ _scope: 'agent', text: 'artist' }],
      },
    },
    expected: {
      error: false,
      planContains: ['agentAnyText', 'artist'],
      criteriaCntGte: 1,
      ignoredTermsLength: 0,
    },
  },
  {
    name: 'Multi-scope single element with AND group propagates criteriaCnt',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          {
            _scope: 'agent',
            AND: [{ text: 'Pablo' }, { text: 'Picasso' }],
          },
        ],
      },
    },
    expected: {
      error: false,
      planContains: ['Pablo', 'Picasso'],
      criteriaCntGte: 2,
      ignoredTermsLength: 0,
    },
  },
  {
    name: 'Multi-scope propagates ignoredTerms for mixed valid and stop words',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          {
            _scope: 'work',
            AND: [{ text: 'painting' }, { text: 'a' }],
          },
        ],
      },
    },
    expected: {
      error: false,
      planContains: ['painting'],
      criteriaCntGte: 1,
      ignoredTermsLength: 1,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const scp = new SCP();
    scp.prepare({
      searchCriteria: scenario.input.searchCriteria,
      scopeName: 'multi',
      allowMultiScope: true,
    });
    const { sortedResultsPlan } = scp.buildPlans();
    const planSource = op.toSource(sortedResultsPlan.export());
    return {
      planSource,
      scopeName: scp.getSearchScope(),
      criteriaCnt: scp.getCriteriaCount(),
      ignoredTerms: scp.getIgnoredTerms(),
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const actual = scenarioResults.actualValue;

    if (scenario.expected.scopeName !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.scopeName,
          actual.scopeName,
          `Scenario '${scenario.name}' - scopeName should be '${scenario.expected.scopeName}'. Actual: '${actual.scopeName}'`,
        ),
      );
    }

    if (scenario.expected.planContains) {
      scenario.expected.planContains.forEach((expectedText) => {
        assertions.push(
          testHelperProxy.assertTrue(
            typeof actual.planSource === 'string' &&
              actual.planSource.includes(expectedText),
            `Scenario '${scenario.name}' - plan should contain '${expectedText}'. Actual plan: ${actual.planSource}`,
          ),
        );
      });
    }

    if (scenario.expected.planExcludes) {
      scenario.expected.planExcludes.forEach((excludedText) => {
        assertions.push(
          testHelperProxy.assertFalse(
            typeof actual.planSource === 'string' &&
              actual.planSource.includes(excludedText),
            `Scenario '${scenario.name}' - plan should NOT contain '${excludedText}'. Actual plan: ${actual.planSource}`,
          ),
        );
      });
    }

    // "Gte" = greater than or equal; nested conjunctions may count differently.
    if (scenario.expected.criteriaCntGte !== undefined) {
      assertions.push(
        testHelperProxy.assertTrue(
          actual.criteriaCnt >= scenario.expected.criteriaCntGte,
          `Scenario '${scenario.name}' - criteriaCnt should be >= ${scenario.expected.criteriaCntGte}. Actual: ${actual.criteriaCnt}`,
        ),
      );
    }

    if (scenario.expected.ignoredTermsLength !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.ignoredTermsLength,
          actual.ignoredTerms.length,
          `Scenario '${scenario.name}' - ignoredTerms length should be ${scenario.expected.ignoredTermsLength}. Actual: ${actual.ignoredTerms.length}`,
        ),
      );
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
