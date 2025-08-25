'use strict';

// Specify one or more roles.  This is this script's only input.
const roleNames = ['lux-deployer'];

function getRoleInfoForOneRole(roleName) {
  let roleInfo = {
    roleNames: [],
    privNames: [],
  };
  let inheritedRoleIds = xdmp.roleRoles(roleName);
  for (let id of inheritedRoleIds) {
    let inheritedRoleName = xdmp.roleName(id);
    roleInfo.roleNames.push(inheritedRoleName);
    let inheritedRoleInfo = getRoleInfoForOneRole(inheritedRoleName);
    roleInfo.roleNames = roleInfo.roleNames.concat(inheritedRoleInfo.roleNames);
    roleInfo.privNames = roleInfo.privNames.concat(inheritedRoleInfo.privNames);
  }
  let privsIds = xdmp.rolePrivileges(xdmp.role(roleName));
  for (let id of privsIds) {
    roleInfo.privNames.push(xdmp.privilegeName(id));
  }
  return roleInfo;
}

function sortAndDeDupArray(arr) {
  return arr.sort().filter(function (item, pos) {
    return arr.indexOf(item) == pos;
  });
}

const roleInfo = {};
for (let roleName of roleNames) {
  roleInfo[roleName] = sortAndDeDupArray(
    getRoleInfoForOneRole(roleName).privNames
  );
}

let rows = '';
let row = '';
for (let customRoleName of Object.keys(roleInfo)) {
  row += customRoleName + ',';
}
rows += row + '\n';

let i = 0;
let hasMore = true;
while (hasMore) {
  hasMore = false;
  let row = '';
  for (let roleName of Object.keys(roleInfo)) {
    if (!hasMore && roleInfo[roleName].length > i) {
      hasMore = true;
    }
    if (roleInfo[roleName].length >= i && roleInfo[roleName][i] != undefined) {
      row += roleInfo[roleName][i];
    }
    row += ',';
  }
  rows += row + '\n';
  i++;
}

rows;
export default rows;
