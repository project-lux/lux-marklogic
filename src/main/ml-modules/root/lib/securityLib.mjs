import { ML_APP_NAME } from './appConstants.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';

function getServiceAccountUsername(unitName) {
  return `${ML_APP_NAME}${
    unitName != null ? `-${unitName}` : ''
  }-endpoint-consumer`;
}

function getServiceAccountFunctionName(unitName) {
  return `execute_with_${ML_APP_NAME}${unitName != null ? `_${unitName}` : ''}`;
}

function isServiceAccount(user) {}

// Requires amp for the http://marklogic.com/xdmp/privileges/xdmp-user-roles executive privilege.
function _assertIsServiceAccount(unitName) {
  const serviceAccountUsername = getServiceAccountUsername(unitName);
  const roleNames = xdmp
    .userRoles(serviceAccountUsername)
    .toArray()
    .map((id) => {
      return xdmp.roleName(id);
    });
  if (
    roleNames.includes('admin') ||
    // TODO: switch to a base role all qualifying service accounts will have.
    !roleNames.includes('lux-ypm-endpoint-consumer')
  ) {
    throw new BadRequestError(
      `Unable to identify a qualifying service account for the '${unitName}' unit.`
    );
  }
}
const assertIsServiceAccount = import.meta.amp(_assertIsServiceAccount);

function executeWithServiceAccount(f, unitName = null) {
  // Naming convention and module location must be kept in sync with the
  // addSupportForExecutingWithServiceAccounts Gradle task.
  const functionName = getServiceAccountFunctionName(unitName);
  const serviceAccountFunction = xdmp.function(
    xs.QName(functionName),
    '/lib/libWrapper.mjs'
  );
  return xdmp.apply(serviceAccountFunction, f);
}

export { assertIsServiceAccount, executeWithServiceAccount };
