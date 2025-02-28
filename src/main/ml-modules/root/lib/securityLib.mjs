import {
  UNRESTRICTED_UNIT_NAME,
  getEndpointAccessUnitNames,
} from './unitLib.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';

function getServiceAccountUsernames() {
  return [UNRESTRICTED_UNIT_NAME]
    .concat(getEndpointAccessUnitNames())
    .map((unitName) => {
      return getServiceAccountUsername(unitName);
    });
}

// In this context, we're defining service accounts as the endpoint consumers subset thereof.
function getServiceAccountUsername(unitName) {
  return `${UNRESTRICTED_UNIT_NAME}${
    unitName != UNRESTRICTED_UNIT_NAME ? `-${unitName}` : ''
  }-endpoint-consumer`;
}

function getServiceAccountUserId(unitName) {
  const serviceAccountName = getServiceAccountUsername(unitName);
  try {
    return xdmp.user(serviceAccountName);
  } catch (e) {
    throw new BadRequestError(
      `The '${unitName}' unit's '${serviceAccountName}' service account does not exist; check unit name then service account.`
    );
  }
}

// Requires amp for the http://marklogic.com/xdmp/privileges/xdmp-user-roles executive privilege.
function _isServiceAccount(userName) {
  console.log(`Checking the roles of the '${userName}' user`);
  const roleNames = xdmp
    .userRoles(userName)
    .toArray()
    .map((id) => {
      return xdmp.roleName(id);
    });
  return (
    // Must not have the admin role.
    !roleNames.includes('admin') &&
    // Must be in the list of known service accounts.
    getServiceAccountUsernames().includes(userName)
  );
}
const isServiceAccount = import.meta.amp(_isServiceAccount);

export {
  // assertIsServiceAccount,
  getServiceAccountUserId,
  getServiceAccountUsername,
  isServiceAccount,
};
