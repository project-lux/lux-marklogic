import {
  UNRESTRICTED_UNIT_NAME,
  getEndpointAccessUnitNames,
} from './unitLib.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';
import { execute_with_lux, execute_with_lux_ypm } from './libWrapper.mjs';

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

function getServiceAccountFunctionName(unitName) {
  return `execute_with_${UNRESTRICTED_UNIT_NAME}${
    unitName != null ? `_${unitName}` : ''
  }`;
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

function assertIsServiceAccount(unitName) {
  if (!isServiceAccount(getServiceAccountUsername(unitName))) {
    throw new BadRequestError(
      `Unable to identify a qualifying service account for the '${unitName}' unit.`
    );
  }
}

function executeWithServiceAccount(f, unitName = UNRESTRICTED_UNIT_NAME) {
  console.log(
    `Roles before gaining those of service account: ${xdmp
      .getCurrentRoles()
      .toArray()
      .map((id) => {
        return xdmp.roleName(id);
      })
      .join(', ')}`
  );
  if (unitName == '%%mlAppName%%') {
    console.log('Executing as LUX');
    return execute_with_lux(f);
  } else if (unitName == 'ypm') {
    console.log('Executing as YPM');
    return execute_with_lux_ypm(f);
  }
  throw new Error(`Not implemented for the '${unitName}' unit`);

  // // Function naming convention and module location must be kept in sync with the
  // // addSupportForExecutingWithServiceAccounts Gradle task.
  // const functionName = getServiceAccountFunctionName(unitName);
  // const serviceAccountFunction = xdmp.function(
  //   xs.QName(functionName),
  //   '/lib/libWrapper.sjs'
  // );

  // // As MJS, "serviceAccountFunction is not a function"
  // // As SJS, Cannot import a non-module JavaScript program
  // return serviceAccountFunction(f);

  // // As MJS, JS-JAVASCRIPT: export { -- Error running JavaScript request: SyntaxError: Unexpected token export
  // // As SJS, Cannot import a non-module JavaScript program
  // // return xdmp.apply(serviceAccountFunction, f);
}

export {
  assertIsServiceAccount,
  executeWithServiceAccount,
  getServiceAccountUserId,
  getServiceAccountUsername,
  isServiceAccount,
};
