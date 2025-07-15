import {
  COLLECTION_NAME_MY_COLLECTION,
  COLLECTION_NAME_USER_PROFILE,
} from '/lib/appConstants.mjs';
import { getDefaultCollection } from '/lib/model.mjs';
import { deleteDocument } from '/lib/crudLib.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { handleRequestV2ForUnitTesting } from '/lib/securityLib.mjs';
import { testHelperProxy } from '/test/test-helper.mjs';
import {
  HMO_URI,
  ROLE_NAME_TENANT_ENDPOINT_CONSUMER,
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';

const LIB = '0400 deleteDocument.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

//
// START: Collect a few bits the tests require.  Need to jump through some hoops to get them,
//        including temporarily granting Bonnie the tenant endpoint consumer role
//        (which handleRequest does for us while executing the tests).
//
xdmp.invokeFunction(
  () => {
    declareUpdate();
    const sec = require('/MarkLogic/security.xqy');
    sec.userAddRoles(USERNAME_FOR_BONNIE, ROLE_NAME_TENANT_ENDPOINT_CONSUMER);
  },
  { database: xdmp.securityDatabase() }
);

// Get the URIs of documents required by these tests.
const {
  hmoUri,
  userProfileUri,
  defaultMyCollectionUri,
  nonDefaultMyCollectionUri,
} = fn.head(
  xdmp.invokeFunction(
    () => {
      const hmoDoc = cts.doc(HMO_URI);
      const userProfileDoc = fn.head(
        cts.search(cts.collectionQuery(COLLECTION_NAME_USER_PROFILE))
      );
      const defaultMyCollectionUri = getDefaultCollection(userProfileDoc) + '';
      const nonDefaultMyCollection = fn
        .subsequence(
          cts.search(cts.collectionQuery(COLLECTION_NAME_MY_COLLECTION)),
          1,
          2
        )
        .toArray()
        .filter((doc) => {
          return doc.baseURI !== defaultMyCollectionUri;
        })[0];

      return {
        hmoUri: hmoDoc ? hmoDoc.baseURI : null,
        userProfileUri: userProfileDoc ? userProfileDoc.baseURI : null,
        defaultMyCollectionUri,
        nonDefaultMyCollectionUri: nonDefaultMyCollection
          ? nonDefaultMyCollection.baseURI
          : null,
      };
    },
    {
      userId: xdmp.user(USERNAME_FOR_BONNIE),
    }
  )
);
assertions.push(
  testHelperProxy.assertExists(
    hmoUri,
    `The deleteDocument tests are dependent on finding a document with a type that the function should not accept.`
  )
);
assertions.push(
  testHelperProxy.assertExists(
    userProfileUri,
    `The deleteDocument tests are dependent on the create/updateDocument tests creating a user profile for '${USERNAME_FOR_BONNIE}'`
  )
);
assertions.push(
  testHelperProxy.assertExists(
    defaultMyCollectionUri,
    `The deleteDocument tests are dependent on the create/updateDocument tests creating a default My Collection document '${USERNAME_FOR_BONNIE}' can access`
  )
);
assertions.push(
  testHelperProxy.assertExists(
    nonDefaultMyCollectionUri,
    `The deleteDocument tests are dependent on the create/updateDocument tests creating a non-default My Collection document '${USERNAME_FOR_BONNIE}' can access`
  )
);

xdmp.invokeFunction(
  () => {
    declareUpdate();
    const sec = require('/MarkLogic/security.xqy');
    sec.userRemoveRoles(
      USERNAME_FOR_BONNIE,
      ROLE_NAME_TENANT_ENDPOINT_CONSUMER
    );
  },
  { database: xdmp.securityDatabase() }
);
//
// END: OK, let's get on with the tests.
//

const endpointConfig = new EndpointConfig({
  allowInReadOnlyMode: false,
  features: { myCollections: true },
});

const newPropertyName = `name${xdmp.random()}`;
const newProperty = {};
newProperty[newPropertyName] = `value${xdmp.random()}`;

const scenarios = [
  {
    name: 'Service account attempting to delete a HMO document',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      uri: hmoUri,
    },
    expected: {
      error: true,
      stackToInclude: `Service accounts are not permitted to use this endpoint`,
    },
  },
  {
    name: 'Service account attempting to delete a My Collection',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      uri: defaultMyCollectionUri,
    },
    expected: {
      error: true,
      stackToInclude: `Service accounts are not permitted to use this endpoint`,
    },
  },
  {
    name: 'Service account attempting to delete a user profile',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      uri: userProfileUri,
    },
    expected: {
      error: true,
      stackToInclude: `Service accounts are not permitted to use this endpoint`,
    },
  },
  {
    name: 'Regular user attempting to delete a HMO document',
    input: {
      username: USERNAME_FOR_BONNIE,
      uri: hmoUri,
    },
    expected: {
      error: true,
      stackToInclude: `The document type is not supported`,
    },
  },
  {
    name: 'Regular user attempting to delete a non-default My Collection of theirs',
    input: {
      username: USERNAME_FOR_BONNIE,
      uri: nonDefaultMyCollectionUri,
    },
    expected: {
      error: false,
    },
  },
  {
    name: 'Regular user attempting to delete their default My Collection',
    input: {
      username: USERNAME_FOR_BONNIE,
      uri: defaultMyCollectionUri,
    },
    expected: {
      error: true,
      stackToInclude: `Default personal collections may not be deleted`,
    },
  },
  {
    name: 'Regular user attempting to delete their user profile',
    input: {
      username: USERNAME_FOR_BONNIE,
      uri: userProfileUri,
    },
    expected: {
      error: true,
      stackToInclude: `The document type is not supported`,
    },
  },
  {
    name: 'Regular user attempting to delete an unidentified document',
    input: {
      username: USERNAME_FOR_BONNIE,
      uri: null,
    },
    expected: {
      error: true,
      stackToInclude: `The URI is required`,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const innerZeroArityFun = () => {
      declareUpdate();
      return deleteDocument(scenario.input.uri);
    };
    const unitName = null;
    // These tests are dependent on handleRequest creating the user's exclusive roles.
    return handleRequestV2ForUnitTesting(
      innerZeroArityFun,
      unitName,
      endpointConfig
    );
  };
  const scenarioResults = executeScenario(scenario, zeroArityFun, {
    userId: xdmp.user(scenario.input.username),
  });

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const docAvailable = () => {
      return fn.docAvailable(scenario.input.uri);
    };
    assertions.push(
      testHelperProxy.assertFalse(
        xdmp.invokeFunction(docAvailable, {
          userId: xdmp.user(scenario.input.username),
        }),
        `Scenario '${scenario.name}' did not delete ${scenario.input.uri}.`
      )
    );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
