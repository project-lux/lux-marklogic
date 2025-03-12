import * as libWrapper from './libWrapper.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';
import { ENDPOINT_ACCESS_UNIT_NAMES, ML_APP_NAME } from './appConstants.mjs';
import {
  includesOrEquals,
  isObject,
  removeItemByValueFromArray,
  split,
} from '../utils/utils.mjs';

function getExecuteWithServiceAccountFunction(unitName) {
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

const UNRESTRICTED_UNIT_NAME = ML_APP_NAME;
const UNRESTRICTED_ROLE_NAME = `${ML_APP_NAME}-endpoint-consumer`;
const ADMIN_ROLE_NAME = 'admin';
const ENDPOINT_CONSUMER_ROLES_END_WITH = '-endpoint-consumer';

const PROPERTY_NAME_ONLY_FOR_UNITS = 'onlyForUnits';
const PROPERTY_NAME_EXCLUDED_UNITS = 'excludedUnits';

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
  isConfiguredForUnit,
  isServiceAccount,
  getCurrentUserUnitName,
  getEndpointAccessUnitNames,
  getExecuteWithServiceAccountFunction,
  removeUnitConfigProperties,
};
