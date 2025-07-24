import { inReadOnlyMode } from './environmentLib.mjs';
import {
  getCurrentEndpointConfig,
  getCurrentEndpointPath,
} from '../config/endpointsConfig.mjs';
import * as libWrapper from './libWrapper.mjs';
import { User } from './User.mjs';
import {
  ENDPOINT_ACCESS_UNIT_NAMES,
  FEATURE_MY_COLLECTIONS_ENABLED,
  ML_APP_NAME,
  PRIVILEGES_PREFIX,
  ROLE_NAME_MAY_RUN_UNIT_TESTS,
  UNIT_TEST_ENDPOINT,
} from './appConstants.mjs';
import {
  getNodeFromObject,
  includesOrEquals,
  isDefined,
  isObject,
  isUndefined,
  removeItemByValueFromArray,
  split,
} from '../utils/utils.mjs';
import {
  AccessDeniedError,
  BadRequestError,
  InternalServerError,
  NotAcceptingWriteRequestsError,
  ServerConfigurationChangedError,
} from './mlErrorsLib.mjs';
import { IDENTIFIERS } from './identifierConstants.mjs';
import { createDocument, updateDocument } from './crudLib.mjs';
import { setDefaultCollection } from './model.mjs';

const TENANT_OWNER = ML_APP_NAME;

const ROLE_NAME_ADMIN = 'admin';
const ENDPOINT_CONSUMER_ROLES_END_WITH = '-endpoint-consumer';
const BASE_ENDPOINT_CONSUMER_ROLES_END_WITH = `base${ENDPOINT_CONSUMER_ROLES_END_WITH}`;
const ROLE_NAME_ENDPOINT_CONSUMER_TENANT_OWNER = `${TENANT_OWNER}${ENDPOINT_CONSUMER_ROLES_END_WITH}`;
const ROLE_NAME_ENDPOINT_CONSUMER_BASE = '%%mlAppName%%-endpoint-consumer-base'; // users and service accounts
const ROLE_NAME_ENDPOINT_CONSUMER_USER = '%%mlAppName%%-endpoint-consumer-user';

const PRIVILEGE_NAME_UPDATE_TENANT_STATUS = `${PRIVILEGES_PREFIX}/%%mlAppName%%-update-tenant-status`;
const ROLE_NAME_DEPLOYER = '%%mlAppName%%-deployer';

const ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER =
  '%%mlAppName%%-my-collections-data-updater';
const ROLE_NAME_MY_COLLECTION_DATA_READER =
  '%%mlAppName%%-my-collection-data-reader';
const ROLE_NAME_USER_PROFILE_DATA_READER =
  '%%mlAppName%%-user-profile-data-reader';

const CAPABILITY_READ = 'read';
const CAPABILITY_UPDATE = 'update';
const PERMITTED_CAPABILITIES = [CAPABILITY_READ, CAPABILITY_UPDATE];

const ROLE_SUFFIX_BY_CAPABILITY = {};
ROLE_SUFFIX_BY_CAPABILITY[CAPABILITY_READ] = 'reader';
ROLE_SUFFIX_BY_CAPABILITY[CAPABILITY_UPDATE] = 'updater';

const PROPERTY_NAME_ONLY_FOR_UNITS = 'onlyForUnits';
const PROPERTY_NAME_EXCLUDED_UNITS = 'excludedUnits';

const DEFAULT_COLLECTION_TEMPLATE = {
  type: 'Set',
  classified_as: [
    {
      id: 'https://not.checked',
      type: 'Type',
      _label: 'My Collection',
      equivalent: [
        {
          id: IDENTIFIERS.myCollection,
          type: 'Type',
          _label: 'My Collection',
        },
      ],
    },
  ],
  identified_by: [
    {
      type: 'Name',
      content: 'Default Collection',
      classified_as: [
        {
          id: 'https://not.checked',
          type: 'Type',
          _label: 'Primary Name',
          equivalent: [
            {
              id: IDENTIFIERS.primaryName,
              type: 'Type',
              _label: 'Primary Name',
            },
          ],
        },
        {
          id: 'https://not.checked',
          type: 'Type',
          _label: 'Sort Name',
          equivalent: [
            {
              id: IDENTIFIERS.sortName,
              type: 'Type',
              _label: 'Sort Name',
            },
          ],
        },
      ],
    },
  ],
};

