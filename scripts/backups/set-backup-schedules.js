/*
 * Replace the backup schedules of the specified databases, if not also remove those of the other databases.
 * Review and update as necessary the values of all variables within the "Configurable portion of script" section.
 * Script is geared towards a weekly full and daily incremental backups, and to stagger them.
 */
'use strict';

/*
 * START: Configurable portion of script
 */

// Define which databases to replace the backup schedules of.  Both variables should be
// comma-delimited strings of database names but only one should be set.  When includedDatabases
// is set, excludedDatabases is ignored.  When neither are set, all databases are included.
const includedDatabases = 'Security, Schemas, Triggers, Meters';
const excludedDatabases = null;

// Include OS-specific trailing slash.
const baseBackupDir = '/BACKUP/';

// Set to true if hyphens in the database names are to be replaced with underscores when using the name in the backup path.
const replaceHyphensToUnderscores = true;

// Set to true to also delete any backup schedules on the databases that are not having their
// backup schedules replaced.
const deleteSchedulesOfOtherDatabases = true;

// One or more: monday, tuesday, wednesday, thursday, friday, saturday, sunday.
const fullBackupDays = ['sunday'];

// Specify the hour to start (0 to 23).
// To avoid a potential conflicts, avoid setting these to the same value.
const hourToStartFirstFullBackup = 6;
const hourToStartFirstIncrementalBackup = 21;

// How many minutes between the same type of backup?
const minutesToStaggerFullBackups = 15;
const minutesToStaggerIncrementalBackups = 5;

/*
 * END: Configurable portion of script
 */

/*
 * START: Utility functions.
 */

// Utility function copied from the system monitoring project which is used to
// offer the flexibility of specifying databases to include or exclude.  When
// null is specified for both, all databases are included.
function getDatabaseNames(
  includedNames = null,
  excludedNames = null,
  delimiter = ','
) {
  let resolvedDatabaseNames = [];
  if (includedNames) {
    resolvedDatabaseNames = delimitedStringToArray(includedNames, delimiter);
  } else {
    const allDatabaseIds = xdmp.databases().toArray();
    if (excludedNames) {
      const databaseNamesToExclude = delimitedStringToArray(
        excludedNames,
        delimiter
      );
      const databaseIdsToExclude = [];
      databaseNamesToExclude.forEach((name) => {
        databaseIdsToExclude.push(xdmp.database(name) + '');
      });
      allDatabaseIds.forEach((id) => {
        if (!databaseIdsToExclude.includes(id + '')) {
          resolvedDatabaseNames.push(xdmp.databaseName(id));
        }
      });
    } else {
      allDatabaseIds.forEach((id) => {
        resolvedDatabaseNames.push(xdmp.databaseName(id));
      });
    }
  }
  return resolvedDatabaseNames;
}

// Utility that splits, trims, and dedups.  Also copied from the system monitoring project.
function delimitedStringToArray(str, delimiter = DELIMITER_DEFAULT) {
  const arr = [];
  const tempArr = str.split(delimiter);
  for (let val of tempArr) {
    val = val.trim();
    if (!arr.hasOwnProperty(val)) {
      arr.push(val);
    }
  }
  return arr;
}

const timeFormattingOptions = {
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};
function getTime(startHour, minutesBetween, counter) {
  const date = new Date(2021, 0, 1, startHour, minutesBetween * counter, 0, 0);
  return date.toLocaleTimeString('en-US', timeFormattingOptions);
}

/*
 * END: Utility functions.
 */

/*
 * START: Balance of implementation
 */

const admin = require('/MarkLogic/admin.xqy');
let serverConfig = admin.getConfiguration();
let saveConfig = false;
const resolvedDatabaseNames = getDatabaseNames(
  includedDatabases,
  excludedDatabases
);

// Clear out existing schedules: either just those we're replacing or all.
let deleteSchedulesDatabaseIds = [];
if (deleteSchedulesOfOtherDatabases === true) {
  deleteSchedulesDatabaseIds = xdmp.databases().toArray();
} else {
  resolvedDatabaseNames.forEach((name) => {
    deleteSchedulesDatabaseIds.push(xdmp.database(name));
  });
}
deleteSchedulesDatabaseIds.forEach((id) => {
  serverConfig = admin.databaseDeleteBackup(
    serverConfig,
    id,
    admin.databaseGetBackups(serverConfig, id).toObject()
  );
  if (!saveConfig) {
    saveConfig = true;
  }
});

// Set the schedules for the requested databases.
const includeReplicas = true;
for (let i = 0; i <= resolvedDatabaseNames.length - 1; i++) {
  const databaseName = resolvedDatabaseNames[i];
  const backupSubDir = replaceHyphensToUnderscores === true ? databaseName.replace(/\-/g, '_') : databaseName;
  const schedules = [];
  const fullBackupTime = getTime(
    hourToStartFirstFullBackup,
    minutesToStaggerFullBackups,
    i
  );
  const incrementalBackupTime = getTime(
    hourToStartFirstIncrementalBackup,
    minutesToStaggerIncrementalBackups,
    i
  );
  const includeSecurityDatabase = databaseName === 'Security';

  schedules.push(
    admin.databaseWeeklyBackup(
      baseBackupDir.concat(backupSubDir),
      1,
      fullBackupDays,
      fullBackupTime,
      2,
      includeSecurityDatabase,
      !includeSecurityDatabase,
      !includeSecurityDatabase,
      includeReplicas
    )
  );

  schedules.push(
    admin.databaseDailyIncrementalBackup(
      baseBackupDir.concat(backupSubDir),
      1,
      incrementalBackupTime,
      includeSecurityDatabase,
      !includeSecurityDatabase,
      !includeSecurityDatabase,
      includeReplicas
    )
  );

  serverConfig = admin.databaseAddBackup(
    serverConfig,
    xdmp.database(databaseName),
    schedules
  );

  if (!saveConfig) {
    saveConfig = true;
  }
}

if (saveConfig) {
  admin.saveConfigurationWithoutRestart(serverConfig);
}
