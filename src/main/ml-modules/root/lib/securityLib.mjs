import { inReadOnlyMode } from './tenantStatusLib.mjs';
import { getCurrentEndpointConfig } from '../config/endpointsConfig.mjs';
import * as libWrapper from './libWrapper.mjs';
import {
  ENDPOINT_ACCESS_UNIT_NAMES,
  FEATURE_MY_COLLECTIONS_ENABLED,
  ML_APP_NAME,
} from './appConstants.mjs';
import {
  includesOrEquals,
  isObject,
  removeItemByValueFromArray,
  split,
} from '../utils/utils.mjs';
import {
  AccessDeniedError,
  BadRequestError,
  NotAcceptingWriteRequestsError,
} from './mlErrorsLib.mjs';

const UNRESTRICTED_UNIT_NAME = ML_APP_NAME;
const UNRESTRICTED_ROLE_NAME = `${ML_APP_NAME}-endpoint-consumer`;
const ADMIN_ROLE_NAME = 'admin';
const ENDPOINT_CONSUMER_ROLES_END_WITH = '-endpoint-consumer';

const PROPERTY_NAME_ONLY_FOR_UNITS = 'onlyForUnits';
const PROPERTY_NAME_EXCLUDED_UNITS = 'excludedUnits';

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
 * @returns Whatever the given function returns.
 */
function _handleRequest(f, unitName = UNRESTRICTED_UNIT_NAME) {
  if (FEATURE_MY_COLLECTIONS_ENABLED) {
    // Get the current endpoint's configuration; error thrown if config is invalid.
    const endpointConfig = getCurrentEndpointConfig();
    const currentUserIsServiceAccount = isServiceAccount(xdmp.getCurrentUser());

    // When in read-only mode, block requests that are not allowed to execute then.
    if (endpointConfig.mayNotExecuteInReadOnlyMode() && inReadOnlyMode()) {
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
    return _getExecuteWithServiceAccountFunction(unitName)(f);
  }
  // Feature is disabled, just do what we used to do.
  return f();
}
const handleRequest = import.meta.amp(_handleRequest);

function _getExecuteWithServiceAccountFunction(unitName) {
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

// Get an array of unit names known to this deployment.
function getEndpointAccessUnitNames() {
  // In case the property is not set, in which there are no endpoint consumers with
  // restricted access.
  if (ENDPOINT_ACCESS_UNIT_NAMES.includes('endpointAccessUnitNames')) {
    return [];
  }
  return removeItemByValueFromArray(
    split(ENDPOINT_ACCESS_UNIT_NAMES, ',', true),
    UNRESTRICTED_UNIT_NAME
  );
}

// Get the current user's unit name.
// Relies on role naming convention.
function getCurrentUserUnitName() {
  const unitName = xdmp
    .getCurrentRoles()
    .toArray()
    .reduce((prev, roleId) => {
      const roleName = xdmp.roleName(roleId);
      console.log(`Role: ${roleName}`);
      if (roleName == UNRESTRICTED_ROLE_NAME || roleName == ADMIN_ROLE_NAME) {
        return UNRESTRICTED_UNIT_NAME;
      } else if (roleName.endsWith(ENDPOINT_CONSUMER_ROLES_END_WITH)) {
        return roleName.slice(
          `${UNRESTRICTED_UNIT_NAME}-`.length,
          roleName.length - ENDPOINT_CONSUMER_ROLES_END_WITH.length
        );
      }
      return prev;
    }, null);

  if (unitName === null) {
    throw new BadRequestError('Unable to determine unit from roles.');
  }
  return unitName;
}

// Determine if the given scope or search term configuration is applicable to the specified unit.
// configTree should either be an entire scope or single search term from searchTermsConfig.mjs.
// These are the objects that are allowed to implement the PROPERTY_NAME_ONLY_FOR_UNITS and
// PROPERTY_NAME_EXCLUDED_UNITS properties.
function isConfiguredForUnit(unitName, configTree) {
  // The unrestricted unit gets everything.
  if (UNRESTRICTED_UNIT_NAME == unitName) {
    return true;
  }

  // Only-for takes precedence over excluded.
  if (configTree[PROPERTY_NAME_ONLY_FOR_UNITS]) {
    return includesOrEquals(configTree[PROPERTY_NAME_ONLY_FOR_UNITS], unitName);
  }

  // See if the unit is excluded.
  if (configTree[PROPERTY_NAME_EXCLUDED_UNITS]) {
    return !includesOrEquals(
      configTree[PROPERTY_NAME_EXCLUDED_UNITS],
      unitName
    );
  }

  // Default
  return true;
}

function removeUnitConfigProperties(configTree, recursive = false) {
  delete configTree[PROPERTY_NAME_ONLY_FOR_UNITS];
  delete configTree[PROPERTY_NAME_EXCLUDED_UNITS];
  if (recursive) {
    Object.keys(configTree).forEach((propName) => {
      if (isObject(configTree[propName])) {
        removeUnitConfigProperties(configTree[propName]);
      }
    });
  }
}

export {
  UNRESTRICTED_UNIT_NAME,
  handleRequest,
  isConfiguredForUnit,
  isServiceAccount,
  getCurrentUserUnitName,
  getEndpointAccessUnitNames,
  removeUnitConfigProperties,
};
