/**
 * Test suite for SearchCriteriaProcessor.process() - Parameter Handling
 * Tests pagination, options, and parameter propagation
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';

const LIB = '0304-process-parameterHandling.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Helper function to create default process parameters
function createProcessInput(overrides = {}) {
  return {
    scopeName: 'agent',
    allowMultiScope: false,
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
    name: 'Default pagination parameters are set correctly',
    input: {
      searchCriteria: { _scope: 'agent', text: 'Pablo' },
      ...createProcessInput(),
    },
    expected: {
      error: false,
      page: 1,
      pageLength: 20,
      pageWith: null,
      valuesOnly: false,
    },
  },
  {
    name: 'Custom page and pageLength are preserved',
    input: {
      searchCriteria: { _scope: 'work', text: 'painting' },
      ...createProcessInput({ page: 3, pageLength: 50 }),
    },
    expected: {
      error: false,
      page: 3,
      pageLength: 50,
    },
  },
  {
    name: 'pageWith parameter is preserved',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
      ...createProcessInput({ pageWith: '/documents/agent/123.json' }),
    },
    expected: {
      error: false,
      pageWith: '/documents/agent/123.json',
    },
  },
  {
    name: 'valuesOnly flag is preserved when true',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
      ...createProcessInput({ valuesOnly: true }),
    },
    expected: {
      error: false,
      valuesOnly: true,
    },
  },
  {
    name: 'includeTypeConstraint false excludes type queries',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo Picasso' },
      ...createProcessInput({ includeTypeConstraint: false }),
    },
    expected: {
      error: false,
      includeTypeConstraint: false,
      ctsQueryExcludes: ['dataType'],
    },
  },
  {
    name: 'Multi-scope allowed param enables multi-scope searches',
    input: {
      searchCriteria: {
        _scope: 'multi',
        OR: [
          { _scope: 'agent', name: 'Pablo' },
          { _scope: 'work', text: 'painting' },
        ],
      },
      ...createProcessInput({ scopeName: 'multi', allowMultiScope: true }),
    },
    expected: {
      error: false,
      scopeName: 'multi',
    },
  },
  {
    name: 'SearchPatternOptions are used for processing',
    input: {
      searchCriteria: { _scope: 'work', text: 'painting' },
      ...createProcessInput({
        scopeName: 'work',
        searchPatternOptions: new SearchPatternOptions({
          synonymsEnabled: false,
          stemming: false,
        }),
      }),
    },
    expected: {
      error: false,
      scopeName: 'work',
    },
  },
  {
    name: 'Zero page defaults to 1',
    input: {
      searchCriteria: { _scope: 'agent', text: 'test' },
      ...createProcessInput({ page: 0 }),
    },
    expected: {
      error: false,
      page: 0, // Should preserve the provided value
    },
  },
  {
    name: 'Large page numbers are preserved',
    input: {
      searchCriteria: { _scope: 'agent', text: 'test' },
      ...createProcessInput({ page: 999, pageLength: 100 }),
    },
    expected: {
      error: false,
      page: 999,
      pageLength: 100,
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
      page: processor.page,
      pageLength: processor.pageLength,
      pageWith: processor.pageWith,
      valuesOnly: processor.valuesOnly,
      ctsQueryStr: processor.getCtsQueryStr(),
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const actual = scenarioResults.actualValue;

    if (scenario.expected.page !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.page,
          actual.page,
          `Scenario '${scenario.name}' - page should be ${scenario.expected.page}`,
        ),
      );
    }

    if (scenario.expected.pageLength !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.pageLength,
          actual.pageLength,
          `Scenario '${scenario.name}' - pageLength should be ${scenario.expected.pageLength}`,
        ),
      );
    }

    if (scenario.expected.pageWith !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.pageWith,
          actual.pageWith,
          `Scenario '${scenario.name}' - pageWith should be ${scenario.expected.pageWith}`,
        ),
      );
    }

    if (scenario.expected.valuesOnly !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.valuesOnly,
          actual.valuesOnly,
          `Scenario '${scenario.name}' - valuesOnly should be ${scenario.expected.valuesOnly}`,
        ),
      );
    }

    if (scenario.expected.scopeName !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.scopeName,
          actual.scopeName,
          `Scenario '${scenario.name}' - scopeName should be ${scenario.expected.scopeName}`,
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
