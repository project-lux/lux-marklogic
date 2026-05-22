/**
 * Test suite for resolveSearchOptions - Search options resolution precedence.
 * Tests the options name resolution chain, exact vs keyword branching,
 * override merging, and unknown options name handling.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { resolveSearchOptions } from '/lib/search/engine.mjs';
import { SearchTermConfig } from '/lib/search/SearchTermConfig.mjs';
import {
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
  SEARCH_OPTIONS_NAME_EXACT,
  SEARCH_OPTIONS_NAME_KEYWORD,
} from '/lib/appConstants.mjs';

const LIB = '0309 resolveSearchOptions.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const scenarios = [
  // --- Options name resolution ---
  {
    name: 'Explicit exact options name returns exact defaults',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_EXACT,
      patternName: null,
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_EXACT,
    },
  },
  {
    name: 'Explicit keyword options name returns keyword defaults',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_KEYWORD,
      patternName: null,
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_KEYWORD,
    },
  },
  {
    name: 'Null options name with keyword pattern resolves to keyword defaults',
    input: {
      optionsName: null,
      patternName: 'keyword',
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_KEYWORD,
    },
  },
  {
    name: 'Null options name with exact pattern resolves to exact defaults',
    input: {
      optionsName: null,
      patternName: 'indexedValue',
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_EXACT,
    },
  },
  {
    name: 'Null options name with unknown pattern returns null',
    input: {
      optionsName: null,
      patternName: 'nonExistentPattern',
    },
    expected: {
      error: false,
      value: null,
    },
  },
  {
    name: 'Null options name with null pattern returns null',
    input: {
      optionsName: null,
      patternName: null,
    },
    expected: {
      error: false,
      value: null,
    },
  },
  {
    name: 'Explicit options name takes precedence over pattern default',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_EXACT,
      patternName: 'keyword',
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_EXACT,
    },
  },

  // --- forceExactMatch call-site wiring ---
  // These mirror the ternary in buildLeafSearchTerm:
  //   termConfig.isForceExactMatch() ? SEARCH_OPTIONS_NAME_EXACT : termConfig.getOptionsReference()
  {
    name: 'forceExactMatch config yields exact options even for keyword pattern',
    input: {
      termConfig: new SearchTermConfig({
        patternName: 'keyword',
        forceExactMatch: true,
      }),
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_EXACT,
    },
  },
  {
    name: 'No forceExactMatch and no optionsReference falls through to pattern default',
    input: {
      termConfig: new SearchTermConfig({
        patternName: 'keyword',
      }),
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_KEYWORD,
    },
  },
  {
    name: 'No forceExactMatch with explicit optionsReference takes precedence over pattern',
    input: {
      termConfig: new SearchTermConfig({
        patternName: 'keyword',
        optionsReference: SEARCH_OPTIONS_NAME_EXACT,
      }),
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_EXACT,
    },
  },

  // --- Keyword override merging ---
  {
    name: 'Keyword with instance override replaces default option',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_KEYWORD,
      patternName: null,
      instanceOverridesArr: ['case-sensitive'],
    },
    expected: {
      error: false,
      valueIncludes: ['case-sensitive'],
      valueExcludes: ['case-insensitive'],
    },
  },
  {
    name: 'Keyword with request override replaces default option',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_KEYWORD,
      patternName: null,
      requestOverridesArr: ['unstemmed'],
    },
    expected: {
      error: false,
      valueIncludes: ['unstemmed'],
      valueExcludes: ['stemmed'],
    },
  },
  {
    name: 'Instance override takes precedence over request override',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_KEYWORD,
      patternName: null,
      requestOverridesArr: ['case-sensitive'],
      instanceOverridesArr: ['case-insensitive'],
    },
    expected: {
      error: false,
      valueIncludes: ['case-insensitive'],
      valueExcludes: ['case-sensitive'],
    },
  },
  {
    name: 'Exact in instance overrides short-circuits to exact options',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_KEYWORD,
      patternName: null,
      instanceOverridesArr: ['exact'],
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_EXACT,
    },
  },
  {
    name: 'Exact in request overrides short-circuits to exact options',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_KEYWORD,
      patternName: null,
      requestOverridesArr: ['exact'],
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_EXACT,
    },
  },
  {
    name: 'Keyword with no overrides returns keyword defaults unchanged',
    input: {
      optionsName: SEARCH_OPTIONS_NAME_KEYWORD,
      patternName: null,
      requestOverridesArr: [],
      instanceOverridesArr: [],
    },
    expected: {
      error: false,
      value: DEFAULT_SEARCH_OPTIONS_KEYWORD,
    },
  },

  // --- Unknown options name ---
  {
    name: 'Unknown options name returns null',
    input: {
      optionsName: 'bogusOptionsName',
      patternName: null,
    },
    expected: {
      error: false,
      value: null,
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    // When a termConfig is provided, mirror the buildLeafSearchTerm ternary:
    //   termConfig.isForceExactMatch() ? SEARCH_OPTIONS_NAME_EXACT : termConfig.getOptionsReference()
    const tc = scenario.input.termConfig;
    const optionsName = tc
      ? tc.isForceExactMatch()
        ? SEARCH_OPTIONS_NAME_EXACT
        : tc.getOptionsReference()
      : scenario.input.optionsName;
    const patternName = tc ? tc.getPatternName() : scenario.input.patternName;
    return resolveSearchOptions(
      optionsName,
      patternName,
      scenario.input.requestOverridesArr || [],
      scenario.input.instanceOverridesArr || {},
    );
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    const actual = scenarioResults.actualValue;

    if (scenario.expected.value !== undefined) {
      if (scenario.expected.value === null) {
        assertions.push(
          testHelperProxy.assertEqual(
            null,
            actual,
            `Scenario '${scenario.name}' should return null.`,
          ),
        );
      } else {
        assertions.push(
          testHelperProxy.assertEqual(
            JSON.stringify(scenario.expected.value),
            JSON.stringify(Array.from(actual)),
            `Scenario '${scenario.name}' did not return the expected options.`,
          ),
        );
      }
    }

    if (scenario.expected.valueIncludes) {
      const actualArr = Array.from(actual);
      for (const expectedOption of scenario.expected.valueIncludes) {
        assertions.push(
          testHelperProxy.assertTrue(
            actualArr.includes(expectedOption),
            `Scenario '${scenario.name}': expected '${expectedOption}' to be present. Actual: [${actualArr}]`,
          ),
        );
      }
    }

    if (scenario.expected.valueExcludes) {
      const actualArr = Array.from(actual);
      for (const excludedOption of scenario.expected.valueExcludes) {
        assertions.push(
          testHelperProxy.assertTrue(
            !actualArr.includes(excludedOption),
            `Scenario '${scenario.name}': expected '${excludedOption}' to be absent. Actual: [${actualArr}]`,
          ),
        );
      }
    }
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