const USER_PROFILE_TEMPLATE = {
  type: 'Person',
  classified_as: [
    {
      id: 'https://not.checked',
      equivalent: [
        {
          id: IDENTIFIERS.userProfile,
        },
      ],
    },
  ],
};

function _hasExclusiveRoles(user) {
  let hasAll = true;
  _getExclusiveRoleNames(user).forEach((roleName) => {
    if (hasAll && user.hasRole(roleName) === false) {
      hasAll = false;
    }
  });
  return hasAll;
}

function __createExclusiveRoles(user) {
  throwIfUserIsServiceAccount(user);

  const neededRoleNames = [];
  _getExclusiveRoleNames(user).forEach((roleName) => {
    if (user.hasRole(roleName) === false) {
      neededRoleNames.push(roleName);
    }
  });

  if (neededRoleNames.length > 0) {
    const username = user.getUsername();
    const isLocalUser = User.isLocalUser(username);

    // Create the roles that do not yet exist.
    const createRoles = () => {
      declareUpdate();
      const sec = require('/MarkLogic/security.xqy');
      neededRoleNames.forEach((roleName) => {
        // Requires http://marklogic.com/xdmp/privileges/get-role
        if (!sec.roleExists(roleName)) {
          const inheritedRoleNames = [];
          const defaultPermissions = [];
          const defaultCollections = [];
          const compartment = null;
          // Cognito pseudo-group names match the ML role names.
          const externalNames = isLocalUser ? [] : [roleName];
          // Requires http://marklogic.com/xdmp/privileges/create-role
          // and http://marklogic.com/xdmp/privileges/grant-all-roles
          sec.createRole(
            roleName,
            `An exclusive role for user '${username}'`,
            inheritedRoleNames,
            defaultPermissions,
            defaultCollections,
            compartment,
            externalNames
          );
        }
      });
    };
    xdmp.invokeFunction(createRoles, { database: xdmp.securityDatabase() });

    if (isLocalUser) {
      // Add the role when the user doesn't already have it.
      const addRoles = () => {
        declareUpdate();
        const sec = require('/MarkLogic/security.xqy');
        neededRoleNames.forEach((roleName) => {
          // Requires http://marklogic.com/xdmp/privileges/user-add-roles
          // and http://marklogic.com/xdmp/privileges/grant-all-roles
          sec.userAddRoles(username, roleName);
        });
      };
      xdmp.invokeFunction(addRoles, { database: xdmp.securityDatabase() });
    }

    // Whether it be a local or temporary user, the endpoint consumer needs to retry the current
    // request as the system will not yet acknowledge the user's new role --even with xdmp.invoke.
    throw new ServerConfigurationChangedError(
      "The requesting user's security profile changed; retry the request to enable the changes to take effect."
    );
  }
}
const _createExclusiveRoles = import.meta.amp(__createExclusiveRoles);

function getExclusiveRoleNamesByUsername(username) {
  return [getExclusiveRoleNameByUsername(username, CAPABILITY_UPDATE)];
}

function getExclusiveRoleNameByUsername(username, capability) {
  if (isUndefined(username)) {
    throw new InternalServerError(
      'The username for the exclusive role was not specified.'
    );
  }
  if (PERMITTED_CAPABILITIES.includes(capability) === false) {
    throw new BadRequestError(
      `Exclusive user roles do not support the '${capability}' capability`
    );
  }
  if (isUndefined(ROLE_SUFFIX_BY_CAPABILITY[capability])) {
    throw new InternalServerError(
      `The role name suffix is not specified for the '${capability}' capability`
    );
  }
  return `${username}-${ROLE_SUFFIX_BY_CAPABILITY[capability]}`;
}

function _getExclusiveRoleNames(user) {
  return [_getExclusiveRoleName(user, CAPABILITY_UPDATE)];
}

// Get the user's exclusive role for the specified capability.
function _getExclusiveRoleName(user, capability) {
  throwIfUserIsServiceAccount(user);
  return getExclusiveRoleNameByUsername(user.getUsername(), capability);
}

function getExclusiveDocumentPermissions(user) {
  return [
    xdmp.permission(
      _getExclusiveRoleName(user, CAPABILITY_UPDATE),
      CAPABILITY_READ
    ),
    xdmp.permission(
      _getExclusiveRoleName(user, CAPABILITY_UPDATE),
      CAPABILITY_UPDATE
    ),
  ];
}

