import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { getRelatedListConfig } from '/config/relatedListsConfig.mjs';
import { getDeepCopy } from '/utils/utils.mjs';

const LIB = '0100 getRelatedListConfig.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Modification of frozen config throws TypeError',
    input: {
      scopeName: 'agent',
      relatedListName: 'relatedToAgent',
      makeDeepCopy: false,
    },
    expected: {
      error: true,
      stackToInclude: 'TypeError',
    },
  },
  {
    name: 'Modification of deep copy does not throw',
    input: {
      scopeName: 'agent',
      relatedListName: 'relatedToAgent',
      makeDeepCopy: true,
    },
    expected: {
      error: false,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const config = getRelatedListConfig(
      scenario.input.scopeName,
      scenario.input.relatedListName,
    );
    const target = scenario.input.makeDeepCopy ? getDeepCopy(config) : config;
    // Attempt to mutate a nested property value.
    target.searchConfigs[0].criteria[
      Object.keys(target.searchConfigs[0].criteria)[0]
    ] = 'tampered';
    return target.searchConfigs[0].criteria[
      Object.keys(target.searchConfigs[0].criteria)[0]
    ];
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);
  assertions = assertions.concat(scenarioResults.assertions);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        'tampered',
        scenarioResults.actualValue,
        `Scenario '${scenario.name}': deep copy should be mutable.`,
      ),
    );
  }
}

console.log(`${LIB}: finished.`);
assertions;
export default assertions;
