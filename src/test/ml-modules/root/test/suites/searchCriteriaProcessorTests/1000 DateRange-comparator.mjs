/**
 * Tests DateRange.apply() operator validation via requireRangeOperator.
 * Does not execute searches against the content database.
 */

import { testHelperProxy } from '/test/test-helper.mjs';
import { executeScenario } from '/test/unitTestUtils.mjs';
import { SearchPatternBase } from '/lib/search/patterns/SearchPatternBase.mjs';
import '/lib/search/patterns/DateRange.mjs';

const LIB = '1000 DateRange-comparator.mjs';
console.log(`${LIB}: starting.`);

let assertions = [];

const pattern = SearchPatternBase.get('dateRange');

function mockSearchTerm(operator, value = '1800;1900') {
  return {
    getName: () => 'startDate',
    getScopeName: () => 'agent',
    getValue: () => value,
    getComparisonOperator: () => operator,
    getTimespanMode: () => 'full',
    getSearchTermConfig: () => ({
      getIndexReferences: () => [
        'agentBornStartDateLong',
        'agentBornEndDateLong',
      ],
    }),
  };
}

const scenarios = [
  // Valid operators — should not throw
  { name: '> is valid', input: '>', expected: { error: false } },
  { name: '>= is valid', input: '>=', expected: { error: false } },
  { name: '< is valid', input: '<', expected: { error: false } },
  { name: '<= is valid', input: '<=', expected: { error: false } },
  { name: '= is valid', input: '=', expected: { error: false } },
  { name: '!= is valid', input: '!=', expected: { error: false } },
  // Invalid operators — should throw
  {
    name: 'contains is invalid',
    input: 'contains',
    expected: {
      error: true,
      stackToInclude: 'Unsupported comparison operator',
    },
  },
  {
    name: 'bogus is invalid',
    input: 'bogus',
    expected: {
      error: true,
      stackToInclude: 'Unsupported comparison operator',
    },
  },
  {
    name: 'empty string is invalid',
    input: '',
    expected: {
      error: true,
      stackToInclude: 'Unsupported comparison operator',
    },
  },
  {
    name: 'intersects (geospatial op) is invalid for range',
    input: 'intersects',
    expected: {
      error: true,
      stackToInclude: 'Unsupported comparison operator',
    },
  },
];

for (const scenario of scenarios) {
  const zeroArityFun = () => {
    return pattern.apply(null, mockSearchTerm(scenario.input), 'AND', null);
  };

  const scenarioResults = executeScenario(scenario, zeroArityFun);

  if (scenarioResults.applyErrorNotExpectedAssertions) {
    // Valid operator: verify ctsConstraints array is returned
    const result = scenarioResults.actualValue;
    assertions.push(
      testHelperProxy.assertTrue(
        result &&
          Array.isArray(result.ctsConstraints) &&
          result.ctsConstraints.length > 0,
        `Scenario '${scenario.name}' should return ctsConstraints.`,
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
