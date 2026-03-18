/**
 * Test suite for SearchCriteriaProcessor.process() - Multi-Scope Functionality
 * Tests multi-scope search processing and cross-scope queries
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';

const LIB = '0305-process-multiScope.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Helper function to create default process parameters
function createProcessInput(overrides = {}) {
  return {
    scopeName: 'multi',
    allowMultiScope: true,
    searchPatternOptions: new SearchPatternOptions(),
    includeTypeConstraint: true,
    page: 1,
    pageLength: 20,
    pageWith: null,
    sortCriteria: null,
    valuesOnly: false,
    ...overrides,
  };
}

const scenarios = [
  {
    name: 'Multi-scope with agent and work creates OR query',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          { _scope: 'agent', name: 'Pablo' },
          { _scope: 'work', text: 'painting' },
        ],
      },
      ...createProcessInput(),
    },
    expected: {
      error: false,
      scopeName: 'multi',
      ctsQueryIncludes: 'cts.orQuery',
      ctsQueryContains: ['agentName', 'workAnyText', 'Pablo', 'painting'],
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
      ...createProcessInput(),
    },
    expected: {
      error: false,
      scopeName: 'multi',
      ctsQueryIncludes: 'cts.orQuery',
      ctsQueryContains: ['agentAnyText', 'workAnyText', 'placeAnyText'],
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
      ...createProcessInput(),
    },
    expected: {
      error: false,
      scopeName: 'multi',
      ctsQueryIncludes: 'cts.orQuery',
      ctsQueryContains: ['Pablo', 'Picasso', 'Guernica'],
    },
  },
  {
    name: 'Multi-scope with single scope in OR array',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [{ _scope: 'agent', text: 'artist' }],
      },
      ...createProcessInput(),
    },
    expected: {
      error: false,
      scopeName: 'agent',
      ctsQueryContains: ['agentAnyText', 'artist'],
    },
  },
  {
    name: 'Multi-scope with type constraints applies to each scope',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          { _scope: 'agent', text: 'Pablo' },
          { _scope: 'work', text: 'painting' },
        ],
      },
      ...createProcessInput({ includeTypeConstraint: true }),
    },
    expected: {
      error: false,
      scopeName: 'multi',
      ctsQueryContains: ['Person', 'Group', 'LinguisticObject', 'VisualItem'],
    },
  },
  {
    name: 'Multi-scope without type constraints',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          { _scope: 'agent', text: 'Pablo' },
          { _scope: 'work', text: 'painting' },
        ],
      },
      ...createProcessInput({ includeTypeConstraint: false }),
    },
    expected: {
      error: false,
      scopeName: 'multi',
      ctsQueryExcludes: ['dataType'],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true, true, true);
    const input = scenario.input;

    processor.process(
      input.searchCriteria,
      input.scopeName,
      input.allowMultiScope,
      input.searchPatternOptions,
      input.includeTypeConstraint,
      input.page,
      input.pageLength,
      input.pageWith,
      input.sortCriteria,
      input.valuesOnly,
    );

    return {
      scopeName: processor.getSearchScope(),
      ctsQueryStr: processor.getCtsQueryStr(),
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
          `Scenario '${scenario.name}' - scopeName should be ${scenario.expected.scopeName}`,
        ),
      );
    }

    if (scenario.expected.ctsQueryContains) {
      scenario.expected.ctsQueryContains.forEach((expectedText) => {
        assertions.push(
          testHelperProxy.assertTrue(
            actual.ctsQueryStr.includes(expectedText),
            `Scenario '${scenario.name}' - query should contain '${expectedText}'. Actual: ${actual.ctsQueryStr}`,
          ),
        );
      });
    }

    if (scenario.expected.ctsQueryIncludes) {
      assertions.push(
        testHelperProxy.assertTrue(
          actual.ctsQueryStr.includes(scenario.expected.ctsQueryIncludes),
          `Scenario '${scenario.name}' - query should include '${scenario.expected.ctsQueryIncludes}'. Actual: ${actual.ctsQueryStr}`,
        ),
      );
    }

    if (scenario.expected.ctsQueryExcludes) {
      scenario.expected.ctsQueryExcludes.forEach((excludedText) => {
        assertions.push(
          testHelperProxy.assertFalse(
            actual.ctsQueryStr.includes(excludedText),
            `Scenario '${scenario.name}' - query should not contain '${excludedText}'. Actual: ${actual.ctsQueryStr}`,
          ),
        );
      });
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
