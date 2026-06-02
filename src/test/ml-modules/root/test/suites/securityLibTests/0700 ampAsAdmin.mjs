import { testHelperProxy } from '/test/test-helper.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { ENDPOINTS_CONFIG } from '/config/endpointsConfig.mjs';
import { USERNAME_FOR_BONNIE } from '/test/unitTestConstants.mjs';
import {
  handleRequestForUnitTesting,
  getEndpointAccessUnitNames,
} from '/lib/securityLib.mjs';
import { isDefined } from '/utils/utils.mjs';

const LIB = '0700 ampAsAdmin.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// f() is called by _handleRequest. On the amped path (__executeAsAdmin), MarkLogic passes
// hasAdmin as an argument because amp-context module state is isolated from non-amp state,
// so return values / arguments are the only way to communicate across the boundary.
// On the non-amped path, f() is called with no arguments, so hasAdmin is undefined.
const f = () => {
  return xdmp
    .getCurrentRoles()
    .toArray()
    .map((roleId) => xdmp.roleName(roleId));
};

const normalizeArrayRoleNames = (arr) => {
  const asStrings = arr.map((name) => `${name}`.trim()).filter((name) => name);

  // Some invoke/amp paths return one array entry containing all roles as CSV.
  if (asStrings.length === 1 && asStrings[0].includes(',')) {
    return asStrings[0]
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name);
  }

  return asStrings;
};

const toRoleNamesArray = (roleNames) => {
  if (Array.isArray(roleNames)) {
    return normalizeArrayRoleNames(roleNames);
  }
  if (roleNames && typeof roleNames.toArray === 'function') {
    return normalizeArrayRoleNames(roleNames.toArray());
  }
  if (typeof roleNames === 'string') {
    try {
      const parsed = JSON.parse(roleNames);
      if (Array.isArray(parsed)) {
        return normalizeArrayRoleNames(parsed);
      }
    } catch (e) {
      // Fall through to scalar handling.
    }
    return normalizeArrayRoleNames([roleNames]);
  }
  if (!isDefined(roleNames)) {
    return [];
  }
  return normalizeArrayRoleNames([`${roleNames}`]);
};
const hasAdminRole = (roleNames) => {
  return toRoleNamesArray(roleNames).some((roleName) => {
    return `${roleName}`.trim() === 'admin';
  });
};

const firstUnitName = getEndpointAccessUnitNames()[0];
let testCount = 0;
for (const key of Object.keys(ENDPOINTS_CONFIG)) {
  console.log(`Processing endpoint '${key}'...`);
  const endpointConfig = new EndpointConfig(ENDPOINTS_CONFIG[key]);

  // b & c: with the tenant owner (null), the admin role must be
  //        present iff the endpoint declares ampAsAdmin: true.
  // For My Collections endpoints, run as Bonnie (non-service account); for others, run as current user.
  let tenantOwnerRoleNames;
  if (endpointConfig.features.myCollections) {
    tenantOwnerRoleNames = fn.head(
      xdmp.invokeFunction(
        () => handleRequestForUnitTesting(f, null, endpointConfig, true),
        { userId: xdmp.user(USERNAME_FOR_BONNIE) },
      ),
    );
  } else {
    tenantOwnerRoleNames = handleRequestForUnitTesting(
      f,
      null,
      endpointConfig,
      false,
    );
  }
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
  testCount++;

  // d: a specific unit's service account must never receive the admin role, even
  //    when the endpoint declares ampAsAdmin: true.
  // NOTE: only test non-My Collections endpoints for service accounts, since service accounts
  //       are blocked at the My Collections validation layer before amp-as-admin logic runs.
  if (firstUnitName && !endpointConfig.features.myCollections) {
    const unitRoleNames = handleRequestForUnitTesting(
      f,
      firstUnitName,
      endpointConfig,
      false,
    );
    const unitHasAdmin = hasAdminRole(toRoleNamesArray(unitRoleNames));

    assertions.push(
      testHelperProxy.assertTrue(
        !unitHasAdmin,
        `Endpoint '${key}': expected admin role NOT to be present for unit '${firstUnitName}' but it was.`,
      ),
    );
    testCount++;
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${testCount} endpoints.`,
);

assertions;
export default assertions;
