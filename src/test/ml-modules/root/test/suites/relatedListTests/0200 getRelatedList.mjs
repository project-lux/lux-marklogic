import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getRelatedListConfig } from '/config/relatedListsConfig.mjs';
import { getRelatedList } from '/lib/relatedListsLib.mjs';
import { TOKEN_RUNTIME_PARAM } from '/lib/appConstants.mjs';

const LIB = '0200 getRelatedList.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Config not mutated after first getRelatedList call',
    input: {
      scopeName: 'agent',
      relatedListName: 'relatedToAgent',
      uri: 'https://lux.collections.yale.edu/data/person/does-not-exist',
    },
    expected: { error: false },
  },
  {
    name: 'Config not mutated after second call with different URI',
    input: {
      scopeName: 'agent',
      relatedListName: 'relatedToAgent',
      uri: 'https://lux.collections.yale.edu/data/person/also-does-not-exist',
    },
    expected: { error: false },
  },
];

// Snapshot the config before any calls.
const configSnapshot = JSON.stringify(
  getRelatedListConfig(
    scenarios[0].input.scopeName,
    scenarios[0].input.relatedListName,
  ),
);

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    getRelatedList({
      searchScopeName: scenario.input.scopeName,
      relatedListName: scenario.input.relatedListName,
      uri: scenario.input.uri,
      page: 1,
      pageLength: 25,
      filterResults: false,
      relationshipsPerRelation: 5,
      onlyCheckForOneRelatedItem: false,
    });
    return JSON.stringify(
      getRelatedListConfig(
        scenario.input.scopeName,
        scenario.input.relatedListName,
      ),
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);
  assertions = assertions.concat(scenarioResults.assertions);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const configAfter = scenarioResults.actualValue;

    assertions.push(
      testHelperProxy.assertEqual(
        configSnapshot,
        configAfter,
        `Scenario '${scenario.name}': config must match the pre-call snapshot.`,
      ),
    );

    assertions.push(
      testHelperProxy.assertTrue(
        configAfter.includes(TOKEN_RUNTIME_PARAM),
        `Scenario '${scenario.name}': config must still contain '${TOKEN_RUNTIME_PARAM}' tokens.`,
      ),
    );

    assertions.push(
      testHelperProxy.assertFalse(
        configAfter.includes(scenario.input.uri),
        `Scenario '${scenario.name}': config must not contain the request URI.`,
      ),
    );
  }
}

console.log(`${LIB}: finished.`);
assertions;
export default assertions;
