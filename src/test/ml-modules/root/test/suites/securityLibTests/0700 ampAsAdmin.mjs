import { testHelperProxy } from '/test/test-helper.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { ENDPOINTS_CONFIG } from '/config/endpointsConfig.mjs';
import {
  handleRequestForUnitTesting,
  getEndpointAccessUnitNames,
} from '/lib/securityLib.mjs';
import { toArray } from '/utils/utils.mjs';

const LIB = '0700 ampAsAdmin.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Return the effective roles when in handleRequestForUnitTesting.
const f = () => {
  return xdmp
    .getCurrentRoles()
    .toArray()
    .map((roleId) => xdmp.roleName(roleId));
};

const toRoleNamesArray = (roleNames) => {
  // fn.head(xdmp.invokeFunction(...)) gives us the first sequence item, but invoke/amp
  // boundaries do not always preserve native JS array shape. Sometimes roles arrive as
  // one comma-delimited string item, so normalize both representations to string[].
  const normalized = toArray(roleNames, 'string')
    .map((roleName) => roleName.trim())
    .filter((roleName) => roleName.length > 0);

  // Some invoke/amp paths return all role names as a single comma-delimited value.
  if (normalized.length === 1 && normalized[0].includes(',')) {
    return normalized[0]
      .split(',')
      .map((roleName) => roleName.trim())
      .filter((roleName) => roleName.length > 0);
  }

  return normalized;
};

const hasAdminRole = (roleNames) => {
  return toRoleNamesArray(roleNames).some((roleName) => {
    return `${roleName}`.trim() === 'admin';
  });
};

const firstUnitName = getEndpointAccessUnitNames()[0];
let endpointCount = 0;
for (const key of Object.keys(ENDPOINTS_CONFIG)) {
  endpointCount++;
  console.log(`Processing endpoint '${key}'...`);
  const endpointConfig = new EndpointConfig(ENDPOINTS_CONFIG[key]);

  // With the tenant owner (null), the admin role must be present iff the endpoint
  // declares ampAsAdmin: true.
  const tenantOwnerRoleNames = handleRequestForUnitTesting(
    f,
    null,
    endpointConfig,
  );
  const tenantOwnerRoleNamesArr = toRoleNamesArray(tenantOwnerRoleNames);
  const tenantOwnerHasAdmin = hasAdminRole(tenantOwnerRoleNamesArr);

  if (endpointConfig.mayAmpAsAdmin()) {
    assertions.push(
      testHelperProxy.assertTrue(
        tenantOwnerHasAdmin,
        `Endpoint '${key}' (ampAsAdmin=true): expected admin role to be present but it was not.`,
      ),
    );
  } else {
    assertions.push(
      testHelperProxy.assertTrue(
        !tenantOwnerHasAdmin,
        `Endpoint '${key}' (ampAsAdmin=false): expected admin role NOT to be present but it was.`,
      ),
    );
  }

  // A specific unit's service account must never receive the admin role, even when the
  // endpoint declares ampAsAdmin: true.
  if (firstUnitName) {
    const unitRoleNames = handleRequestForUnitTesting(
      f,
      firstUnitName,
      endpointConfig,
    );
    const unitRoleNamesArr = toRoleNamesArray(unitRoleNames);
    const unitHasAdmin = hasAdminRole(unitRoleNamesArr);

    assertions.push(
      testHelperProxy.assertTrue(
        !unitHasAdmin,
        `Endpoint '${key}': expected admin role NOT to be present for unit '${firstUnitName}' but it was.`,
      ),
    );
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${endpointCount} endpoints.`,
);

assertions;
export default assertions;
