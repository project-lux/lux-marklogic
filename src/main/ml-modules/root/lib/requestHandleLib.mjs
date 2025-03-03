import { UNRESTRICTED_UNIT_NAME } from './unitLib.mjs';
import {
  getExecuteWithServiceAccountFunction,
  isServiceAccount,
} from './securityLib.mjs';
import { getCurrentEndpointConfig } from '../config/endpointsConfig.mjs';
import { inReadOnlyMode } from './tenantStatusLib.mjs';
import {
  AccessDeniedError,
  NotAcceptingWriteRequestsError,
} from './mlErrorsLib.mjs';

/*
 * All endpoint requests are to go through this function.
 *
 * @param {function} f The function to run on behalf of the endpoint.
 * @param {String} unitName The name of the unit to execute with their endpoint consumer role.
 *    This is optional and intended to enable users to log into unit portals, utilize functionality
 *    restricted to individual users (vs. service accounts), yet restrict the results to what the
 *    specified (unit portal's) service account can see.
 * @throws {AccessDeniedError} when a service account attempts to use a My Collections endpoint.
 * @throws {BadRequestError} bubbles up when the specified unit name is not associated with a
 *    service account.
 * @throws {InternalConfigurationError} bubbles up when the endpoint is not property configured.
 * @throws {NotAcceptingWriteRequestsError} when the request is able to modify the database but
 *    the instances is in read-only mode.
 * @throws Any other possible error the provided function can throw.
 * @returns Whatever the last function returns.
 */
function _handleRequest(f, unitName = UNRESTRICTED_UNIT_NAME) {
  // Get the current endpoint's configuration; error thrown if config is invalid.
  const endpointConfig = getCurrentEndpointConfig();
  const currentUserIsServiceAccount = isServiceAccount(xdmp.getCurrentUser());

  // When in read-only mode, block requests that are not allowed to execute then.
  if (inReadOnlyMode() && endpointConfig.mayNotExecuteInReadOnlyMode()) {
    throw new NotAcceptingWriteRequestsError(
      'The instance is in read-only mode; try again later'
    );
  }

  // Block service accounts from using any My Collections endpoint.
  if (
    currentUserIsServiceAccount &&
    endpointConfig.isPartOfMyCollectionsFeature()
  ) {
    throw new AccessDeniedError(
      'Service accounts are not permitted to use this endpoint'
    );
  }

  // Ignore unit name param when requesting user is already a service account.
  if (currentUserIsServiceAccount) {
    return f();
  }
  return getExecuteWithServiceAccountFunction(unitName)(f);
}
const handleRequest = import.meta.amp(_handleRequest);

export { handleRequest };
