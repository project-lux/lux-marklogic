import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';
import { PatternOptions } from '/lib/search/patterns.mjs';
import { ML_APP_NAME } from '/lib/appConstants.mjs';

const LIB = '0600 getEstimateTests.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'agent by ID',
    input: {
      searchCriteria: {
        _scope: 'agent',
        id: 'https://lux.collections.yale.edu/data/group/f49ccc7b-5d4e-4121-8210-b57bc89aad5a',
      },
    },
    expected: {
      error: false,
      value: 1,
    },
  },
  {
    name: 'agent by IRI',
    input: {
      searchCriteria: {
        _scope: 'agent',
        iri: 'https://lux.collections.yale.edu/data/group/f49ccc7b-5d4e-4121-8210-b57bc89aad5a',
      },
    },
    expected: {
      error: false,
      value: 1,
    },
  },
  {
    name: 'either agent by ID or IRI',
    input: {
      searchCriteria: {
        _scope: 'agent',
        OR: [
          {
            id: 'https://lux.collections.yale.edu/data/person/13a15edf-65d1-4d93-910d-ef006d5fab47',
          },
          {
            iri: 'https://lux.collections.yale.edu/data/group/f49ccc7b-5d4e-4121-8210-b57bc89aad5a',
          },
        ],
      },
    },
    expected: {
      error: false,
      value: 2,
    },
  },
  {
    name: 'agent started anytime in 2012 (=) --CTS TO RETURN 8',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '=',
      },
    },
    expected: {
      error: false,
      value: 15,
    },
  },
  {
    name: 'agent started anytime in 2012 (=) with timespanMode=begin',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '=',
        _timespanMode: 'begin',
      },
    },
    expected: {
      error: false,
      value: 15,
    },
  },
  {
    name: 'agent started anytime in 2012 (=) with timespanMode=end',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '=',
        _timespanMode: 'end',
      },
    },
    expected: {
      error: false,
      value: 15,
    },
  },
  {
    name: 'agent started anytime in 2012 (=) with timespanMode=full',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '=',
        _timespanMode: 'full',
      },
    },
    expected: {
      error: false,
      value: 15,
    },
  },
  {
    name: 'agent *not* started anytime in 2012 (!=)',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '!=',
      },
    },
    expected: {
      error: false,
      value: 23368,
    },
  },
  {
    name: 'agent started in or after 2012 (>=) --CTS TO RETURN 107',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '>=',
      },
    },
    expected: {
      error: false,
      value: 114,
    },
  },
  {
    name: 'agent started after 2012 (>)',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '>',
      },
    },
    expected: {
      error: false,
      value: 99,
    },
  },
  {
    name: 'agent started before 2012 (<)',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '<',
      },
    },
    expected: {
      error: false,
      value: 23269,
    },
  },
  {
    name: 'agent started in or before 2012 (<=) --CTS TO RETURN 23277',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
        _comp: '<=',
      },
    },
    expected: {
      error: false,
      value: 23284,
    },
  },
  {
    name: 'date search term without comparator',
    input: {
      searchCriteria: {
        _scope: 'agent',
        startDate: '2012',
      },
    },
    expected: {
      error: true,
      stackToInclude: 'is missing required runtime property',
    },
  },
  {
    name: 'agent name search',
    input: {
      searchCriteria: { _scope: 'agent', name: 'Pablo' },
    },
    expected: {
      error: false,
      value: 16,
    },
  },
  {
    name: 'item text search',
    input: {
      searchCriteria: { _scope: 'item', text: 'blue' },
    },
    expected: {
      error: false,
      value: 4917,
    },
  },
  {
    name: 'item AND text search',
    input: {
      searchCriteria: {
        _scope: 'item',
        AND: [{ text: 'lobster' }],
      },
    },
    expected: {
      error: false,
      value: 43,
    },
  },
  {
    name: 'item OR with nested AND, name, and producedBy',
    input: {
      searchCriteria: {
        _scope: 'item',
        OR: [
          {
            AND: [
              { depth: '100', _comp: '>=' },
              { width: '100', _comp: '>=' },
            ],
          },
          { name: 'box' },
          { producedBy: { name: 'john' } },
        ],
      },
    },
    expected: {
      error: false,
      value: 10912,
    },
  },
  {
    name: 'item AND with nested AND and producedBy',
    input: {
      searchCriteria: {
        _scope: 'item',
        AND: [
          {
            AND: [
              { depth: '100', _comp: '>=' },
              { width: '100', _comp: '>=' },
            ],
          },
          { producedBy: { name: 'john' } },
        ],
      },
    },
    expected: {
      error: false,
      value: 3,
    },
  },
  {
    name: 'item AND with nested OR and name',
    input: {
      searchCriteria: {
        _scope: 'item',
        AND: [
          {
            OR: [
              { depth: '100', _comp: '>=' },
              { width: '100', _comp: '>=' },
            ],
          },
          { name: 'box' },
        ],
      },
    },
    expected: {
      error: false,
      value: 10,
    },
  },
  {
    name: 'item AND with nested OR and NOT',
    input: {
      searchCriteria: {
        _scope: 'item',
        AND: [
          {
            OR: [
              { depth: '100', _comp: '>=' },
              { width: '100', _comp: '>=' },
            ],
          },
          { name: 'box' },
          {
            NOT: [{ name: 'giraffe' }, { recordType: 'DigitalObject' }],
          },
        ],
      },
    },
    expected: {
      error: false,
      value: 10,
    },
  },
  {
    name: 'item OR with ranges, name, and text',
    input: {
      searchCriteria: {
        _scope: 'item',
        OR: [
          { height: '100', _comp: '>=' },
          { width: '100', _comp: '>=' },
          { name: 'tool' },
          { text: 'gate' },
        ],
      },
    },
    expected: {
      error: false,
      value: 9755,
    },
  },
  {
    name: 'item OR with single producedBy hop',
    input: {
      searchCriteria: {
        _scope: 'item',
        OR: [{ producedBy: { name: 'john' } }],
      },
    },
    expected: {
      error: false,
      value: 10170,
    },
  },
  {
    name: 'agent AND with name and produced (hopInverse) OR ranges',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { name: 'john' },
          {
            produced: {
              OR: [
                { depth: '100', _comp: '>=' },
                { width: '100', _comp: '>=' },
              ],
            },
          },
        ],
      },
    },
    expected: {
      error: false,
      value: 140,
    },
  },
  {
    name: 'agent AND with text and produced (hopInverse) OR ranges',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { text: 'foundation' },
          {
            produced: {
              OR: [
                { depth: '100', _comp: '>=' },
                { width: '100', _comp: '>=' },
              ],
            },
          },
        ],
      },
    },
    expected: {
      error: false,
      value: 17,
    },
  },
  {
    name: 'agent OR with unlikely name and produced (hopInverse) OR ranges',
    input: {
      searchCriteria: {
        _scope: 'agent',
        OR: [
          { name: 'very_unlikely_string_123' },
          {
            produced: {
              OR: [
                { depth: '100', _comp: '>=' },
                { width: '100', _comp: '>=' },
              ],
            },
          },
        ],
      },
    },
    expected: {
      error: false,
      value: 2135,
    },
  },
  {
    name: 'similar event',
    input: {
      searchCriteria: {
        _scope: 'event',
        similar:
          'https://lux.collections.yale.edu/data/activity/0102514a-03d8-4467-a84d-6b901cfae7c8',
      },
    },
    expected: {
      error: false,
      value: 1,
    },
  },
  {
    name: 'Valid multi-scope search',
    input: {
      allowMultiScope: true,
      searchCriteria: {
        _scope: 'multi',
        OR: [
          { _scope: 'agent', name: 'wick' },
          { _scope: 'work', name: 'wick' },
          { _scope: 'item', name: 'wick' },
        ],
      },
    },
    expected: {
      error: false,
      value: 8,
    },
  },
  {
    name: 'regression test to ensure every record with the matching data type is not returned',
    input: {
      searchCriteria: {
        _scope: 'work',
        OR: [
          {
            createdBy: {
              id: 'https://lux.collections.yale.edu/data/person/66f1e1aa-d806-4352-9fb7-cf13300e5571',
            },
          },
          {
            publishedBy: {
              id: 'https://lux.collections.yale.edu/data/person/66f1e1aa-d806-4352-9fb7-cf13300e5571',
            },
          },
          {
            creationInfluencedBy: {
              id: 'https://lux.collections.yale.edu/data/person/66f1e1aa-d806-4352-9fb7-cf13300e5571',
            },
          },
        ],
      },
    },
    expected: {
      error: false,
      value: 0,
    },
  },
  /*
  Empty OR
  OR with one item
  OR with multi
  AND
  No groups, just a single criterion
  Not allowed
  */
];

