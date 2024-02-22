/*
 * Use this script to delete one or more application servers by name followed by a single cluster restart.
 */
'use strict';

// Specify the names of existing application servers that are to be deleted.
const appServerNames = ['lux', 'lux-test', 'lux-2'];

const admin = require('/MarkLogic/admin.xqy');
let config = admin.getConfiguration();
const groupId = admin.groupGetId(config, 'Default');
appServerNames.forEach((name) => {
  config = admin.appserverDelete(
    config,
    admin.appserverGetId(config, groupId, name)
  );
});
// Cluster will restart upon saving this configuration.
admin.saveConfiguration(config);
