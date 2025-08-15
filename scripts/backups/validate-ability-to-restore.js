/*
 * After a database backup is created, this script may be used to find out if MarkLogic can use it.
 * Set the databaseName and backupToValidate variables below.
 * The database and server evaluated on do not matter.
 */
'use strict';

/*
 * Configurable portion of script
 */
const databaseName = 'data-hub-FINAL';
const backupToValidate = '/host/tmp/20210507-1328466042280';

/*
 * No need to edit the following.
 */
const databaseId = xdmp.database(databaseName);
const forestIds = xdmp.databaseForests(databaseId);
const result = xdmp.databaseRestoreValidate(forestIds, backupToValidate);

result;
export default result;
