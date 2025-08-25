declareUpdate();

import { testHelperProxy } from '/test/test-helper.mjs';
import { assertPermissionArraysMatch } from '/test/unitTestUtils.mjs';
import { TENANT_STATUS_URI, getTenantStatus } from '/lib/environmentLib.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  ROLE_NAME_DEPLOYER,
  ROLE_NAME_ENDPOINT_CONSUMER_BASE,
} from '/lib/securityLib.mjs';

const LIB = '0100 tenantStatus.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

try {
  getTenantStatus();
} catch (e) {
  assertions.push(
    testHelperProxy.assertTrue(
      false,
      `The testStatus tests are dependent on the tenant status document existing yet getTenantStatus() threw an error: ${e.message}`
    )
  );
}

// Check the collections.
let zeroArityFun = () => {
  return xdmp.documentGetCollections(TENANT_STATUS_URI);
};
assertions.push(
  testHelperProxy.assertEqualJson(
    [],
    xdmp.invokeFunction(zeroArityFun),
    'The tenant status document is not expected to be in any collections'
  )
);

// Check the permissions.  Couldn't get testHelperProxy.assertEqualJson to work here.
const actualPermissions = fn.head(
  xdmp.invokeFunction(() => {
    return xdmp.documentGetPermissions(TENANT_STATUS_URI);
  })
);
const expectedPermissions = [
  xdmp.permission(ROLE_NAME_DEPLOYER, CAPABILITY_READ),
  xdmp.permission(ROLE_NAME_DEPLOYER, CAPABILITY_UPDATE),
  xdmp.permission(ROLE_NAME_ENDPOINT_CONSUMER_BASE, CAPABILITY_READ),
];
assertPermissionArraysMatch(
  'tenant status',
  assertions,
  expectedPermissions,
  actualPermissions
);

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
export default assertions;
