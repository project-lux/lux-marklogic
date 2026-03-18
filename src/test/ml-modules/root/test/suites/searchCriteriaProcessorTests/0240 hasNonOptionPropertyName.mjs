import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0240 hasNonOptionPropertyName.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Object with simple property name',
    input: {
      termValue: { name: 'John Doe' },
    },
    expected: {
      error: false,
      result: true,
    },
  },
  {
    name: 'Object with type property',
    input: {
      termValue: { type: 'Agent' },
    },
    expected: {
      error: false,
      result: true,
    },
  },
  {
    name: 'Object with id property',
    input: {
      termValue: { id: 'https://example.org/1234' },
    },
    expected: {
      error: false,
      result: true,
    },
  },
  {
    name: 'Object with only underscore properties (options)',
    input: {
      termValue: { _weight: 1.5, _valueType: 'string' },
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Object with reserved property _scope',
    input: {
      termValue: { _scope: 'agent' },
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Object with reserved property _valueType',
    input: {
      termValue: { _valueType: 'string' },
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Object with mixed properties',
    input: {
      termValue: {
        name: 'John Doe',
        _weight: 1.5,
        _valueType: 'string',
      },
    },
    expected: {
      error: false,
      result: true,
    },
  },
  {
    name: 'Object with multiple non-option properties',
    input: {
      termValue: {
        name: 'John Doe',
        type: 'Agent',
        id: 'https://example.org/1234',
      },
    },
    expected: {
      error: false,
      result: true,
    },
  },
  {
    name: 'Empty object',
    input: {
      termValue: {},
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Null value',
    input: {
      termValue: null,
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Undefined value',
    input: {
      termValue: undefined,
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'String value (not an object)',
    input: {
      termValue: 'test string',
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Number value (not an object)',
    input: {
      termValue: 42,
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Array value (not a plain object)',
    input: {
      termValue: ['test', 'array'],
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Object with property starting with underscore (not reserved)',
    input: {
      termValue: { _customProperty: 'value' },
    },
    expected: {
      error: false,
      result: false,
    },
  },
  {
    name: 'Object with classification property',
    input: {
      termValue: {
        classification: {
          id: 'https://example.org/concept/1234',
        },
      },
    },
    expected: {
      error: false,
      result: true,
    },
  },
  {
    name: 'Object with complex nested structure',
    input: {
      termValue: {
        activeAt: {
          _weight: 2.0,
          place: {
            name: 'New York',
          },
        },
      },
    },
    expected: {
      error: false,
      result: true,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return SearchCriteriaProcessor.hasNonOptionPropertyName(
      scenario.input.termValue,
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (
    scenarioResults.actualValue !== undefined &&
    scenarioResults.applyErrorNotExpectedAssertions
  ) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.result,
        scenarioResults.actualValue,
        `hasNonOptionPropertyName should return ${scenario.expected.result} for scenario: ${scenario.name}`,
      ),
    );
  }

  if (scenarioResults.assertions.length > 0) {
    assertions = assertions.concat(scenarioResults.assertions);
  }
}

console.log(
  `${LIB}: completed ${assertions.length} assertions from ${scenarios.length} scenarios.`,
);

assertions;
export default assertions;
