import {
  UNRESTRICTED_UNIT_NAME,
  getEndpointAccessUnitNames,
} from './unitLib.mjs';
import * as libWrapper from './libWrapper.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';

function getExecuteWithServiceAccountFunction(unitName) {
  const functionName = `execute_with_${UNRESTRICTED_UNIT_NAME}${
    includeUnitName(unitName) ? `_${unitName}` : ''
  }`;
  if (libWrapper[functionName]) {
    return libWrapper[functionName];
  }
  throw new BadRequestError(
    `Unable to process the request with the '${unitName}' unit's service account; please verify the unit name.`
  );
}

// Requires amp for the http://marklogic.com/xdmp/privileges/xdmp-user-roles executive privilege.
function _isServiceAccount(userName) {
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
    includeUnitName(unitName) ? `-${unitName}` : ''
  }-endpoint-consumer`;
}

function includeUnitName(unitName) {
  return unitName != UNRESTRICTED_UNIT_NAME;
}

export { getExecuteWithServiceAccountFunction, isServiceAccount };
