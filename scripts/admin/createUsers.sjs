/*
 * In Query Console, set the Database to "Security".
 *
 * For each user, create a new object in the "users" array.  If you want a generated password, do not set the user's password property.
 */
'use strict';
declareUpdate();

const sec = require('/MarkLogic/security.xqy');

const users = [
  {
    username: 'user1',
    roles: ['admin'],
    permissions: [],
    collections: [],
    externalNames: [],
  },
  {
    username: 'user2',
    password: 'myPredefinedPassword',
    roles: ['manage-user', 'rest-writer'],
    permissions: [],
    collections: [],
    externalNames: [],
  },
];

for (let user of users) {
  if (!user.password) {
    user.password = xdmp.crypt(
      `${user.username}${new Date().getTime()}${xdmp.random(
        xdmp.random(9876543210)
      )}`,
      'luxForTheWin0317'
    );
  }
  try {
    sec.createUser(
      user.username,
      `User account for ${user.username}`,
      user.password,
      user.roles,
      user.permissions,
      user.collections,
      user.externalNames
    );
  } catch (e) {
    delete user.password;
    user.error = `${e.name}: ${e.message}`;
  }
  delete user.roles;
  delete user.permissions;
  delete user.collections;
  delete user.externalNames;
}

users;
export default users;
