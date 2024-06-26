/*
 * Use this script to get the most or least frequent n values from one or more field range indexes.
 * See the configuration portion of the section for influencing some of this script's behaviors.
 *
 * The getValues function hard-codes some additional logic:
 *
 *   -If the field name ends with "Float" or "Boolean", skip.
 *
 *   -If the field name ends with "Id", treat the ID as a URI and append that document's value from
 *    the anySortNameEn field.
 *
 * Depending on the indexes sizes and number of indexes, this script can take a while to run.
 * The longest this was clocked against the LUX dataset was 2.75 minutes.
 */
'use strict';

// START: script configuration, 1 of 2.
const databaseName = 'lux-content';
// END: script configuration, 1 of 2.

const admin = require('/MarkLogic/admin.xqy');
const config = admin.getConfiguration();
const fieldNames = admin
  .databaseGetRangeFieldIndexes(config, xdmp.database(databaseName))
  .toArray()
  .map((node) => {
    return node.xpath('*:field-name/string()') + '';
  })
  .sort();

// START: script configuration, 2 of 2.
const fieldStartIdx = 1; // Min is 1.
const fieldEndIdx = fieldNames.length; // Max is fieldNames.length
const numberOfValues = 10;
const mostFrequent = true;
// END: script configuration, 2 of 2.

function getValues(fieldName) {
  if (fieldName.endsWith('Float') || fieldName.endsWith('Boolean')) {
    return 'Skipped';
  }

  let values = cts
    .fieldValues(fieldName, null, [
      'frequency-order',
      mostFrequent ? 'descending' : 'ascending',
      `limit=${numberOfValues}`,
      'concurrent',
      'unchecked',
      'score-zero',
    ])
    .toArray();

  if (fieldName.endsWith('Id')) {
    values = values.map((value) => {
      return `${value} (${
        cts
          .fieldValues(
            'anySortNameEn',
            null,
            ['limit=1'],
            cts.documentQuery(value)
          )
          .toArray()[0]
      })`;
    });
  }

  return values;
}

const valuesByField = {};
fieldNames.slice(fieldStartIdx - 1, fieldEndIdx - 1).forEach((name) => {
  if (name.length > 0) {
    valuesByField[name] = getValues(name);
  }
});
valuesByField;
