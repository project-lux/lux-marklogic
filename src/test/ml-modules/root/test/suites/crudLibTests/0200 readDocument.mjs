import { USERNAME_FOR_CLYDE } from '../../unitTestConstants.mjs';
import { COLLECTION_NAME_USER_PROFILE } from '/lib/appConstants.mjs';
import { PROP_NAME_DEFAULT_COLLECTION } from '/lib/model.mjs';
import { readDocument } from '/lib/crudLib.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { handleRequestV2ForUnitTesting } from '/lib/securityLib.mjs';
import { testHelperProxy } from '/test/test-helper.mjs';
import {
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';

const LIB = '0200 readDocument.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

// Find out Bonnie's user profile URI.
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
    `The readDocument tests are dependent on the createDocument tests creating a user profile for '${USERNAME_FOR_BONNIE}'`
  )
);
assertions.push(
  testHelperProxy.assertTrue(
    userProfileDocNode.xpath('exists(indexedProperties)'),
    'The indexedProperties property is missing from the user profile document'
  )
);
assertions.push(
  testHelperProxy.assertFalse(
    userProfileDocNode.xpath('exists(root) or exists(baseURI)'),
    'Regression: the document node was saved rather than just its JSON'
  )
);
const userProfileUri = fn.baseUri(userProfileDocNode) + '';

const endpointConfig = new EndpointConfig({
  allowInReadOnlyMode: true,
  features: { myCollections: false },
});

const scenarios = [
  {
    name: 'Bonnie asking for her entire user profile',
    input: {
      username: USERNAME_FOR_BONNIE,
      uri: userProfileUri,
      profileName: null,
    },
    expected: {
      error: false,
      nodeAssertions: [
        {
          type: 'xpath',
          xpath: 'exists(identified_by)',
          expected: true,
          message: 'The identified_by property is missing',
        },
        {
          type: 'xpath',
          xpath: `exists(${PROP_NAME_DEFAULT_COLLECTION})`,
          expected: true,
          message: `The '${PROP_NAME_DEFAULT_COLLECTION}' property is missing`,
        },
      ],
    },
  },
  {
    name: 'Clyde making his first request',
    input: {
      username: USERNAME_FOR_CLYDE,
      uri: userProfileUri,
      profileName: null,
    },
    expected: {
      error: true,
      stackToInclude: 'retry the request to enable the changes to take effect',
    },
  },
  {
    name: "Clyde asking for Bonnie's entire user profile",
    input: {
      username: USERNAME_FOR_CLYDE,
      uri: userProfileUri,
      profileName: null,
    },
    expected: {
      error: false,
      nodeAssertions: [
        {
          type: 'xpath',
          xpath: 'exists(identified_by)',
          expected: true,
          message: 'The identified_by property is missing',
        },
        {
          type: 'xpath',
          xpath: 'exists(default_collection)',
          expected: false,
          message:
            'The default_collection property is present but should not be',
        },
      ],
    },
  },
  {
    name: "Service account asking for Bonnie's entire user profile",
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      uri: userProfileUri,
      profileName: null,
    },
    expected: {
      error: false,
      nodeAssertions: [
        {
          type: 'xpath',
          xpath: 'exists(identified_by)',
          expected: true,
          message: 'The identified_by property is missing',
        },
        {
          type: 'xpath',
          xpath: 'exists(default_collection)',
          expected: false,
          message:
            'The default_collection property is present but should not be',
        },
      ],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const innerZeroArityFun = () => {
      return readDocument(scenario.input.uri, scenario.input.profileName);
    };
    const unitName = null;
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
export default assertions;
