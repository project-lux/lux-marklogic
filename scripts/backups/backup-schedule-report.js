/*
 * Create a report of every database's backup schedules.
 * Set the reportFormat variable to 'json' or 'csv'.
 * The database and server evaluated on do not matter.
 * This could be used by an automated system monitoring test.
 */
'use strict';

/*
 * Configure the report format: 'json' or 'csv'
 */
const reportFormat = 'json';

const admin = require('/MarkLogic/admin.xqy');
const serverConfig = admin.getConfiguration();
const json = require('/MarkLogic/json/json.xqy');

const jsonReport = {
  without: [],
  with: [],
};

let transformConfig = json.config('custom');
transformConfig['whitespace'] = 'ignore';
transformConfig['camel-case'] = true;
transformConfig['element-namespace'] = 'http://marklogic.com/xdmp/database';

// Collect the data
for (let id of xdmp.databases()) {
  const databaseInfo = {
    databaseName: xdmp.databaseName(id),
    databaseId: id,
  };
  const backupSchedulesAsXml = admin.databaseGetBackups(serverConfig, id);
  if (fn.empty(backupSchedulesAsXml)) {
    jsonReport.without.push(databaseInfo);
  } else {
    databaseInfo.backupSchedules = [];
    for (let backupScheduleAsXml of backupSchedulesAsXml) {
      databaseInfo.backupSchedules.push(
        json.transformToJson(backupScheduleAsXml, transformConfig)
      );
    }
    jsonReport.with.push(databaseInfo);
  }
}

function sortByDatabaseName(obj1, obj2) {
  if (obj1.databaseName < obj2.databaseName) return -1;
  if (obj1.databaseName > obj2.databaseName) return 1;
  return 0;
}

jsonReport.without = jsonReport.without.sort(sortByDatabaseName);
jsonReport.with = jsonReport.with.sort(sortByDatabaseName);

const arr = [];

// Format the data
let formattedReport = `Unknown report format '${reportFormat}'; set reportFormat to 'json' or 'csv'.`;
if (reportFormat == 'json') {
  formattedReport = jsonReport;
} else if (reportFormat == 'csv') {
  let csvHeaders = 'databaseName,databaseId,';
  let csvReport = '';
  for (let obj of jsonReport.without) {
    csvReport += `\n${obj.databaseName},${obj.databaseId},NO BACKUP`;
  }
  let first = true;
  for (let obj of jsonReport.with) {
    for (let i = 0; i <= obj.backupSchedules.length - 1; i++) {
      csvReport += `\n${obj.databaseName},${obj.databaseId},`;
      const backupSchedule = obj.backupSchedules[i].toObject().databaseBackup;
      for (let key of Object.keys(backupSchedule)) {
        if (key == 'backupDays') continue; // FIXME
        if (first) {
          csvHeaders += `${key},`;
        }
        const val = backupSchedule[key] ? backupSchedule[key] : 'null';
        csvReport += `${val},`;
      }
      first = false;
    }
  }
  formattedReport = `${csvHeaders}${csvReport}`;
}

formattedReport;
export default formattedReport;
