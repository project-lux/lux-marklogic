import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchCriteriaProcessor } from '/lib/SearchCriteriaProcessor.mjs';

const LIB = '0250 getFirstNonOptionPropertyName.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  {
    name: 'Object with single property name',
    input: {
      termValue: { name: 'John Doe' },
    },
    expected: {
      error: false,
      result: 'name',
    },
  },
  {
    name: 'Object with type property',
    input: {
      termValue: { type: 'Agent' },
    },
    expected: {
      error: false,
      result: 'type',
    },
  },
  {
    name: 'Object with id property',
    input: {
      termValue: { id: 'https://example.org/1234' },
    },
    expected: {
      error: false,
      result: 'id',
    },
  },
  {
    name: 'Object with only underscore properties (options)',
    input: {
      termValue: { _weight: 1.5, _valueType: 'string' },
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Object with reserved property _scope only',
    input: {
      termValue: { _scope: 'agent' },
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Object with reserved property _valueType only',
    input: {
      termValue: { _valueType: 'string' },
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Object with mixed properties - returns first non-option',
    input: {
      termValue: {
        _weight: 1.5,
        name: 'John Doe',
        type: 'Agent',
        _valueType: 'string',
      },
    },
    expected: {
      error: false,
      result: 'name',
    },
  },
  {
    name: 'Object with multiple non-option properties - returns first',
    input: {
      termValue: {
        type: 'Agent',
        name: 'John Doe',
        id: 'https://example.org/1234',
      },
    },
    expected: {
      error: false,
      result: 'type',
    },
  },
  {
    name: 'Object with classification property first',
    input: {
      termValue: {
        classification: {
          id: 'https://example.org/concept/1234',
        },
        name: 'John Doe',
      },
    },
    expected: {
      error: false,
      result: 'classification',
    },
  },
  {
    name: 'Object with activeAt property',
    input: {
      termValue: {
        activeAt: {
          place: {
            name: 'New York',
          },
        },
      },
    },
    expected: {
      error: false,
      result: 'activeAt',
    },
  },
  {
    name: 'Empty object',
    input: {
      termValue: {},
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Null value',
    input: {
      termValue: null,
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Undefined value',
    input: {
      termValue: undefined,
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'String value (not an object)',
    input: {
      termValue: 'test string',
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Number value (not an object)',
    input: {
      termValue: 42,
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Array value (not a plain object)',
    input: {
      termValue: ['test', 'array'],
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Object with custom underscore property (not reserved)',
    input: {
      termValue: { _customProperty: 'value' },
    },
    expected: {
      error: false,
      result: null,
    },
  },
  {
    name: 'Object ordered with option properties first',
    input: {
      termValue: {
        _weight: 1.0,
        _scope: 'agent',
        _valueType: 'string',
        name: 'John Doe',
      },
    },
    expected: {
      error: false,
      result: 'name',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return SearchCriteriaProcessor.getFirstNonOptionPropertyName(
      scenario.input.termValue,
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    assertions.push(
      testHelperProxy.assertEqual(
        scenario.expected.result,
        scenarioResults.actualValue,
        `getFirstNonOptionPropertyName should return ${scenario.expected.result} for scenario: ${scenario.name}`,
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
