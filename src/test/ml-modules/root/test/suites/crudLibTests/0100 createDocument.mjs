import { testHelperProxy } from '/test/test-helper.mjs';
import {
  USERNAME_FOR_BONNIE,
  USERNAME_FOR_SERVICE_ACCOUNT,
} from '/test/unitTestConstants.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { createDocument } from '/lib/crudLib.mjs';
import { handleRequestV2ForUnitTesting } from '/lib/securityLib.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { IDENTIFIERS } from '/lib/identifierConstants.mjs';
import { getNodeFromObject } from '/utils/utils.mjs';
import { getTenantStatus } from '/lib/environmentLib.mjs';

const LIB = '0100 createDocument.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

try {
  getTenantStatus();
} catch (e) {
  assertions.push(
    testHelperProxy.assertTrue(
      false,
      `The createDocument tests are dependent on the tenant status document existing yet getTenantStatus() threw an error: ${e.message}`
    )
  );
}

const endpointConfig = new EndpointConfig({
  allowInReadOnlyMode: false,
  features: { myCollections: true },
});

const validMyCollection = {
  type: 'Set',
  identified_by: [
    {
      type: 'Name',
      content: "The My Collection's name, which may be up to 200 characters",
      language: [
        {
          id: 'https://lux.collections.yale.edu/data/concept/1fda962d-1edc-4fd7-bfa9-0c10e3153449',
          type: 'Language',
          _label: 'English',
          equivalent: [
            {
              id: 'http://vocab.getty.edu/aat/300388277',
              type: 'Language',
              _label: 'English',
            },
          ],
        },
      ],
      classified_as: [
        {
          id: 'https://lux.collections.yale.edu/data/concept/f7ef5bb4-e7fb-443d-9c6b-371a23e717ec',
          type: 'Type',
          _label: 'Primary Name',
          equivalent: [
            {
              id: 'http://vocab.getty.edu/aat/300404670',
              type: 'Type',
              _label: 'Primary Name',
            },
          ],
        },
        {
          id: 'https://lux.collections.yale.edu/data/concept/31497b4e-24ad-47fe-88ad-af2007d7fb5a',
          type: 'Type',
          _label: 'Sort Name',
        },
      ],
    },
  ],
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
  referred_to_by: [
    {
      content:
        'This is one of 30 allowed notes; each note may be 500 characters long.',
      classified_as: [
        {
          id: 'https://not.checked',
          equivalent: [
            {
              id: IDENTIFIERS.setNote,
            },
          ],
        },
      ],
      identified_by: [
        {
          content:
            'This is the label to the note, which supports up to 200 characters.',
          classified_as: [
            {
              id: 'https://not.checked',
              equivalent: [
                {
                  id: IDENTIFIERS.setNoteLabel,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function assertIdIsUri(docNode, username) {
  const zeroArityFun = () => {
    return testHelperProxy.assertTrue(
      fn.docAvailable(docNode.xpath('id')),
      `The document's ID '${docNode.xpath(
        'id'
      )}' is not a document in the database`
    );
  };
  return xdmp.invokeFunction(zeroArityFun, { userId: xdmp.user(username) });
}

const scenarios = [
  {
    name: 'Regular user who needs their exclusive role(s) created',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: validMyCollection,
    },
    expected: {
      error: true,
      stackToInclude: 'retry the request to enable the changes to take effect',
    },
  },
  {
    name: 'Try to create a user profile even though it is automatically created',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: {
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
      stackToInclude: `The user '${USERNAME_FOR_BONNIE}' already has a profile`,
    },
  },
  {
    name: 'Service account attempting to create a user profile',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      doc: {
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
    name: 'Regular user providing valid a My Collection document',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: validMyCollection,
    },
    expected: {
      error: false,
      nodeAssertions: [
        {
          type: 'xpath',
          xpath: 'exists(id)',
          expected: true,
          message: 'The id property was not added.',
        },
        { type: 'function', function: assertIdIsUri },
        {
          type: 'xpath',
          xpath: 'exists(created_by)',
          expected: true,
          message: 'The created_by property was not added.',
        },
      ],
    },
  },
  {
    name: 'Regular user providing an invalid My Collection',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: {
        type: 'HumanMadeObject', // an invalid part; identified_by is also missing.
        classified_as: [
          {
            id: 'https://not.checked',
            equivalent: [
              {
                id: IDENTIFIERS.myCollection, // enough to get past model.isMyCollection
              },
            ],
          },
        ],
      },
    },
    expected: {
      error: true,
      stackToInclude: `validation error(s) found`,
    },
  },
  {
    name: 'Overwrite ID provided in My Collection',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: {
        id: 'https://should.be.overwritten',
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
      error: false,
      nodeAssertions: [
        {
          type: 'xpath',
          xpath: 'id = "https://should.be.overwritten"',
          expected: false,
          message: 'The given ID should have been overwritten.',
        },
      ],
    },
  },
  {
    name: 'Service account attempting to create a My Collection document',
    input: {
      username: USERNAME_FOR_SERVICE_ACCOUNT,
      doc: validMyCollection,
    },
    expected: {
      error: true,
      stackToInclude: `Service accounts are not permitted to use this endpoint`,
    },
  },
  {
    name: 'Regular user with unsupported document type',
    input: {
      username: USERNAME_FOR_BONNIE,
      doc: { type: 'Place' },
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
      return createDocument(getNodeFromObject(scenario.input.doc));
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
