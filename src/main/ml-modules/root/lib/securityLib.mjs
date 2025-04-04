import { inReadOnlyMode } from './tenantStatusLib.mjs';
import {
  getCurrentEndpointConfig,
  getCurrentEndpointPath,
} from '../config/endpointsConfig.mjs';
import * as libWrapper from './libWrapper.mjs';
import {
  ENDPOINT_ACCESS_UNIT_NAMES,
  FEATURE_MY_COLLECTIONS_ENABLED,
  ML_APP_NAME,
  UNIT_TEST_ENDPOINT,
  ROLE_NAME_MAY_RUN_UNIT_TESTS,
} from './appConstants.mjs';
import {
  includesOrEquals,
  isObject,
  isUndefined,
  removeItemByValueFromArray,
  split,
} from '../utils/utils.mjs';
import {
  AccessDeniedError,
  BadRequestError,
  NotAcceptingWriteRequestsError,
} from './mlErrorsLib.mjs';

const UNIT_NAME_UNRESTRICTED = ML_APP_NAME;

const ROLE_NAME_ADMIN = 'admin';
const ENDPOINT_CONSUMER_ROLES_END_WITH = '-endpoint-consumer';
const BASE_ENDPOINT_CONSUMER_ROLES_END_WITH = `base${ENDPOINT_CONSUMER_ROLES_END_WITH}`;
const ROLE_NAME_UNRESTRICTED = `${ML_APP_NAME}${ENDPOINT_CONSUMER_ROLES_END_WITH}`;
const ROLE_NAME_ENDPOINT_CONSUMER_USER = '%%mlAppName%%-endpoint-consumer-user';
const DEFAULT_MAY_CREATE_ROLE = true;
const CAPABILITY_READ = 'read';
const CAPABILITY_UPDATE = 'update';

const PERMITTED_CAPABILITIES = [CAPABILITY_READ, CAPABILITY_UPDATE];

const ROLE_SUFFIX_BY_CAPABILITY = {
  CAPABILITY_READ: 'reader',
  CAPABILITY_UPDATE: 'updater',
};

const PROPERTY_NAME_ONLY_FOR_UNITS = 'onlyForUnits';
const PROPERTY_NAME_EXCLUDED_UNITS = 'excludedUnits';

// Get the current user's individual role for the specified capability.  If allowed to create,
// the caller can rely on the role existing and being granted to the current user.
function _getRoleNameForCurrentUser(
  capability,
  mayCreate = DEFAULT_MAY_CREATE_ROLE
) {
  throwIfCurrentUserIsServiceAccount();

  if (PERMITTED_CAPABILITIES.includes(capability) === false) {
    throw new BadRequestError(
      `Individual user roles do not support the '${capability}' capability`
    );
  }

  const username = _getCurrentUsername();
  const roleName = `${username}-${ROLE_SUFFIX_BY_CAPABILITY[capability]}`;

  if (mayCreate === true && _hasRole(roleName) === false) {
    // Create the role when it does not exist.
    const createRole = () => {
      declareUpdate();
      const sec = require('/MarkLogic/security.xqy');
      // Requires http://marklogic.com/xdmp/privileges/get-role
      if (!sec.roleExists(roleName)) {
        const inheritedRoleNames = [];
        const defaultPermissions = [];
        const defaultCollections = [];
        // Requires http://marklogic.com/xdmp/privileges/create-role
        // and http://marklogic.com/xdmp/privileges/grant-all-roles
        sec.createRole(
          roleName,
          `The dedicated '${capability}' capacity role for user '${username}'`,
          inheritedRoleNames,
          defaultPermissions,
          defaultCollections
        );
      }
    };
    xdmp.invokeFunction(createRole, { database: xdmp.securityDatabase() });

    // Add the role when the user doesn't already have it.
    const addRole = () => {
      declareUpdate();
      const sec = require('/MarkLogic/security.xqy');
      // Requires http://marklogic.com/xdmp/privileges/user-add-roles
      // and http://marklogic.com/xdmp/privileges/grant-all-roles
      sec.userAddRoles(username, roleName);
    };
    xdmp.invokeFunction(addRole, { database: xdmp.securityDatabase() });
  }

  return roleName;
}
const getRoleNameForCurrentUser = import.meta.amp(_getRoleNameForCurrentUser);

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
function handleRequest(f, unitName = UNIT_NAME_UNRESTRICTED) {
  if (FEATURE_MY_COLLECTIONS_ENABLED) {
    // Require the current endpoint's configuration; an error is throw upon
    // retrieving the configuration when the configuration is invalid.
    return handleRequestV2(f, unitName, getCurrentEndpointConfig());
  }
  // Feature is disabled, just do what we used to do.
  return f();
}

