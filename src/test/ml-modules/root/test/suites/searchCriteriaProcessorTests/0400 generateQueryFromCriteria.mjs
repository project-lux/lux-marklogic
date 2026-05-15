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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: ['cts.andQuery', 'agentAnyText', 'Pablo', 'Picasso'],
    },
  },
  {
    name: 'Simple single term criteria - work text',
    input: {
      scopeName: 'work',
      searchCriteria: { text: 'Mona Lisa' },
      parentSearchTerm: null,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: ['cts.andQuery', 'workAnyText', 'Mona', 'Lisa'],
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: ['cts.andQuery', 'agentAnyText', 'Pablo', 'Picasso'],
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: ['cts.orQuery', 'agentAnyText', 'Pablo', 'Vincent'],
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: ['cts.notQuery', 'agentName', 'Unknown'],
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: [
        'cts.notQuery',
        'cts.orQuery',
        'agentName',
        'Unknown',
        'Anonymous',
      ],
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: [
        'cts.boostQuery',
        'workAnyText',
        'Mona',
        'Lisa',
        'painting',
      ],
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: [
        'cts.andQuery',
        'cts.orQuery',
        'agentName',
        'Pablo',
        'Vincent',
        'artist',
      ],
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      value: '',
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      value: '',
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: ['agentName', 'Pablo'],
      ctsQueryExcludes: ['cts.orQuery'],
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: ['agentTypeId', 'https://example.org/concept/painter'],
    },
  },
  {
    name: 'Search with term having nested group',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        activeAt: {
          AND: [{ name: '"New York"' }, { name: 'Paris' }],
        },
      },
      parentSearchTerm: null,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: false,
      ctsQueryContains: ['cts.andQuery', 'placeName', 'New York', 'Paris'],
    },
  },
  {
    name: 'returnTrueForUnusableTerms false with stop word',
    input: {
      scopeName: 'agent',
      searchCriteria: { name: 'a' }, // stop word
      parentSearchTerm: null,
      returnTrueForUnusableTerms: false,
    },
    expected: {
      error: false,
      value: 'cts.falseQuery()',
    },
  },
  {
    name: 'Invalid term name for scope',
    input: {
      scopeName: 'agent',
      searchCriteria: { invalidTermName: 'test' },
      parentSearchTerm: null,
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
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'does not specify a term name',
    },
  },
  // Validation tests that would have caught the missing acceptsGroup/acceptsTerm logic
  {
    name: 'Text pattern should reject groups - GROUP validation missing would have missed this',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        text: {
          AND: [{ name: 'Pablo' }, { name: 'Picasso' }],
        },
      },
      parentSearchTerm: null,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'contains a group but is not allowed to',
    },
  },
  {
    name: 'Text pattern should reject terms - TERM validation missing would have missed this',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        text: {
          name: 'Pablo Picasso',
        },
      },
      parentSearchTerm: null,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'contains another term but is not allowed to',
    },
  },
  {
    name: 'Document ID pattern should reject groups - GROUP validation missing would have missed this',
    input: {
      scopeName: 'agent',
      searchCriteria: {
        id: {
          OR: ['id1', 'id2'],
        },
      },
      parentSearchTerm: null,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'contains a group but is not allowed to',
    },
  },
  {
    name: 'Document ID pattern should reject terms - TERM validation missing would have missed this',
    input: {
      scopeName: 'work',
      searchCriteria: {
        id: {
          name: 'some-document-id',
        },
      },
      parentSearchTerm: null,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'contains another term but is not allowed to',
    },
  },
  {
    name: 'Indexed value pattern should reject groups - GROUP validation missing would have missed this',
    input: {
      scopeName: 'work',
      searchCriteria: {
        isPublicDomain: {
          AND: [1, 0],
        },
      },
      parentSearchTerm: null,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'contains a group but is not allowed to',
    },
  },
  {
    name: 'Indexed value pattern should reject terms - TERM validation missing would have missed this',
    input: {
      scopeName: 'work',
      searchCriteria: {
        isPublicDomain: {
          name: '1',
        },
      },
      parentSearchTerm: null,
      returnTrueForUnusableTerms: true,
    },
    expected: {
      error: true,
      stackToInclude: 'contains another term but is not allowed to',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true, true, true);

    return processor.generateQueryFromCriteria(
      scenario.input.scopeName,
      scenario.input.searchCriteria,
      scenario.input.parentSearchTerm,
      scenario.input.returnTrueForUnusableTerms,
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (
    scenarioResults.actualValue !== undefined &&
    scenarioResults.applyErrorNotExpectedAssertions
  ) {
    const actual = scenarioResults.actualValue;

    if (scenario.expected.value !== undefined) {
      assertions.push(
        testHelperProxy.assertEqual(
          scenario.expected.value,
          actual,
          `Scenario '${scenario.name}' did not return the expected value.`,
        ),
      );
    }

    if (scenario.expected.ctsQueryContains) {
      scenario.expected.ctsQueryContains.forEach((expectedText) => {
        assertions.push(
          testHelperProxy.assertTrue(
            typeof actual === 'string' && actual.includes(expectedText),
            `Scenario '${scenario.name}' - query should contain '${expectedText}'. Actual: ${actual}`,
          ),
        );
      });
    }

    if (scenario.expected.ctsQueryExcludes) {
      scenario.expected.ctsQueryExcludes.forEach((excludedText) => {
        assertions.push(
          testHelperProxy.assertFalse(
            typeof actual === 'string' && actual.includes(excludedText),
            `Scenario '${scenario.name}' - query should NOT contain '${excludedText}'. Actual: ${actual}`,
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
