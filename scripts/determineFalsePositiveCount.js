/*
 * Purpose: determine if there is a difference between the number of filtered and unfiltered results.
 *
 * Instructions: update the ctsQuery value with the CTS query to check.  For additional information about
 *               how the query was processed, uncomment the plan and/or query meters lines near the end.
 */
'use strict';

const op = require('/MarkLogic/optic');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');

const ctsQuery = cts.andQuery([
  cts.jsonPropertyValueQuery(
    'dataType',
    ['DigitalObject', 'HumanMadeObject'],
    ['exact']
  ),
  cts.orQuery(
    [
      cts.andQuery(
        [
          cts.fieldRangeQuery(
            'itemProductionStartDateFloat',
            '>=',
            1672531200,
            [],
            1
          ),
          cts.fieldRangeQuery(
            'itemProductionStartDateFloat',
            '<=',
            1704067199,
            [],
            1
          ),
        ],
        []
      ),
      cts.andQuery(
        [
          cts.fieldRangeQuery(
            'itemProductionEndDateFloat',
            '>=',
            1672531200,
            [],
            1
          ),
          cts.fieldRangeQuery(
            'itemProductionEndDateFloat',
            '<=',
            1704067199,
            [],
            1
          ),
        ],
        []
      ),
      cts.andQuery(
        [
          cts.fieldRangeQuery(
            'itemProductionStartDateFloat',
            '<=',
            1672531200,
            [],
            1
          ),
          cts.fieldRangeQuery(
            'itemProductionEndDateFloat',
            '>=',
            1704067199,
            [],
            1
          ),
        ],
        []
      ),
    ],
    []
  ),
]);

let trueCounter = 0;
let falseCounter = 0;
for (let doc of cts.search(ctsQuery, 'unfiltered')) {
  cts.contains(doc, ctsQuery) ? trueCounter++ : falseCounter++;
}
const results = {
  trueCounter,
  falseCounter,
  truePlusFalse: trueCounter + falseCounter,
  estimate: cts.estimate(ctsQuery),
  duration: xdmp.elapsedTime(),
  //plan: cts.plan(ctsQuery),
  //queryMeters: xdmp.queryMeters(),
};
results;
