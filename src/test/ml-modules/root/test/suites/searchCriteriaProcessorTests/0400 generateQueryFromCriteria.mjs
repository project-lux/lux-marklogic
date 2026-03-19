import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0400 generateQueryFromCriteria.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Simple single term criteria - agent text',
    input: {
      scopeName: 'agent',
      searchCriteria: { text: 'Pablo Picasso' },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'Simple single term criteria - work text',
    input: {
      scopeName: 'work',
      searchCriteria: { text: 'Mona Lisa' },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'AND group with multiple terms',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        AND: [{ text: 'Pablo' }, { text: 'Picasso' }],
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'OR group with multiple terms',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        OR: [{ text: 'Pablo' }, { text: 'Vincent' }],
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'NOT group with single term',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        NOT: { name: 'Unknown' },
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'NOT group with array of terms',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        NOT: [{ name: 'Unknown' }, { name: 'Anonymous' }],
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'BOOST group with term',
    input: {
      scopeName: 'work',
      searchCriteria: {
        BOOST: [{ text: 'Mona Lisa' }, { text: 'painting' }],
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'Nested AND and OR groups',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        AND: [
          {
            OR: [{ name: 'Pablo' }, { name: 'Vincent' }],
          },
          { name: 'artist' },
        ],
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'Empty AND group',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        AND: [],
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: false,
    },
  },
  {
    name: 'Empty OR group',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        OR: [],
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: false,
    },
  },
  {
    name: 'Single item OR group - should unwrap',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        OR: [{ name: 'Pablo' }],
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'Complex search with term object having id',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        classification: {
          id: 'https://example.org/concept/painter',
        },
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'Search with term having nested group',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        activeAt: {
          AND: [{ name: 'New York' }, { name: 'Paris' }],
        },
      },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'mustReturnCtsQuery false',
    input: {
      scopeName: 'agent',
      searchCriteria: { name: 'Pablo' },
      parentSearchTerm: null,
      mustReturnCtsQuery: false,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'returnTrueForUnusableTerms false',
    input: {
      scopeName: 'agent',
      searchCriteria: { name: 'a' }, // stop word
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: false,
    },
    expected: {
      error: false,
      hasCtsQuery: true,
    },
  },
  {
    name: 'Invalid term name for scope',
    input: {
      scopeName: 'agent',
      searchCriteria: { invalidTermName: 'test' },
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'is invalid for the',
    },
  },
  {
    name: 'Missing term name in criteria',
    input: {
      scopeName: 'agent',
      searchCriteria: { _weight: 1.5, _valueType: 'string' }, // only options, no term name
      parentSearchTerm: null,
      mustReturnCtsQuery: true,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'does not specify a term name',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true, true, true);

    const result = processor.generateQueryFromCriteria(
      scenario.input.scopeName,
      scenario.input.searchCriteria,
      scenario.input.parentSearchTerm,
      scenario.input.mustReturnCtsQuery,
      scenario.input.returnTrueForUnusableTerms,
    );

    return {
      result: result,
      hasCtsQuery: typeof result === 'string' && result.length > 0,
      resultType: typeof result,
      isEmpty: result === '' || result === null || result === undefined,
    };
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (
    scenarioResults.actualValue &&
    scenarioResults.applyErrorNotExpectedAssertions
  ) {
    const actual = scenarioResults.actualValue;

    if (scenario.expected.hasCtsQuery) {
      assertions.push(
        testHelperProxy.assertTrue(
          actual.hasCtsQuery,
          `generateQueryFromCriteria should return a non-empty CTS query string for scenario: ${scenario.name}`,
        ),
      );
    } else {
      assertions.push(
        testHelperProxy.assertTrue(
          actual.isEmpty || !actual.hasCtsQuery,
          `generateQueryFromCriteria should return empty or no CTS query for scenario: ${scenario.name}`,
        ),
      );
    }

    // Verify the result type is appropriate
    assertions.push(
      testHelperProxy.assertTrue(
        actual.resultType === 'string' || actual.resultType === 'undefined',
        `generateQueryFromCriteria should return string or undefined, got: ${actual.resultType} for scenario: ${scenario.name}`,
      ),
    );
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