// Test getEstimate scenarios
const failures = [];

const adjustedTenantName = ML_APP_NAME === 'luxCTS' ? 'lux' : ML_APP_NAME;
const invokeFunOptions = {
  database: xdmp.database(`${adjustedTenantName}-content`),
};
for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const processor = new SearchCriteriaProcessor(true, true, true);

    processor.prepare(
      scenario.input.searchCriteria,
      null, // scopeName from criteria
      scenario.input.allowMultiScope ?? false,
      new PatternOptions(),
      true, // includeTypeConstraint
      1, // page
      20, // pageLength
      null, // pageWith
      null, // sortCriteria
      false, // valuesOnly
    );

    return processor.getEstimate();
  };

  const scenarioResults = executeScenario(
    scenario,
    zeroArityFun,
    invokeFunOptions,
  );

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const estimate = scenarioResults.actualValue;

    if (
      scenario.expected.value !== undefined &&
      estimate !== scenario.expected.value
    ) {
      failures.push({
        name: scenario.name,
        expected: scenario.expected.value,
        actual: estimate,
      });
    }
  } else if (
    scenario.expected.error !== true &&
    scenarioResults.assertions.length > 0
  ) {
    // Error was expected but something went wrong
    failures.push({
      name: scenario.name,
      expected: scenario.expected.value,
      actual: `ERROR: ${scenarioResults.assertions.map((a) => a.toString()).join('; ')}`,
    });
  }
}

if (failures.length > 0) {
  const details = failures
    .map((f) => `  '${f.name}': expected ${f.expected}, got ${f.actual}`)
    .join('\n');
  assertions.push(
    testHelperProxy.assertTrue(
      false,
      `${failures.length} of ${scenarios.length} scenario(s) failed:\n${details}`,
    ),
  );
} else {
  scenarios.forEach((scenario) => {
    assertions.push(testHelperProxy.success());
  });
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
