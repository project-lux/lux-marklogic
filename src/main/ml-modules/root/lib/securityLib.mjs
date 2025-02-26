import { BadRequestError } from '/lib/mlErrorsLib.mjs';

// Requires amp for the http://marklogic.com/xdmp/privileges/xdmp-invoke execute privilege.
function _invokeFunctionAsServiceAccount(f, serviceAccountName) {
  assertIsServiceAccount(serviceAccountName);
  return xdmp.invokeFunction(f, {
    userId: xdmp.user(serviceAccountName),
  });
}
const invokeFunctionAsServiceAccount = import.meta.amp(
  _invokeFunctionAsServiceAccount
);

// Requires amp for the http://marklogic.com/xdmp/privileges/xdmp-user-roles executive privilege.
function _assertIsServiceAccount(serviceAccountName) {
  const roleNames = xdmp
    .userRoles(serviceAccountName)
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
      `'${serviceAccountName}' is not a qualifying service account name.`
    );
  }
}
const assertIsServiceAccount = import.meta.amp(_assertIsServiceAccount);

export { assertIsServiceAccount, invokeFunctionAsServiceAccount };
