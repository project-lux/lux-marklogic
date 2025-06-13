/*
 * This script may be used to list all roles configured with external names.
 *
 * Run against the security database.
 */
'use strict';
const sec = require('/MarkLogic/security.xqy');

const results = {
  numberOfRolesChecked: 0,
  rolesWithExternalNames: {},
};

xdmp
  .roles()
  .toArray()
  .forEach((id) => {
    results.numberOfRolesChecked = results.numberOfRolesChecked + 1;
    const name = xdmp.roleName(id);
    const externalNames = sec.roleGetExternalNames(name);
    if (fn.count(externalNames)) {
      results.rolesWithExternalNames[name] = externalNames;
    }
  });

results;
