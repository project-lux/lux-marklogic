import { ENDPOINT_ACCESS_UNIT_NAMES, ML_APP_NAME } from './appConstants.mjs';
import {
  isNonEmptyArray,
  isObject,
  removeItemByValueFromArray,
  split,
} from '../utils/utils.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';

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
  if (isNonEmptyArray(configTree[PROPERTY_NAME_ONLY_FOR_UNITS])) {
    return configTree[PROPERTY_NAME_ONLY_FOR_UNITS].includes(unitName);
  }

  // See if the unit is excluded.
  if (isNonEmptyArray(configTree[PROPERTY_NAME_EXCLUDED_UNITS])) {
    return !configTree[PROPERTY_NAME_EXCLUDED_UNITS].includes(unitName);
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
  getCurrentUserUnitName,
  getEndpointAccessUnitNames,
  isConfiguredForUnit,
  removeUnitConfigProperties,
};
