/*
 * Use this script to delete one or more application servers by name followed by a single cluster restart.
 */
'use strict';

// Configure the tenant, app server name suffixes, and whether to preview the changes.
const preview = true;
const tenantNames = ['lux'];
const suffixes = ['-request-group-1', '-request-group-2'];

// Determine the app server names.
const appServerNames = [];
tenantNames.forEach((tenantName) =>
  suffixes.forEach((suffix) => appServerNames.push(`${tenantName}${suffix}`))
);

let message;
if (preview === false) {
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
  message = `App servers ${appServerNames.join(', ')} deleted.`;
} else {
  message = `Previewing deletion of app servers: ${appServerNames.join(', ')}`;
}

message;
export default message;
