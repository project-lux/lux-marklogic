import {
  assertIsServiceAccount,
  executeWithServiceAccount,
} from './securityLib.mjs';

/*
 * All endpoint requests are to go through this function.
 *
 * @param {function} f The function to run on behalf of the endpoint.
 * @param {String} unitName The name of the unit to execute with their endpoint consumer role
 *    This is optional and intended to enable users to log into unit portals, utilize functionality
 *    restricted to individual users (vs. service accounts), yet restrict the results to what the
 *    specified (unit portal's) service account can see.
 * @throws {InternalConfigurationError} when the endpoint is not property configured.
 * @throws Any other possible error the provided function can throw.
 * @returns Whatever the last function returns.
 */
function handleRequest(f, unitName = '%%mlAppName%%') {
  // Deny if the endpoint is configured incorrectly.
  assertIsServiceAccount();

  // See if we're going to amp the user with a unit
  return executeWithServiceAccount(f, unitName);
}

export { handleRequest };
