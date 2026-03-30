import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0270 walkParsedQuery.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Simple wordQuery without spaces',
    input: {
      ctsQueryObj: {
        wordQuery: {
          text: ['Pablo'],
          options: [],
        },
      },
    },
    expected: {
      error: false,
      result: {
        text: 'Pablo',
      },
    },
  },
  {
    name: 'WordQuery with spaces gets quoted',
    input: {
      ctsQueryObj: {
        wordQuery: {
          text: ['Pablo Picasso'],
          options: [],
        },
      },
    },
    expected: {
      error: false,
      result: {
        text: '"Pablo Picasso"',
      },
    },
  },
  {
    name: 'WordQuery with unstemmed option',
    input: {
      ctsQueryObj: {
        wordQuery: {
          text: ['artist'],
          options: ['unstemmed'],
        },
      },
    },
    expected: {
      error: false,
      result: {
        text: 'artist',
        _stemmed: false,
      },
    },
  },
  {
    name: 'WordQuery with language option',
    input: {
      ctsQueryObj: {
        wordQuery: {
          text: ['artiste'],
          options: ['lang=fr'],
        },
      },
    },
    expected: {
      error: false,
      result: {
        text: 'artiste',
        _lang: 'fr',
      },
    },
  },
  {
    name: 'WordQuery with multiple options',
    input: {
      ctsQueryObj: {
        wordQuery: {
          text: ['Pablo Picasso'],
          options: ['unstemmed', 'lang=es', 'unknown-option'],
        },
      },
    },
    expected: {
      error: false,
      result: {
        text: '"Pablo Picasso"',
        _stemmed: false,
        _lang: 'es',
      },
    },
  },
  {
    name: 'Simple andQuery with two word queries',
    input: {
      ctsQueryObj: {
        andQuery: {
          queries: [
            {
              wordQuery: {
                text: ['Pablo'],
                options: [],
              },
            },
            {
              wordQuery: {
                text: ['Picasso'],
                options: [],
              },
            },
          ],
        },
      },
    },
    expected: {
      error: false,
      result: {
        AND: [{ text: 'Pablo' }, { text: 'Picasso' }],
      },
    },
  },
  {
    name: 'Simple orQuery with two word queries',
    input: {
      ctsQueryObj: {
        orQuery: {
          queries: [
            {
              wordQuery: {
                text: ['Pablo'],
                options: [],
              },
            },
            {
              wordQuery: {
                text: ['Vincent'],
                options: [],
              },
            },
          ],
        },
      },
    },
    expected: {
      error: false,
      result: {
        OR: [{ text: 'Pablo' }, { text: 'Vincent' }],
      },
    },
  },
  {
    name: 'Simple notQuery with word query',
    input: {
      ctsQueryObj: {
        notQuery: {
          query: {
            wordQuery: {
              text: ['sculpture'],
              options: [],
            },
          },
        },
      },
    },
    expected: {
      error: false,
      result: {
        NOT: [{ text: 'sculpture' }],
      },
    },
  },
  {
    name: 'BoostQuery with matching and boosting queries',
    input: {
      ctsQueryObj: {
        boostQuery: {
          matchingQuery: {
            wordQuery: {
              text: ['Pablo'],
              options: [],
            },
          },
          boostingQuery: {
            wordQuery: {
              text: ['Picasso'],
              options: [],
            },
          },
        },
      },
    },
    expected: {
      error: false,
      result: {
        BOOST: [{ text: 'Pablo' }, { text: 'Picasso' }],
      },
    },
  },
  {
    name: 'Empty andQuery creates empty AND array',
    input: {
      ctsQueryObj: {
        andQuery: {
          queries: [],
        },
      },
    },
    expected: {
      error: false,
      result: {
        AND: [],
      },
    },
  },
  {
    name: 'Empty orQuery creates empty OR array',
    input: {
      ctsQueryObj: {
        orQuery: {
          queries: [],
        },
      },
    },
    expected: {
      error: false,
      result: {
        OR: [],
      },
    },
  },
  {
    name: 'AndQuery without queries property creates empty AND array',
    input: {
      ctsQueryObj: {
        andQuery: {},
      },
    },
    expected: {
      error: false,
      result: {
        AND: [],
      },
    },
  },
  {
    name: 'Complex nested query with AND, OR, and NOT',
    input: {
      ctsQueryObj: {
        andQuery: {
          queries: [
            {
              wordQuery: {
                text: ['Pablo'],
                options: [],
              },
            },
            {
              orQuery: {
                queries: [
                  {
                    wordQuery: {
                      text: ['Picasso'],
                      options: [],
                    },
                  },
                  {
                    wordQuery: {
                      text: ['Matisse'],
                      options: [],
                    },
                  },
                ],
              },
            },
            {
              notQuery: {
                query: {
                  wordQuery: {
                    text: ['sculpture'],
                    options: [],
                  },
                },
              },
            },
          ],
        },
      },
    },
    expected: {
      error: false,
      result: {
        AND: [
          { text: 'Pablo' },
          {
            OR: [{ text: 'Picasso' }, { text: 'Matisse' }],
          },
          {
            NOT: [{ text: 'sculpture' }],
          },
        ],
      },
    },
  },
  {
    name: 'Nested boostQuery within andQuery',
    input: {
      ctsQueryObj: {
        andQuery: {
          queries: [
            {
              wordQuery: {
                text: ['artist'],
                options: [],
              },
            },
            {
              boostQuery: {
                matchingQuery: {
                  wordQuery: {
                    text: ['Pablo'],
                    options: [],
                  },
                },
                boostingQuery: {
                  wordQuery: {
                    text: ['famous'],
                    options: [],
                  },
                },
              },
            },
          ],
        },
      },
    },
    expected: {
      error: false,
      result: {
        AND: [
          { text: 'artist' },
          {
            BOOST: [{ text: 'Pablo' }, { text: 'famous' }],
          },
        ],
      },
    },
  },
  {
    name: 'Empty object returns empty object',
    input: {
      ctsQueryObj: {},
    },
    expected: {
      error: false,
      result: {},
    },
  },
  {
    name: 'Unsupported query type throws error',
    input: {
      ctsQueryObj: {
        rangeQuery: {
          indexName: 'date',
          operator: 'GT',
          value: '2020-01-01',
        },
      },
    },
    expected: {
      error: true,
      stackToInclude:
        "rangeQuery' is not a supported portion of the search string grammar",
    },
  },
  {
    name: 'Multiple unsupported properties throws error for first one',
    input: {
      ctsQueryObj: {
        customQuery: {
          test: 'value',
        },
        anotherUnsupported: {
          test: 'value2',
        },
      },
    },
    expected: {
      error: true,
      stackToInclude: 'is not a supported portion of the search string grammar',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return SearchCriteriaProcessor.walkParsedQuery(scenario.input.ctsQueryObj);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        JSON.stringify(scenario.expected.result),
        JSON.stringify(scenarioResults.actualValue),
        `walkParsedQuery should return expected result for scenario: ${scenario.name}`,
      ),
    );
  }

  if (scenarioResults.applyErrorExpectedAssertions) {
    if (scenario.expected.stackToInclude) {
      assertions.push(
        testHelperProxy.assertTrue(
          scenarioResults.error.stack.includes(
            scenario.expected.stackToInclude,
          ),
          `Scenario '${scenario.name}' should include error message: ${scenario.expected.stackToInclude}`,
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
