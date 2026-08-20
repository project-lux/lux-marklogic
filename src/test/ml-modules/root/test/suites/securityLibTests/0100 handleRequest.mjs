import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { handleRequestForUnitTesting } from '/lib/securityLib.mjs';
import { FOO_URI } from '/test/unitTestConstants.mjs';

const LIB = '0100 handleRequest.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Little buddies used in more than one scenario.
const returnBar = () => {
  return 'bar';
};
const canReadDoc = () => {
  return fn.docAvailable(FOO_URI);
};

assertions.push(
  testHelperProxy.assertTrue(
    canReadDoc(),
    `Setup wasn't able to create ${FOO_URI}`,
  ),
);

const scenarios = [
  {
    name: 'Request returns the expected value',
    input: {
      function: returnBar,
    },
    expected: { error: false, value: returnBar() },
  },
  {
    name: 'Request able to access a document',
    input: {
      function: canReadDoc,
    },
    expected: { error: false, value: true },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return handleRequestForUnitTesting(scenario.input.function);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.value,
        scenarioResults.actualValue,
        `Scenario '${scenario.name}' did not return the expected value.`,
      ),
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