/*
 * All endpoint requests are to go through this function.
 *
 * @param {function} f The function to run on behalf of the endpoint.
 * @param {String} unitName The name of the unit to execute with their endpoint consumer role.
 *    This is optional and intended to enable users to log into unit portals, utilize functionality
 *    restricted to individual users (vs. service accounts), yet restrict the results to what the
 *    specified (unit portal's) service account can see.
 * @param {boolean} forceInvoke If true, the function is to be invoked via xdmp.invokeFunction
 *    versus simply called f(). This is needed when the a service account needs to make a change
 *    to the database, such as updating the tenant status document.  Only applicable when the
 *    My Collections feature is enabled.
 * @throws {AccessDeniedError} when a service account attempts to use a My Collections endpoint.
 * @throws {BadRequestError} bubbles up when the specified unit name is not associated with a
 *    service account.
 * @throws {InternalConfigurationError} bubbles up when the endpoint is not property configured.
 * @throws {NotAcceptingWriteRequestsError} when the request is able to modify the database but
 *    the instances is in read-only mode.
 * @throws Any other possible error the provided function can throw.
 * @returns Whatever the given function returns.
 */
function handleRequest(f, unitName = TENANT_OWNER, forceInvoke = false) {
  const endpointConfig = getCurrentEndpointConfig(
    FEATURE_MY_COLLECTIONS_ENABLED
  );
  if (FEATURE_MY_COLLECTIONS_ENABLED) {
    // Require the current endpoint's configuration; an error is throw upon
    // retrieving the configuration when the configuration is invalid.
    return _handleRequestV2(f, unitName, endpointConfig, forceInvoke);
  } else if (endpointConfig.isPartOfMyCollectionsFeature()) {
    throw new BadRequestError('The My Collections feature is disabled.');
  }
  // Feature is disabled, just do what we used to do.
  return f();
}

// Handle a version 2 request initiated by a unit test. We otherwise do not want to accept the
// endpoint configuration as a parameter.
function handleRequestV2ForUnitTesting(
  f,
  unitName = TENANT_OWNER,
  endpointConfig
) {
  // As this allows the caller to specify which endpoint configuration to use and is only
  // intended to be called when running a unit test, restrict it.
  const user = new User();
  if (
    UNIT_TEST_ENDPOINT != getCurrentEndpointPath() ||
    user.hasRole(ROLE_NAME_MAY_RUN_UNIT_TESTS) === false
  ) {
    throw new AccessDeniedError(`This function is reserved for unit testing.`);
  }

  return _handleRequestV2(f, unitName, endpointConfig);
}

// Handle a version 2 request. Version 2 request support includes the My Collections feature.
// This function is to be private and in support of two public functions.
function __handleRequestV2(
  f,
  unitName = TENANT_OWNER,
  endpointConfig,
  forceInvoke = false
) {
  // Adjust from null
  if (isUndefined(unitName)) {
    unitName = TENANT_OWNER;
  }

  const user = new User();
  const isServiceAccount = _isUserServiceAccount(user);
  const isMyCollectionRequest = endpointConfig.isPartOfMyCollectionsFeature();

  // When in read-only mode, block requests that are not allowed to execute then.
  if (endpointConfig.mayNotExecuteInReadOnlyMode() && inReadOnlyMode()) {
    throw new NotAcceptingWriteRequestsError(
      'The instance is in read-only mode; try again later'
    );
  }

  // Block service accounts from using any My Collections endpoint.
  if (isMyCollectionRequest && isServiceAccount) {
    throw new AccessDeniedError(
      'Service accounts are not permitted to use this endpoint'
    );
  }

  // Ignore unit name param when requesting user is already a service account.
  if (isServiceAccount) {
    if (forceInvoke) {
      return xdmp.invokeFunction(f);
    } else {
      return f();
    }
  }

  // If the user does not have a user profile, create it and their default collection.
  const createUserProfile = !user.hasUserProfile();
  if (createUserProfile) {
    // If they don't have a user profile, they may not yet have their exclusive roles.
    if (!_hasExclusiveRoles(user)) {
      // This function could throw an error requesting the endpoint consumer to retry.
      _createExclusiveRoles(user);
    }

    _createUserProfileAndDefaultCollection();
  }

  return xdmp.invokeFunction(
    () => {
      return _getExecuteWithServiceAccountFunction(unitName)(f);
    },
    {
      // If we needed to create a user profile, we'll need to execute the requested function in a
      // new transaction.
      isolation: createUserProfile ? 'different-transaction' : 'same-statement',
    }
  );
}
const _handleRequestV2 = import.meta.amp(__handleRequestV2);

