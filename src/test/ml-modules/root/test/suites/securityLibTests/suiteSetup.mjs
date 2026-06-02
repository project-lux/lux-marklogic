import {
  FOO_FILENAME,
  FOO_URI,
  USERNAME_FOR_BONNIE,
} from '/test/unitTestConstants.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { setTenantStatus } from '/lib/environmentLib.mjs';
import { handleRequestForUnitTesting } from '/lib/securityLib.mjs';
import { loadTestFile } from '/test/unitTestUtils.mjs';

const zeroArityFun = () => {
  declareUpdate();
  setTenantStatus(false, false);
};
xdmp.invokeFunction(zeroArityFun);

// Prime Bonnie's My Collections profile/roles so tests do not fail on the first-request retry behavior.
const myCollectionsEndpointConfig = new EndpointConfig({
  allowInReadOnlyMode: true,
  features: { myCollections: true },
});
const warmBonnieMyCollections = () => {
  return handleRequestForUnitTesting(
    () => true,
    null,
    myCollectionsEndpointConfig,
    true,
  );
};
const bonnieInvokeOptions = { userId: xdmp.user(USERNAME_FOR_BONNIE) };
try {
  xdmp.invokeFunction(warmBonnieMyCollections, bonnieInvokeOptions);
} catch (e) {
  if (
    !e.stack.includes('retry the request to enable the changes to take effect')
  ) {
    throw e;
  }
  xdmp.invokeFunction(warmBonnieMyCollections, bonnieInvokeOptions);
}

// Does not require declareUpdate();
loadTestFile(FOO_URI, FOO_FILENAME);
