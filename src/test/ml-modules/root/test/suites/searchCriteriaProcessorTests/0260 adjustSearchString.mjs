import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0260 adjustSearchString.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Simple text without special characters',
    input: {
      queryString: 'Pablo Picasso',
    },
    expected: {
      error: false,
      result: 'Pablo Picasso',
    },
  },
  {
    name: 'Text with brackets removes brackets',
    input: {
      queryString: 'Pablo [artist] Picasso',
    },
    expected: {
      error: false,
      result: 'Pablo  artist  Picasso',
    },
  },
  {
    name: 'Text with multiple brackets removes all brackets',
    input: {
      queryString: '[modern] artist [Pablo] Picasso [cubism]',
    },
    expected: {
      error: false,
      result: ' modern  artist  Pablo  Picasso  cubism ',
    },
  },
  {
    name: 'Quoted single word gets unstemmed marker',
    input: {
      queryString: '"artist"',
    },
    expected: {
      error: false,
      result: '"artist"[unstemmed]',
    },
  },
  {
    name: 'Quoted multiple words do not get unstemmed marker',
    input: {
      queryString: '"Pablo Picasso"',
    },
    expected: {
      error: false,
      result: '"Pablo Picasso"',
    },
  },
  {
    name: 'Mixed quoted and unquoted terms',
    input: {
      queryString: 'artist "Pablo Picasso" painter',
    },
    expected: {
      error: false,
      result: 'artist "Pablo Picasso" painter',
    },
  },
  {
    name: 'Terms with colons get quoted',
    input: {
      queryString: 'http://example.org painter',
    },
    expected: {
      error: false,
      result: '"http://example.org" painter',
    },
  },
  {
    name: 'Multiple colon terms get quoted',
    input: {
      queryString: 'http://example.org created:1907 type:Painting',
    },
    expected: {
      error: false,
      result: '"http://example.org" "created:1907" "type:Painting"',
    },
  },
  {
    name: 'AND operator normalization preserves case',
    input: {
      queryString: 'Pablo AND Picasso',
    },
    expected: {
      error: false,
      result: 'Pablo AND Picasso',
    },
  },
  {
    name: 'OR operator normalization preserves case',
    input: {
      queryString: 'Pablo OR Vincent',
    },
    expected: {
      error: false,
      result: 'Pablo OR Vincent',
    },
  },
  {
    name: 'NOT_IN operator normalization preserves case',
    input: {
      queryString: 'Pablo NOT_IN sculpture',
    },
    expected: {
      error: false,
      result: 'Pablo NOT_IN sculpture',
    },
  },
  {
    name: 'BOOST operator normalization preserves case',
    input: {
      queryString: 'Pablo BOOST Picasso',
    },
    expected: {
      error: false,
      result: 'Pablo BOOST Picasso',
    },
  },
  {
    name: 'Lowercase and operator gets normalized',
    input: {
      queryString: 'Pablo and Picasso',
    },
    expected: {
      error: false,
      result: 'Pablo AND Picasso',
    },
  },
  {
    name: 'Mixed case or operator gets normalized',
    input: {
      queryString: 'Pablo Or Vincent',
    },
    expected: {
      error: false,
      result: 'Pablo OR Vincent',
    },
  },
  {
    name: 'Lowercase not_in operator gets normalized',
    input: {
      queryString: 'Pablo not_in sculpture',
    },
    expected: {
      error: false,
      result: 'Pablo NOT_IN sculpture',
    },
  },
  {
    name: 'Mixed case boost operator gets normalized',
    input: {
      queryString: 'Pablo boost Picasso',
    },
    expected: {
      error: false,
      result: 'Pablo BOOST Picasso',
    },
  },
  {
    name: 'NEAR operator gets downcased',
    input: {
      queryString: 'Pablo NEAR Picasso',
    },
    expected: {
      error: false,
      result: 'Pablo near Picasso',
    },
  },
  {
    name: 'Complex query with multiple features',
    input: {
      queryString:
        'Pablo AND "Les Demoiselles" [cubism] created:1907 NEAR Avignon NOT_IN sculpture',
    },
    expected: {
      error: false,
      result:
        'Pablo AND "Les Demoiselles"  cubism  "created:1907" near Avignon NOT_IN sculpture',
    },
  },
  {
    name: 'Query with brackets inside quotes preserves brackets',
    input: {
      queryString: '"Pablo [the artist] Picasso"',
    },
    expected: {
      error: false,
      result: '"Pablo [the artist] Picasso"',
    },
  },
  {
    name: 'Mixed quoted single word and colon terms',
    input: {
      queryString: '"artist" type:Person',
    },
    expected: {
      error: false,
      result: '"artist"[unstemmed] "type:Person"',
    },
  },
  {
    name: 'Empty string returns empty string',
    input: {
      queryString: '',
    },
    expected: {
      error: false,
      result: '',
    },
  },
  {
    name: 'Whitespace only string returns whitespace',
    input: {
      queryString: '   ',
    },
    expected: {
      error: false,
      result: '   ',
    },
  },
  {
    name: 'Query with only quotes returns quotes with unstemmed',
    input: {
      queryString: '""',
    },
    expected: {
      error: false,
      result: '""[unstemmed]',
    },
  },
  {
    name: 'Query with nested quotes handling',
    input: {
      queryString: '"Pablo" AND "Vincent van Gogh" NOT_IN "sculpture art"',
    },
    expected: {
      error: false,
      result:
        '"Pablo"[unstemmed] AND "Vincent van Gogh" NOT_IN "sculpture art"',
    },
  },
  {
    name: 'Operators with extra spaces get normalized',
    input: {
      queryString: 'Pablo  and   Picasso  boost   Vincent',
    },
    expected: {
      error: false,
      result: 'Pablo  AND   Picasso  BOOST   Vincent',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return SearchCriteriaProcessor.adjustSearchString(
      scenario.input.queryString,
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.result,
        scenarioResults.actualValue,
        `adjustSearchString should return "${scenario.expected.result}" for scenario: ${scenario.name}`,
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
