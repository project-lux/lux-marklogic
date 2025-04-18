const ROLE_PROD = 'prod';
const ROLE_NON_PROD = 'nonProd';

function inReadOnlyMode() {
  // TODO: update once we have a tenant status doc.
  return false;
}

function getTenantRole() {
  // TODO: update once we have a tenant status doc.
  return ROLE_NON_PROD;
}

export { getTenantRole, inReadOnlyMode };
