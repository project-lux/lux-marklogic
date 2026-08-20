import { getCurrentEndpointPath } from '../config/endpointsConfig.mjs';
import { User } from './User.mjs';
import {
  ENDPOINT_ACCESS_UNIT_NAMES,
  ENDPOINT_CONSUMER_ROLES_END_WITH,
  ML_APP_NAME,
  PRIVILEGES_PREFIX,
  ROLE_NAME_MAY_RUN_UNIT_TESTS,
  UNIT_TEST_ENDPOINT,
  TRACE_NAME_ERROR,
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
  InvalidHostError,
} from './errorClasses.mjs';

const TENANT_OWNER = ML_APP_NAME;

const ROLE_NAME_ADMIN = 'admin';
const BASE_ENDPOINT_CONSUMER_ROLES_END_WITH = `base${ENDPOINT_CONSUMER_ROLES_END_WITH}`;
const ROLE_NAME_ENDPOINT_CONSUMER_TENANT_OWNER = `${TENANT_OWNER}${ENDPOINT_CONSUMER_ROLES_END_WITH}`;

const PRIVILEGE_NAME_SCALE_ENVIRONMENT = `${PRIVILEGES_PREFIX}/%%mlAppName%%-scale-environment`;
const PRIVILEGE_NAME_VALIDATE_DATASET = `${PRIVILEGES_PREFIX}/%%mlAppName%%-validate-dataset`;

const PROPERTY_NAME_ONLY_FOR_UNITS = 'onlyForUnits';
const PROPERTY_NAME_EXCLUDED_UNITS = 'excludedUnits';

/*
 * All endpoint requests are to go through this function.
 *
 * @param {function} f The function to run on behalf of the endpoint.
 * @throws Any other possible error the provided function can throw.
 * @returns Whatever the given function returns.
 */
function handleRequest(f) {
  try {
    return _handleRequest(f);
  } catch (e) {
    if (xdmp.traceEnabled(TRACE_NAME_ERROR)) {
      xdmp.trace(
        TRACE_NAME_ERROR,
        JSON.stringify({
          statusCode: e.statusCode || 500,
          status: e.name,
          message: e.message,
          cause: e.cause, // as of 2026-05, cause is usually not present, but it could be helpful when available
        }),
      );
    }
    // if there is a status code, this is an error we defined
    if (e.statusCode && typeof e.statusCode === 'number') {
      xdmp.setResponseCode(e.statusCode, e.message);
      return {
        errorResponse: {
          statusCode: e.statusCode,
          status: e.name,
          messageCode: e.name,
          message: e.message,
        },
      };
    }
    // if there is no status code, this is an unexpected error, let MarkLogic handle it the default way
    else {
      throw e;
    }
  }
}

function __handleRequest(f) {
  return f();
}
const _handleRequest = import.meta.amp(__handleRequest);

// Handle a request initiated by a unit test. Only intended to be called when running a unit test.
function handleRequestForUnitTesting(f) {
  const user = new User();
  if (
    UNIT_TEST_ENDPOINT != getCurrentEndpointPath() ||
    user.hasRole(ROLE_NAME_MAY_RUN_UNIT_TESTS) === false
  ) {
    throw new AccessDeniedError(`This function is reserved for unit testing.`);
  }

  return _handleRequest(f);
}

function mayScaleEnvironment() {
  return (
    new User().hasRole(ROLE_NAME_ADMIN) ||
    xdmp.passiveHasPrivilege(PRIVILEGE_NAME_SCALE_ENVIRONMENT, 'execute')
  );
}

function mayValidateDataset() {
  return (
    new User().hasRole(ROLE_NAME_ADMIN) ||
    xdmp.passiveHasPrivilege(PRIVILEGE_NAME_VALIDATE_DATASET, 'execute')
  );
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
    TENANT_OWNER,
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
          roleName.length - ENDPOINT_CONSUMER_ROLES_END_WITH.length,
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
      unitName,
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

/**
 * Simple validation to ensure host contains only valid hostname/IP characters
 * @param {string} host - The host parameter to validate
 * @throws {InvalidHostError} If the host contains invalid characters
 */
function validateAndTrimHost(host) {
  if (!host || typeof host !== 'string') {
    throw new InvalidHostError('Host parameter is required');
  }

  // Allow only valid hostname/IP characters (prevents injection attacks)
  // Note: Colons are not allowed as they're used for hostname:port separation
  if (!/^[a-zA-Z0-9.-]+$/.test(host.trim())) {
    throw new InvalidHostError('Host parameter contains invalid characters');
  }

  return host.trim();
}

export {
  TENANT_OWNER,
  getCurrentUserUnitName,
  getEndpointAccessUnitNames,
  handleRequest,
  handleRequestForUnitTesting,
  isConfiguredForUnit,
  mayScaleEnvironment,
  mayValidateDataset,
  removeUnitConfigProperties,
  validateAndTrimHost,
};
