import {
  COLLECTION_NAME_MY_COLLECTION,
  COLLECTION_NAME_USER_PROFILE,
} from '/lib/appConstants.mjs';
import { updateDocument } from '/lib/crudLib.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { IDENTIFIERS } from '/lib/identifierConstants.mjs';
import { handleRequestV2ForUnitTesting } from '/lib/securityLib.mjs';
import { testHelperProxy } from '/test/test-helper.mjs';
import {
  HMO_URI,
  ROLE_NAME_TENANT_ENDPOINT_CONSUMER,
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import {
  getNodeFromObject,
  getObjectFromNode,
  isDefined,
} from '/utils/utils.mjs';

const LIB = '0300 updateDocument.mjs';
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

const userProfileDocNode = fn.head(
  xdmp.invokeFunction(
    () => {
      return fn.head(
        cts.search(cts.collectionQuery(COLLECTION_NAME_USER_PROFILE))
      );
    },
    {
      userId: xdmp.user(USERNAME_FOR_BONNIE),
    }
  )
);
assertions.push(
  testHelperProxy.assertExists(
    userProfileDocNode,
    `The updateDocument tests are dependent on the createDocument tests creating a user profile for '${USERNAME_FOR_BONNIE}'`
  )
);
const userProfileUri = fn.baseUri(userProfileDocNode) + '';

// Get a record whose type should not be accepted by updateDocument.
const hmoDocNode = fn.head(
  xdmp.invokeFunction(
    () => {
      return cts.doc(HMO_URI);
    },
    {
      userId: xdmp.user(USERNAME_FOR_BONNIE),
    }
  )
);
assertions.push(
  testHelperProxy.assertExists(
    hmoDocNode,
    `The updateDocument tests are dependent on finding a document with a type that the function should not accept.`
  )
);
// Add the ID
const hmoDocObj = getObjectFromNode(hmoDocNode);
hmoDocObj.id = HMO_URI;

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

// Get an existing My Collection for this user.
const myCollectionDocNode = fn.head(
  xdmp.invokeFunction(
    () => {
      return fn.head(
        cts.search(cts.collectionQuery(COLLECTION_NAME_MY_COLLECTION))
      );
    },
    {
      userId: xdmp.user(USERNAME_FOR_BONNIE),
    }
  )
);
assertions.push(
  testHelperProxy.assertExists(
    myCollectionDocNode,
    `The updateDocument tests are dependent on the createDocument tests creating a My Collection document '${USERNAME_FOR_BONNIE}' can access`
  )
);
const myCollectionUri = myCollectionDocNode.baseURI;

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
    name: 'Regular user updating their profile',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: {
        id: userProfileUri,
        type: 'Person',
        classified_as: [
          {
            id: 'https://not.checked',
            equivalent: [
              {
                id: IDENTIFIERS.userProfile,
              },
            ],
          },
        ],
        ...newProperty,
      },
    },
    expected: {
      error: false,
      nodeAssertions: [
        {
          type: 'xpath',
          xpath: `id = '${userProfileUri}'`,
          expected: true,
          message: 'The ID property changed',
        },
        {
          type: 'xpath',
          xpath: `exists(added_to_by)`,
          expected: true,
          message: 'The added_to_by property is missing',
        },
        {
          type: 'equality',
          xpath: `created_by`,
          expected: userProfileDocNode.xpath('json/created_by'),
          message: 'The created_by property was not restored',
        },
        {
          type: 'equality',
          xpath: newPropertyName,
          expected: getNodeFromObject(newProperty).xpath(newPropertyName),
          message: `The ${newPropertyName} property was not retained as given`,
        },
      ],
    },
  },
  {
    name: 'Service account attempting to update a profile',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      doc: {
        id: userProfileUri,
        type: 'Person',
        classified_as: [
          {
            id: 'https://not.checked',
            equivalent: [
              {
                id: IDENTIFIERS.userProfile,
              },
            ],
          },
        ],
      },
    },
    expected: {
      error: true,
      stackToInclude: `Service accounts are not permitted to use this endpoint`,
    },
  },
  {
    name: 'Regular user updating one of their My Collection documents',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: {
        id: myCollectionUri,
        type: 'Set',
        identified_by: [],
        classified_as: [
          {
            id: 'https://not.checked',
            equivalent: [
              {
                id: IDENTIFIERS.myCollection,
              },
            ],
          },
        ],
        ...newProperty,
      },
    },
    expected: {
      error: false,
      nodeAssertions: [
        {
          type: 'xpath',
          xpath: `id = '${myCollectionUri}'`,
          expected: true,
          message: 'The ID property changed',
        },
        {
          type: 'xpath',
          xpath: `exists(added_to_by)`,
          expected: true,
          message: 'The added_to_by property is missing',
        },
        {
          type: 'equality',
          xpath: `created_by`,
          expected: myCollectionDocNode.xpath('json/created_by'),
          message: 'The created_by property was not restored',
        },
        {
          type: 'equality',
          xpath: newPropertyName,
          expected: getNodeFromObject(newProperty).xpath(newPropertyName),
          message: `The ${newPropertyName} property was not retained as given`,
        },
      ],
    },
  },
  {
    name: 'ID mismatch',
    input: {
      username: USERNAME_FOR_BONNIE,
      idOverride: myCollectionUri + '-different-uri',
      doc: {
        id: myCollectionUri,
        type: 'Set',
        identified_by: [],
        classified_as: [
          {
            id: 'https://not.checked',
            equivalent: [
              {
                id: IDENTIFIERS.myCollection,
              },
            ],
          },
        ],
        ...newProperty,
      },
    },
    expected: {
      error: true,
      stackToInclude: `does not match the document ID`,
    },
  },
  {
    name: 'Service account attempting to update a My Collection',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      doc: {
        id: myCollectionUri,
        type: 'Set',
        identified_by: [],
        classified_as: [
          {
            id: 'https://not.checked',
            equivalent: [
              {
                id: IDENTIFIERS.myCollection,
              },
            ],
          },
        ],
      },
    },
    expected: {
      error: true,
      stackToInclude: `Service accounts are not permitted to use this endpoint`,
    },
  },
  {
    name: 'Invalid document type',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: hmoDocObj,
    },
    expected: {
      error: true,
      stackToInclude: `The document type is not supported`,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const innerZeroArityFun = () => {
      declareUpdate();
      return updateDocument(
        isDefined(scenario.input.idOverride)
          ? scenario.input.idOverride
          : scenario.input.doc.id,
        getNodeFromObject(scenario.input.doc)
      );
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
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