function _createUserProfileAndDefaultCollection() {
  const userProfileDocument = fn.head(xdmp.invokeFunction(_createUserProfile));
  xdmp.invokeFunction(() => {
    _createDefaultCollectionAndUpdateUserProfile(userProfileDocument);
  });
}

// create a user profile
function _createUserProfile() {
  declareUpdate();
  const newUserMode = true;
  return createDocument(USER_PROFILE_TEMPLATE, newUserMode);
}

function _createDefaultCollectionAndUpdateUserProfile(userProfileDocObj) {
  declareUpdate();
  let defaultCollectionDocObj;
  try {
    const newUserMode = true;

    defaultCollectionDocObj = createDocument(
      DEFAULT_COLLECTION_TEMPLATE,
      newUserMode
    );

    setDefaultCollection(userProfileDocObj, defaultCollectionDocObj.id);

    return updateDocument(
      userProfileDocObj.id,
      getNodeFromObject(userProfileDocObj),
      newUserMode
    );
  } catch (e) {
    let userMsg;
    if (isDefined(defaultCollectionDocObj)) {
      userMsg = `Unable to update the user profile with '${defaultCollectionDocObj.id}' as the default collection.`;
    } else {
      userMsg = 'Unable to create a default collection for the user.';
    }
    // Alerts are sent if this prefix appears in the logs.
    // Electing not to use a trace event.
    console.log(`User account initialization error: ${userMsg}`);
    console.log(`Underlying error: ${e.message}`);
    throw new InternalServerError(userMsg);
  }
}

function _getExecuteWithServiceAccountFunction(unitName) {
  // Javascript function and variable names cannot contain dashes, so we replace them with underscores
  const unitNameWithUnderscores = unitName.replace(/-/g, '_');
  const functionName = `execute_with_${unitNameWithUnderscores}`;
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

function _isUserServiceAccount(user) {
  return user.hasRole(_getRoleServiceAccountCannotHave()) === false;
}

function throwIfUserIsServiceAccount(user) {
  if (_isUserServiceAccount(user)) {
    throw new AccessDeniedError(
      'Service accounts may not perform this operation'
    );
  }
}

function isCurrentUserServiceAccount() {
  return _isUserServiceAccount(new User());
}

function throwIfCurrentUserIsServiceAccount() {
  throwIfUserIsServiceAccount(new User());
}

function requireUserMayUpdateTenantStatus() {
  xdmp.securityAssert(PRIVILEGE_NAME_UPDATE_TENANT_STATUS, 'execute');
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
    TENANT_OWNER
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
      if (
        roleName == ROLE_NAME_ENDPOINT_CONSUMER_TENANT_OWNER ||
        roleName == ROLE_NAME_ADMIN
      ) {
        return TENANT_OWNER;
      } else if (
        roleName.endsWith(ENDPOINT_CONSUMER_ROLES_END_WITH) &&
        !roleName.endsWith(BASE_ENDPOINT_CONSUMER_ROLES_END_WITH)
      ) {
        return roleName.slice(
          `${TENANT_OWNER}-`.length,
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
  if (TENANT_OWNER == unitName) {
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
  ROLE_NAME_DEPLOYER,
  ROLE_NAME_ENDPOINT_CONSUMER_BASE,
  ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
  ROLE_NAME_MY_COLLECTION_DATA_READER,
  ROLE_NAME_USER_PROFILE_DATA_READER,
  TENANT_OWNER,
  getCurrentUserUnitName,
  getEndpointAccessUnitNames,
  getExclusiveDocumentPermissions,
  getExclusiveRoleNameByUsername,
  getExclusiveRoleNamesByUsername,
  handleRequest,
  handleRequestV2ForUnitTesting,
  isConfiguredForUnit,
  isCurrentUserServiceAccount,
  removeUnitConfigProperties,
  requireUserMayUpdateTenantStatus,
  throwIfCurrentUserIsServiceAccount,
  throwIfUserIsServiceAccount,
};
