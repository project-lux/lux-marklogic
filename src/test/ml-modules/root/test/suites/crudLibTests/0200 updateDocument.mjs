import { testHelperProxy } from '/test/test-helper.mjs';
import {
  ROLE_NAME_TENANT_ENDPOINT_CONSUMER,
  USERNAME_FOR_REGULAR_USER,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';
import { executeScenario, removeCollections } from '/test/unitTestUtils.mjs';
import { updateDocument } from '/lib/crudLib.mjs';
import { handleRequestV2ForUnitTesting } from '/lib/securityLib.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { IDENTIFIERS } from '/lib/identifierConstants.mjs';
import { COLLECTION_NAME_USER_PROFILE } from '/lib/appConstants.mjs';
import { User } from '/lib/User.mjs';

const LIB = '0200 updateDocument.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

//
// START: Get the User instance for the regular user.  Need to temporarily grant the tenant endpoint consumer role.
//
xdmp.invokeFunction(
  () => {
    declareUpdate();
    const sec = require('/MarkLogic/security.xqy');
    sec.userAddRoles(
      USERNAME_FOR_REGULAR_USER,
      ROLE_NAME_TENANT_ENDPOINT_CONSUMER
    );
  },
  { database: xdmp.securityDatabase() }
);

const existingUser = fn.head(
  xdmp.invokeFunction(
    () => {
      console.log(`Creating user instance for ${xdmp.getCurrentUser()}`);
      return new User(true); // retrieve user profile as this user.
    },
    { userId: xdmp.user(USERNAME_FOR_REGULAR_USER) }
  )
);
const existingUserProfile = existingUser.getUserProfile();
assertions.push(
  testHelperProxy.assertExists(
    existingUserProfile,
    `The updateDocument tests are dependent on the createDocument tests creating a user profile for '${USERNAME_FOR_REGULAR_USER}'`
  )
);

xdmp.invokeFunction(
  () => {
    declareUpdate();
    const sec = require('/MarkLogic/security.xqy');
    sec.userRemoveRoles(
      USERNAME_FOR_REGULAR_USER,
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

const scenarios = [
  {
    name: 'Regular user updating their profile',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      doc: {
        id: existingUser.getUserIri(),
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
      error: false,
      nodeAssertions: [
        {
          type: 'equality',
          xpath: `created_by`,
          expected: existingUserProfile.xpath('json/created_by'),
          message: 'The created_by property was not restored.',
        },
      ],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const innerZeroArityFun = () => {
      declareUpdate();
      return updateDocument(xdmp.toJSON(scenario.input.doc));
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
