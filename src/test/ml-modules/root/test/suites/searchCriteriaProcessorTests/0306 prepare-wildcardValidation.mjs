/**
 * Test suite for SCP.prepare() + buildPlans() - Wildcard Validation
 * Tests that sanitizeAndValidateWildcardedStrings is applied to keyword-type
 * terms during plan building: valid wildcards are sanitized/consolidated,
 * invalid wildcards throw InvalidSearchRequestError, and non-keyword patterns
 * skip wildcard validation entirely.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
import op from '/MarkLogic/optic.mjs';

const LIB = '0306 prepare-wildcardValidation.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  // --- Success cases: valid wildcards that build plans ---
  {
    name: 'Valid trailing wildcard with 3+ qualifying chars builds plan',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: 'abc*' },
    },
    expected: {
      error: false,
      planContains: ['abc*'],
    },
  },
  {
    name: 'Valid leading wildcard with 3+ qualifying chars builds plan',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: '*xyz' },
    },
    expected: {
      error: false,
      planContains: ['*xyz'],
    },
  },
  {
    name: 'Adjacent wildcards are consolidated to single asterisk',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: 'Pablo??*' },
    },
    expected: {
      error: false,
      planContains: ['Pablo*'],
      planExcludes: ['Pablo??*'],
    },
  },
  {
    name: 'Multiple adjacent wildcards consolidated - mixed ?* patterns',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: 'artist*?*' },
    },
    expected: {
      error: false,
      planContains: ['artist*'],
      planExcludes: ['artist*?*'],
    },
  },
  {
    name: 'Non-wildcarded keyword term is unaffected',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: 'Pablo Picasso' },
    },
    expected: {
      error: false,
      planContains: ['Pablo Picasso'],
    },
  },
  {
    name: 'Non-keyword pattern term with wildcard chars does not throw',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', id: 'p*' },
    },
    expected: {
      error: false,
      // DocumentIdOrIri pattern is not keyword; wildcard validation is skipped.
      planContains: ['p*'],
    },
  },
  // --- Error cases: invalid wildcards throw ---
  {
    name: 'Wildcard with only 1 qualifying char throws',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: 'p*' },
    },
    expected: {
      error: true,
      stackToInclude:
        'wildcarded strings must have at least three non-wildcard characters',
    },
  },
  {
    name: 'Wildcard with only 2 qualifying chars throws',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: 'ab*' },
    },
    expected: {
      error: true,
      stackToInclude:
        'wildcarded strings must have at least three non-wildcard characters',
    },
  },
  {
    name: 'Wildcard-only string throws',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: '***' },
    },
    expected: {
      error: true,
      stackToInclude:
        'wildcarded strings must have at least three non-wildcard characters',
    },
  },
  {
    name: 'Invalid wildcard after consolidation includes adjustment message',
    input: {
      scopeName: 'agent',
      searchCriteria: { _scope: 'agent', text: 'ab?*' },
    },
    expected: {
      error: true,
      stackToInclude: 'even after adjusting to',
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

    if (scenario.expected.planContains) {
      scenario.expected.planContains.forEach((expectedText) => {
        assertions.push(
          testHelperProxy.assertTrue(
            typeof planSource === 'string' && planSource.includes(expectedText),
            `Scenario '${scenario.name}' - plan should contain '${expectedText}'. Actual plan: ${planSource}`,
          ),
        );
      });
    }

    if (scenario.expected.planExcludes) {
      scenario.expected.planExcludes.forEach((excludedText) => {
        assertions.push(
          testHelperProxy.assertFalse(
            typeof planSource === 'string' && planSource.includes(excludedText),
            `Scenario '${scenario.name}' - plan should NOT contain '${excludedText}'. Actual plan: ${planSource}`,
          ),
        );
      });
    }
  }

  if (scenarioResults.applyErrorExpectedAssertions) {
    if (scenario.expected.stackToInclude) {
      assertions.push(
        testHelperProxy.assertTrue(
          scenarioResults.error.stack.includes(
            scenario.expected.stackToInclude,
          ),
          `Scenario '${scenario.name}' should include error message: '${scenario.expected.stackToInclude}'. Actual error: ${scenarioResults.error.stack}`,
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
