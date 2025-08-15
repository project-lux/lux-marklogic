/*
 * As part of dataset and index configuration validation, use this script to find any empty
 * range indexes.
 *
 * Usage: make sure the database name below is correct, run, and wait about two minutes :)
 */
'use strict';
import { getVersionInfo } from '/lib/environmentLib.mjs';

// START: script configuration.
const databaseName = 'lux-content';
// END: script configuration.

const admin = require('/MarkLogic/admin.xqy');
const config = admin.getConfiguration();
const indexNames = admin
  .databaseGetRangeFieldIndexes(config, xdmp.database(databaseName))
  .toArray()
  .map((node) => {
    return node.xpath('*:field-name/string()') + '';
  })
  .sort();

const indexCounts = { versionInfo: getVersionInfo() };
indexNames.forEach((name) => {
  if (name.length > 0) {
    indexCounts[name] = fn.count(
      cts.fieldValues(name, null, ['concurrent', 'unchecked', 'score-zero'])
    );
  }
});

indexCounts;
export default indexCounts;
