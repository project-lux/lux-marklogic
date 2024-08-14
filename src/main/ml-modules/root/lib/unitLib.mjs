import { RESTRICTED_UNIT_NAMES } from './appConstants.mjs';
import {
  isNonEmptyArray,
  isObject,
  removeItemByValueFromArray,
  split,
} from '../utils/utils.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';

const UNRESTRICTED_UNIT_NAME = 'lux';
const UNRESTRICTED_ROLE_NAME = 'lux-endpoint-consumer';
const ADMIN_ROLE_NAME = 'admin';
const ENDPOINT_CONSUMER_ROLES_END_WITH = '-endpoint-consumer';

const PROPERTY_NAME_ONLY_FOR_UNITS = 'onlyForUnits';
const PROPERTY_NAME_EXCLUDED_UNITS = 'excludedUnits';

// Get an array of unit names known to this deployment.
function getRestrictedUnitNames() {
  return removeItemByValueFromArray(
    split(RESTRICTED_UNIT_NAMES, ',', true),
    UNRESTRICTED_UNIT_NAME
  );
}

// Get the current user's unit name.
// Relies on role naming convention.
function getCurrentUserUnitName() {
  let unitName = null;

  xdmp
    .getCurrentRoles()
    .toArray()
    .every((roleId) => {
      const roleName = xdmp.roleName(roleId);
      if (roleName == UNRESTRICTED_ROLE_NAME || roleName == ADMIN_ROLE_NAME) {
        unitName = UNRESTRICTED_UNIT_NAME;
        return false;
      } else if (roleName.endsWith(ENDPOINT_CONSUMER_ROLES_END_WITH)) {
        const parts = roleName.split('-');
        if (parts.length >= 4) {
          // Return whatever is between "lux-" and "-endpoint-consumer".
          unitName = parts.slice(1, parts.length - 2).join('-');
          return false;
        }
      }
      return true;
    });

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
  getRestrictedUnitNames,
  isConfiguredForUnit,
  removeUnitConfigProperties,
};
