/**
 * Test suite for SearchCriteriaProcessor.process() - Query Generation
 * Tests actual query content, grammar parsing, and search patterns
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { SearchPatternOptions } from '/lib/SearchPatternOptions.mjs';

const LIB = '0302-process-queryGeneration.mjs';
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
    name: 'Simple text search generates correct field query',
    input: {
      searchCriteria: { _scope: 'agent', text: '"Pablo Picasso"' },
      ...createProcessInput(),
    },
    expected: {
      error: false,
      ctsQueryContains: ['agentAnyText', 'Pablo Picasso'],
      ctsQueryIncludes: 'cts.andQuery',
    },
  },
  {
    name: 'Work scope uses correct fields',
    input: {
      searchCriteria: { _scope: 'work', text: '"Mona Lisa"' },
      ...createProcessInput({ scopeName: 'work' }),
    },
    expected: {
      error: false,
      ctsQueryContains: ['workAnyText', 'Mona Lisa'],
    },
  },
  {
    name: 'Grammar parsing - string input with AND operator',
    input: {
      searchCriteria: 'artist AND painter',
      ...createProcessInput(),
    },
    expected: {
      error: false,
      ctsQueryIncludes: 'cts.andQuery',
      ctsQueryContains: ['artist', 'painter'],
    },
  },
  {
    name: 'Grammar parsing - string input with OR operator',
    input: {
      searchCriteria: 'Pablo OR Vincent',
      ...createProcessInput(),
    },
    expected: {
      error: false,
      ctsQueryIncludes: 'cts.orQuery',
      ctsQueryContains: ['Pablo', 'Vincent'],
    },
  },
  {
    name: 'Grammar parsing - quoted phrases',
    input: {
      searchCriteria: '"Pablo Picasso" AND artist',
      ...createProcessInput(),
    },
    expected: {
      error: false,
      ctsQueryIncludes: 'cts.andQuery',
      ctsQueryContains: ['Pablo Picasso', 'artist'],
    },
  },
  {
    name: 'Complex nested JSON criteria generates proper structure',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          {
            OR: [{ text: 'Pablo' }, { text: 'Vincent' }],
          },
          { text: 'artist' },
        ],
      },
      ...createProcessInput(),
    },
    expected: {
      error: false,
      ctsQueryIncludes: 'cts.andQuery',
      ctsQueryContains: ['Pablo', 'Vincent', 'artist'],
    },
  },
  {
    name: 'Type constraint includes dataType query when enabled',
    input: {
      searchCriteria: { _scope: 'agent', text: 'Pablo' },
      ...createProcessInput({ includeTypeConstraint: true }),
    },
    expected: {
      error: false,
      ctsQueryContains: ['dataType', 'Person', 'Group'],
      ctsQueryIncludes: 'cts.andQuery',
    },
  },
  {
    name: 'No type constraint when disabled',
    input: {
      searchCriteria: { _scope: 'agent', text: 'Pablo' },
      ...createProcessInput({ includeTypeConstraint: false }),
    },
    expected: {
      error: false,
      ctsQueryExcludes: ['dataType'],
    },
  },
  {
    name: 'Token resolution - fields token gets replaced',
    input: {
      searchCriteria: { _scope: 'work', text: 'painting' },
      ...createProcessInput({ scopeName: 'work' }),
    },
    expected: {
      error: false,
      ctsQueryContains: ['workAnyText'],
      ctsQueryExcludes: ['__FIELDS__'],
    },
  },
  {
    name: 'Token resolution - types token gets replaced',
    input: {
      searchCriteria: { _scope: 'work', text: 'painting' },
      ...createProcessInput({ scopeName: 'work', includeTypeConstraint: true }),
    },
    expected: {
      error: false,
      ctsQueryContains: ['LinguisticObject', 'VisualItem'],
      ctsQueryExcludes: ['__TYPES__'],
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
      ctsQueryStr: processor.getCtsQueryStr(),
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const queryStr = scenarioResults.actualValue.ctsQueryStr;

    if (scenario.expected.ctsQueryContains) {
      scenario.expected.ctsQueryContains.forEach((expectedText) => {
        assertions.push(
          testHelperProxy.assertTrue(
            queryStr.includes(expectedText),
            `Scenario '${scenario.name}' - query should contain '${expectedText}'. Actual query: ${queryStr}`,
          ),
        );
      });
    }

    if (scenario.expected.ctsQueryIncludes) {
      assertions.push(
        testHelperProxy.assertTrue(
          queryStr.includes(scenario.expected.ctsQueryIncludes),
          `Scenario '${scenario.name}' - query should include '${scenario.expected.ctsQueryIncludes}'. Actual query: ${queryStr}`,
        ),
      );
    }

    if (scenario.expected.ctsQueryExcludes) {
      scenario.expected.ctsQueryExcludes.forEach((excludedText) => {
        assertions.push(
          testHelperProxy.assertFalse(
            queryStr.includes(excludedText),
            `Scenario '${scenario.name}' - query should not contain '${excludedText}'. Actual query: ${queryStr}`,
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