// Handle a version 2 request initiated by a unit test.  We otherwise do not want to accept the
// endpoint configuration as a parameter.
function handleRequestV2ForUnitTesting(
  f,
  unitName = UNIT_NAME_UNRESTRICTED,
  endpointConfig
) {
  // As this allows the caller to specify which endpoint configuration to use and is only
  // intended to be called when running a unit test, restrict it.
  if (
    UNIT_TEST_ENDPOINT != getCurrentEndpointPath() ||
    _hasRole(ROLE_NAME_MAY_RUN_UNIT_TESTS) === false
  ) {
    throw new AccessDeniedError(`This function is reserved for unit testing.`);
  }

  return handleRequestV2(f, unitName, endpointConfig);
}

// Handle a version 2 request. Version 2 request support includes the My Collections feature.
// This function is to be private and in support of two public functions.
function _handleRequestV2(
  f,
  unitName = UNIT_NAME_UNRESTRICTED,
  endpointConfig
) {
  // Adjust from null
  if (isUndefined(unitName)) {
    unitName = UNIT_NAME_UNRESTRICTED;
  }

  const isServiceAccount = isCurrentUserServiceAccount();

  // When in read-only mode, block requests that are not allowed to execute then.
  if (endpointConfig.mayNotExecuteInReadOnlyMode() && inReadOnlyMode()) {
    throw new NotAcceptingWriteRequestsError(
      'The instance is in read-only mode; try again later'
    );
  }

  // Block service accounts from using any My Collections endpoint.
  if (isServiceAccount && endpointConfig.isPartOfMyCollectionsFeature()) {
    throw new AccessDeniedError(
      'Service accounts are not permitted to use this endpoint'
    );
  }

  // Ignore unit name param when requesting user is already a service account.
  if (isServiceAccount) {
    return f();
  }
  return _getExecuteWithServiceAccountFunction(unitName)(f);
}
const handleRequestV2 = import.meta.amp(_handleRequestV2);

function _getExecuteWithServiceAccountFunction(unitName) {
  const functionName = `execute_with_${unitName}`;
  if (libWrapper[functionName]) {
    return libWrapper[functionName];
  }
  throw new BadRequestError(
    `Unable to process the request with the '${unitName}' unit's service account; please verify the unit name.`
  );
}

function _getRoleServiceAccountCannotHave() {
  return ROLE_NAME_ENDPOINT_CONSUMER_USER;
}

function isCurrentUserServiceAccount() {
  return _hasRole(_getRoleServiceAccountCannotHave()) === false;
}

function throwIfCurrentUserIsServiceAccount() {
  if (isCurrentUserServiceAccount()) {
    throw new AccessDeniedError(
      'Service accounts may not perform this operation'
    );
  }
}

function _getCurrentUsername() {
  return xdmp.getCurrentUser();
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
    UNIT_NAME_UNRESTRICTED
  );
}

// Get the current user's unit name by checking the current roles. Relies on role naming
// convention.
function getCurrentUserUnitName() {
  const unitName = xdmp
    .getCurrentRoles()
    .toArray()
    .reduce((prev, roleId) => {
      const roleName = xdmp.roleName(roleId);
      if (roleName == ROLE_NAME_UNRESTRICTED || roleName == ROLE_NAME_ADMIN) {
        return UNIT_NAME_UNRESTRICTED;
      } else if (
        roleName.endsWith(ENDPOINT_CONSUMER_ROLES_END_WITH) &&
        !roleName.endsWith(BASE_ENDPOINT_CONSUMER_ROLES_END_WITH)
      ) {
        return roleName.slice(
          `${UNIT_NAME_UNRESTRICTED}-`.length,
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

function _hasRole(roleName) {
  return xdmp
    .getCurrentRoles()
    .toArray()
    .map((id) => {
      return xdmp.roleName(id);
    })
    .includes(roleName);
}

// Determine if the given scope or search term configuration is applicable to the specified unit.
// configTree should either be an entire scope or single search term from searchTermsConfig.mjs.
// These are the objects that are allowed to implement the PROPERTY_NAME_ONLY_FOR_UNITS and
// PROPERTY_NAME_EXCLUDED_UNITS properties.
function isConfiguredForUnit(unitName, configTree) {
  // The unrestricted unit gets everything.
  if (UNIT_NAME_UNRESTRICTED == unitName) {
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
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  UNIT_NAME_UNRESTRICTED,
  getRoleNameForCurrentUser,
  handleRequest,
  handleRequestV2ForUnitTesting,
  isConfiguredForUnit,
  getCurrentUserUnitName,
  getEndpointAccessUnitNames,
  removeUnitConfigProperties,
  throwIfCurrentUserIsServiceAccount,
};
