/*
 * The purpose of this script is to quickly identify XPath expressions with /conf/contentDatabaseConfGenerated.json
 * that will not be accepted by MarkLogic.  Paste the contents thereof as the parameter into xdmp.toJSON() then run.
 *
 * As needed, this script could be extended to validate other aspects.
 */

'use strict';

// If you paste the contents of /
const doc = xdmp.toJSON(REPLACE_ME_WITH_GENERATED_INDEX_CONFIG);

const admin = require('/MarkLogic/admin.xqy');
const mlConfig = admin.getConfiguration();
const databaseId = xdmp.database('lux-content');

const findings = {
  fail: [],
  pass: [],
};

for (let path of doc.xpath('//path')) {
  try {
    const fieldPath = admin.databaseFieldPath(path, 1);
    admin.databaseValidateFieldPath(mlConfig, databaseId, fieldPath);
    findings.pass.push(path);
  } catch (e) {
    findings.fail.push(path);
  }
}

findings;
