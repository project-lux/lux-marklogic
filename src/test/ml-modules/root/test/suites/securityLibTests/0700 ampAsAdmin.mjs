import { testHelperProxy } from '/test/test-helper.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { ENDPOINTS_CONFIG } from '/config/endpointsConfig.mjs';
import {
  handleRequestForUnitTesting,
  getEndpointAccessUnitNames,
} from '/lib/securityLib.mjs';

let assertions = [];

// f() is called by _handleRequest. On the amped path (__executeAsAdmin), MarkLogic passes
// hasAdmin as an argument because amp-context module state is isolated from non-amp state,
// so return values / arguments are the only way to communicate across the boundary.
// On the non-amped path, f() is called with no arguments, so hasAdmin is undefined.
const f = (hasAdmin) => hasAdmin === true;

const firstUnitName = getEndpointAccessUnitNames()[0];
let testCount = 0;
for (const key of Object.keys(ENDPOINTS_CONFIG)) {
  const endpointConfig = new EndpointConfig(ENDPOINTS_CONFIG[key]);

  // b & c: with the tenant owner (null → TENANT_OWNER), the admin role must be
  //        present iff the endpoint declares ampAsAdmin: true.
  const tenantOwnerHasAdmin = handleRequestForUnitTesting(
    f,
    null,
    endpointConfig,
  );

  if (endpointConfig.mayAmpAsAdmin()) {
    assertions.push(
      testHelperProxy.assertTrue(
        tenantOwnerHasAdmin,
        `Endpoint '${key}' (ampAsAdmin=true): expected admin role to be present for the tenant owner but it was not.`,
      ),
    );
  } else {
    assertions.push(
      testHelperProxy.assertTrue(
        !tenantOwnerHasAdmin,
        `Endpoint '${key}' (ampAsAdmin=false): expected admin role NOT to be present for the tenant owner but it was.`,
      ),
    );
  }
  testCount++;

  // d: a specific unit's service account must never receive the admin role, even
  //    when the endpoint declares ampAsAdmin: true.
  if (firstUnitName) {
    const unitHasAdmin = handleRequestForUnitTesting(
      f,
      firstUnitName,
      endpointConfig,
    );

    assertions.push(
      testHelperProxy.assertTrue(
        !unitHasAdmin,
        `Endpoint '${key}': expected admin role NOT to be present for unit '${firstUnitName}' but it was.`,
      ),
    );
    testCount++;
  }
}

assertions;
export default assertions;
