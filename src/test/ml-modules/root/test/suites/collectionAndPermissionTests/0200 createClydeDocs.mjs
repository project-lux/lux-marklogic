// The sole purpose of this file is to create Clyde's user profile and default My Collection
// document, which just didn't seem possible in suiteSetup.mjs when it is also responsible
// for creating the tenant status document --despite doing so in a separate transaction.
declareUpdate();

import { testHelperProxy } from '/test/test-helper.mjs';
import { USERNAME_FOR_CLYDE } from '/test/unitTestConstants.mjs';
import { createDocument } from '/lib/crudLib.mjs';
import { handleRequestV2ForUnitTesting } from '/lib/securityLib.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { getNodeFromObject } from '/utils/utils.mjs';

const LIB = '0200 createClydeDocs.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Create Clyde's user profile and default collection.  Expect a ServerConfigurationChangedError
// on the first attempt as Clyde's exclusive roles need to be created.  Second attempt should
// result in the documents being created, which subsequent tests can verify the collections
// and permissions of.
const endpointConfig = new EndpointConfig({
  allowInReadOnlyMode: false,
  features: { myCollections: true },
});
const zeroArityFun = () => {
  const innerZeroArityFun = () => {
    declareUpdate();
    const newUserMode = false;
    return createDocument(getNodeFromObject({ foo: 'bar' }), newUserMode);
  };
  const unitName = null;
  return handleRequestV2ForUnitTesting(
    innerZeroArityFun,
    unitName,
    endpointConfig
  );
};
try {
  xdmp.invokeFunction(zeroArityFun, {
    userId: xdmp.user(USERNAME_FOR_CLYDE),
  });
  assertions.push(
    testHelperProxy.assertTrue(
      false,
      "Expected the ServerConfigurationChangedError to be thrown, but it wasn't"
    )
  );
} catch (e) {
  assertions.push(
    testHelperProxy.assertTrue(
      e.stack.includes('security profile changed'),
      'Expected ServerConfigurationChangedError error'
    )
  );

  // Try again, this time expecting a different error (as we're giving a bogus doc).
  try {
    xdmp.invokeFunction(zeroArityFun, {
      userId: xdmp.user(USERNAME_FOR_CLYDE),
    });
    assertions.push(
      testHelperProxy.assertTrue(
        false,
        "Expected the BadRequestError to be thrown, but it wasn't"
      )
    );
  } catch (e) {
    assertions.push(
      testHelperProxy.assertTrue(
        e.stack.includes('The document type is not supported'),
        'Expected BadRequestError error'
      )
    );
  }
}

console.log(`${LIB}: completed ${assertions.length} assertions.`);

assertions;
export default assertions;
