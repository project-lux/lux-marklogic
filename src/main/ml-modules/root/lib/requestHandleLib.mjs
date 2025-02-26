import { getCurrentEndpointConfig } from '../config/endpointsConfig.mjs';
import { invokeFunctionAsServiceAccount } from './securityLib.mjs';

/*
 * All endpoint requests are to go through this function.
 *
 * @param {function} f The function to run on behalf of the endpoint.
 * @param {String} serviceAccountName The service account ID to execute the function as.
 *    This is optional and intended to enable users to log into unit portals, utilize functionality
 *    restricted to individual users (vs. service accounts), yet restrict the results to what the
 *    specified (unit portal's) service account can see.  When this parameter is specified and
 *    depending on the endpoint's configuration, one of three scenarios is possible:
 *    1) The provided function will be invoked as the specified service account.
 *    2) The provided function will be executed as requesting user and used as input to another
 *       function which will be invoked as the specified service account.
 *    3) The provided function will be executed as requesting user and the service account will
 *       not be used.
 * @throws {InternalConfigurationError} when the endpoint is not property configured.
 * @throws Any other possible error the provided function can throw.
 * @returns Whatever the last function returns.
 */
function handleRequest(f, serviceAccountName) {
  const endpointConfig = getCurrentEndpointConfig();
  if (serviceAccountName && endpointConfig.isServiceAccountApplicable()) {
    console.log(
      `${xdmp.getRequestPath()}: '${serviceAccountName}' service account specified and applicable.`
    );
    // Default to given function
    let serviceAccountFunction = f;
    // Override when the endpoint needs to execute a different function as the service account.
    if (endpointConfig.hasReceivingFunctionForServiceAccount()) {
      // Execute given function as requesting user.
      console.log(
        `${xdmp.getRequestPath()}: executing provided function as input to service account function.`
      );
      const inputAsRequestingUser = f();
      // Define a zero arity (no params) function that incorporates the above return.
      serviceAccountFunction = () => {
        return endpointConfig.getReceivingFunctionForServiceAccount()(
          inputAsRequestingUser
        );
      };
    }
    console.log(
      `${xdmp.getRequestPath()}: executing function as service account.`
    );
    return invokeFunctionAsServiceAccount(
      serviceAccountFunction,
      serviceAccountName
    );
  } else {
    console.log(`${xdmp.getRequestPath()}: executing as the requesting user.`);
    return f();
  }
}

export { handleRequest };
