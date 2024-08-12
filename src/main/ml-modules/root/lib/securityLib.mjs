import { BadRequestError } from './mlErrorsLib.mjs';

const ALL_UNITS = 'lux';
const ALL_UNITS_ROLE_NAME = 'lux-endpoint-consumer';
const ADMIN_ROLE_NAME = 'admin';
const ENDPOINT_CONSUMER_ROLES_END_WITH = '-endpoint-consumer';

// Get the current user's unit name.
// Relies on role naming convention.
function getUnitName() {
  let unitName = null;

  xdmp
    .getCurrentRoles()
    .toArray()
    .every((roleId) => {
      const roleName = xdmp.roleName(roleId);
      if (roleName == ALL_UNITS_ROLE_NAME || roleName == ADMIN_ROLE_NAME) {
        unitName = ALL_UNITS;
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

export { getUnitName };
