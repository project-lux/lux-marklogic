// Unlike most test files, this one tests multiple functions --all related to tenant status.
import { testHelperProxy } from '/test/test-helper.mjs';
import { USERNAME_FOR_BONNIE } from '/test/unitTestConstants.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import {
  getTenantStatus,
  inReadOnlyMode,
  isProduction,
  setTenantStatus,
} from '/lib/environmentLib.mjs';

const LIB = '0100 tenantStatusTests.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Regular user attempting to set tenant status',
    input: {
      username: USERNAME_FOR_BONNIE,
      prod: true,
      readOnly: false,
    },
    expected: {
      error: true,
      stackToInclude: 'Need privilege',
    },
  },
  {
    name: 'Unit tester with invalid prod value',
    input: {
      username: xdmp.getCurrentUser(),
      prod: 'prod',
      readOnly: true,
    },
    expected: {
      error: true,
      stackToInclude: 'Must be a boolean',
    },
  },
  {
    name: 'Unit tester with invalid readOnly value',
    input: {
      username: xdmp.getCurrentUser(),
      prod: true,
      readOnly: 'readOnly',
    },
    expected: {
      error: true,
      stackToInclude: 'Must be a boolean',
    },
  },
  {
    name: 'Unit tester setting tenant status to true/true',
    input: {
      username: xdmp.getCurrentUser(),
      prod: true,
      readOnly: true,
    },
    expected: {
      error: false,
    },
  },
  {
    name: 'Unit tester setting tenant status to true/false',
    input: {
      username: xdmp.getCurrentUser(),
      prod: true,
      readOnly: false,
    },
    expected: {
      error: false,
    },
  },
  {
    name: 'Unit tester setting tenant status to false/true',
    input: {
      username: xdmp.getCurrentUser(),
      prod: false,
      readOnly: true,
    },
    expected: {
      error: false,
    },
  },
  {
    name: 'Unit tester setting tenant status to false/false',
    input: {
      username: xdmp.getCurrentUser(),
      prod: false,
      readOnly: false,
    },
    expected: {
      error: false,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    declareUpdate();
    return setTenantStatus(scenario.input.prod, scenario.input.readOnly);
  };
  const scenarioResults = executeScenario(scenario, zeroArityFun, {
    userId: xdmp.user(scenario.input.username),
  });

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (!scenario.expected.error) {
    const tenantStatus = fn.head(xdmp.invokeFunction(getTenantStatus));
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.input.prod,
        tenantStatus.prod,
        `Unexpected production status from getTenantStatus in the '${scenario.name}' scenario`
      )
    );
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.input.readOnly,
        tenantStatus.readOnly,
        `Unexpected read-only status from getTenantStatus in the '${scenario.name}' scenario`
      )
    );

    const isProd = xdmp.invokeFunction(isProduction);
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.input.prod,
        isProd,
        `Unexpected production status from isProduction in the '${scenario.name}' scenario`
      )
    );

    const isReadOnly = xdmp.invokeFunction(inReadOnlyMode);
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.input.readOnly,
        isReadOnly,
        `Unexpected read-only status from inReadOnlyMode in the '${scenario.name}' scenario`
      )
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
export default assertions;
