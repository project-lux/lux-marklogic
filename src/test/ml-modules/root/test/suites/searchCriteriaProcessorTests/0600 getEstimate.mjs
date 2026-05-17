import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor as SCP } from '/lib/SearchCriteriaProcessor.mjs';
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
  // TSV-derived person-only DateRange coverage (scratch/peopleBornAndDiedExport.tsv).
  {
    name: 'person started anytime in 1700 (=) with timespanMode=full [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { recordType: 'Person' },
          { startDate: '1700', _comp: '=', _timespanMode: 'full' },
        ],
      },
    },
    expected: {
      error: false,
      value: 64,
    },
  },
  {
    name: 'person started anytime in 1700 (=) with timespanMode=begin [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { recordType: 'Person' },
          { startDate: '1700', _comp: '=', _timespanMode: 'begin' },
        ],
      },
    },
    expected: {
      error: false,
      value: 63,
    },
  },
  {
    name: 'person started anytime in 1700 (=) with timespanMode=end [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { recordType: 'Person' },
          { startDate: '1700', _comp: '=', _timespanMode: 'end' },
        ],
      },
    },
    expected: {
      error: false,
      value: 64,
    },
  },
  {
    name: 'person *not* started anytime in 1700 (!=) [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [{ recordType: 'Person' }, { startDate: '1700', _comp: '!=' }],
      },
    },
    expected: {
      error: false,
      value: 18774,
    },
  },
  {
    name: 'person started in or after 1700 (>=) [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [{ recordType: 'Person' }, { startDate: '1700', _comp: '>=' }],
      },
    },
    expected: {
      error: false,
      value: 15449,
    },
  },
  {
    name: 'person started after 1700 (>) [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [{ recordType: 'Person' }, { startDate: '1700', _comp: '>' }],
      },
    },
    expected: {
      error: false,
      value: 15386,
    },
  },
  {
    name: 'person started before 1700 (<) [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [{ recordType: 'Person' }, { startDate: '1700', _comp: '<' }],
      },
    },
    expected: {
      error: false,
      value: 3389,
    },
  },
  {
    name: 'person started in or before 1700 (<=) [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [{ recordType: 'Person' }, { startDate: '1700', _comp: '<=' }],
      },
    },
    expected: {
      error: false,
      value: 3452,
    },
  },
  // Two-date range '1790;1800': exercises the distinct startDateLong/endDateLong boundary-
  // selection logic for single-sided operators (>= and < use startOf(1790); > and <= use
  // endOf(1800)), which a single-year test cannot distinguish. [TSV-derived]
  {
    name: 'person born overlapping 1790-1800 (=) [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [{ recordType: 'Person' }, { startDate: '1790;1800', _comp: '=' }],
      },
    },
    expected: {
      error: false,
      value: 757,
    },
  },
  {
    name: 'person born overlapping 1790-1800 (!=) [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { recordType: 'Person' },
          { startDate: '1790;1800', _comp: '!=' },
        ],
      },
    },
    expected: {
      error: false,
      value: 18081,
    },
  },
  {
    name: 'person born in or after 1790 (>=) from two-date range [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { recordType: 'Person' },
          { startDate: '1790;1800', _comp: '>=' },
        ],
      },
    },
    expected: {
      error: false,
      value: 11598,
    },
  },
  {
    name: 'person born after end of 1800 (>) from two-date range [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [{ recordType: 'Person' }, { startDate: '1790;1800', _comp: '>' }],
      },
    },
    expected: {
      error: false,
      value: 10841,
    },
  },
  {
    name: 'person born before start of 1790 (<) from two-date range [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [{ recordType: 'Person' }, { startDate: '1790;1800', _comp: '<' }],
      },
    },
    expected: {
      error: false,
      value: 7240,
    },
  },
  {
    name: 'person born in or before end of 1800 (<=) from two-date range [TSV-derived]',
    input: {
      searchCriteria: {
        _scope: 'agent',
        AND: [
          { recordType: 'Person' },
          { startDate: '1790;1800', _comp: '<=' },
        ],
      },
    },
    expected: {
      error: false,
      value: 7997,
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
        _maxDistance: 0.5,
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
  {
    name: 'three keywords and memberOf',
    input: {
      searchCriteria: {
        AND: [
          {
            text: 'woman',
            _lang: 'en',
          },
          {
            text: 'greek',
            _lang: 'en',
          },
          {
            text: 'art',
            _lang: 'en',
          },
          {
            memberOf: {
              id: 'https://lux.collections.yale.edu/data/set/5e9b7f70-82d9-4f3e-8f72-ef5bf6b17d9e',
            },
          },
        ],
        _scope: 'item',
      },
    },
    expected: {
      error: false,
      value: 59,
    },
  },
  {
    name: "verify more than one AND'd OR does not return zero results (andOrSubPlans)",
    input: {
      searchCriteria: {
        _scope: 'concept',
        AND: [
          {
            OR: [
              {
                id: 'https://lux.collections.yale.edu/data/concept/006ff674-ca40-4ba8-8d1c-7850748e606b',
              },
              {
                id: 'https://lux.collections.yale.edu/data/concept/0081710b-8154-4297-b786-fb141ade4ee6',
              },
            ],
          },
          {
            OR: [
              {
                text: 'stick',
              },
              {
                text: 'wood',
              },
            ],
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
    name: 'place pointIn with polygon around Rome sample point',
    input: {
      searchCriteria: {
        _scope: 'place',
        pointIn:
          'POLYGON ((12.47 41.90, 12.50 41.90, 12.50 41.93, 12.47 41.93, 12.47 41.90))',
      },
    },
    expected: {
      error: false,
      value: 12,
    },
  },
  {
    name: 'place regionRelates intersects with known Mexico polygon',
    input: {
      searchCriteria: {
        _scope: 'place',
        regionRelates:
          'POLYGON ((-99.20574999999999 19.29684, -99.09908 19.29684, -99.09908 19.35957, -99.20574999999999 19.35957, -99.20574999999999 19.29684))',
      },
    },
    expected: {
      error: false,
      value: 4,
    },
  },
  {
    name: 'place regionRelates with non-default operator equals',
    input: {
      searchCriteria: {
        _scope: 'place',
        _comp: 'equals',
        regionRelates: 'POINT (12.4833 41.9167)',
      },
    },
    expected: {
      error: false,
      value: 1,
    },
  },
  {
    name: 'place regionRelates with invalid operator',
    input: {
      searchCriteria: {
        _scope: 'place',
        _comp: 'bogus-op',
        regionRelates: 'POINT (12.4833 41.9167)',
      },
    },
    expected: {
      error: true,
      stackToInclude: 'Unsupported geospatial operator',
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
    const scp = new SCP();

    scp.prepare({
      searchCriteria: scenario.input.searchCriteria,
      scopeName: null, // scopeName from criteria
      allowMultiScope: scenario.input.allowMultiScope ?? false,
      patternOptions: new PatternOptions(),
      includeTypeConstraint: true,
      filterResults: true,
      page: 1,
      pageLength: 20,
      pageWith: null,
      sortCriteria: null,
    });

    return scp.getEstimate();
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
