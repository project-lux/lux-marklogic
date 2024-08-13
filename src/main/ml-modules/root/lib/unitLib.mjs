import { RESTRICTED_UNIT_NAMES } from './appConstants.mjs';
import { split } from '../utils/utils.mjs';
import { BadRequestError } from './mlErrorsLib.mjs';

const UNRESTRICTED_UNIT_NAME = 'lux';
const UNRESTRICTED_ROLE_NAME = 'lux-endpoint-consumer';
const ADMIN_ROLE_NAME = 'admin';
const ENDPOINT_CONSUMER_ROLES_END_WITH = '-endpoint-consumer';

// Get an array of unit names known to this deployment.
function getRestrictedUnitNames() {
  return split(RESTRICTED_UNIT_NAMES, ',', true);
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
        if (parts.length === 4) {
          unitName = parts[1];
          return false;
        }
      }
      return true;
    });

  if (unitName === null) {
    throw new BadRequestError('Unknown unit');
  }
  return unitName;
}

export {
  UNRESTRICTED_UNIT_NAME,
  getCurrentUserUnitName,
  getRestrictedUnitNames,
};
