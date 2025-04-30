import { testHelperProxy } from '/test/test-helper.mjs';
import { USERNAME_FOR_REGULAR_USER } from '/test/unitTestConstants.mjs';
import { executeErrorSupportedScenario } from '/test/unitTestUtils.mjs';
import { createDocument } from '/lib/crudLib.mjs';
import { handleRequestV2ForUnitTesting } from '/lib/securityLib.mjs';
import { EndpointConfig } from '/lib/EndpointConfig.mjs';
import { IDENTIFIERS } from '/lib/identifierConstants.mjs';

const LIB = '0100 createDocument.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const endpointConfig = new EndpointConfig({
  allowInReadOnlyMode: true,
  features: { myCollections: true },
});

const validUserProfile = {
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
};

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
          id: 'https://todo.concept.my.collection',
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
              id: 'https://todo.concept.note',
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
                  id: 'https://todo.concept.display.name',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const scenarios = [
  {
    // TODO: after #495 is implemented, change this to expect the user profile already exists, as we are going through handleRequest.
    name: 'Regular user creating their user profile',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      doc: validUserProfile,
    },
    expected: {
      error: false,
      sameTopLevelPropertyValues: [],
      newTopLevelPropertyValues: [],
    },
  },
  {
    name: 'Regular user with valid My Collection document',
    input: {
      username: USERNAME_FOR_REGULAR_USER,
      doc: validMyCollection,
    },
    expected: {
      error: false,
      sameTopLevelPropertyValues: [],
      newTopLevelPropertyValues: [],
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    const innerZeroArityFun = () => {
      declareUpdate();
      return createDocument(xdmp.toJSON(scenario.input.doc));
    };
    const unitName = null;
    // These tests are dependent on handleRequest creating the user's exclusive roles.
    return handleRequestV2ForUnitTesting(
      innerZeroArityFun,
      unitName,
      endpointConfig
    );
  };
  const scenarioResults = executeErrorSupportedScenario(
    scenario,
    zeroArityFun,
    {
      userId: xdmp.user(scenario.input.username),
    }
  );

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }

  console.dir(scenarioResults.actualValue);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    // assertions.push(
    //   testHelperProxy.assertEqual(
    //     scenario.expected.value,
    //     scenarioResults.actualValue,
    //     `Scenario '${scenario.name}' did not return the expected value.`
    //   )
    // );
  }
}
console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`
);

assertions;
