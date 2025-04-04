import {
  BASE_URL,
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
} from './appConstants.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  getRoleNameForCurrentUser,
  throwIfCurrentUserIsServiceAccount,
} from './securityLib.mjs';
import { getTenantRole } from './tenantStatusLib.mjs';
import { BadRequestError, LoopDetectedError } from './mlErrorsLib.mjs';

const SET_SUB_TYPE_MY_COLLECTION = 'myCollection';

const PERMITTED_SET_SUB_TYPES = [SET_SUB_TYPE_MY_COLLECTION];
const MAX_ATTEMPTS_FOR_NEW_URI = 20;

/*
 * Candidate info to return:
 *
 * URI/ID
 *
 *
 */
function createSet(doc) {
  throwIfCurrentUserIsServiceAccount();

  // May become a parameter later.
  const subTypeName = SET_SUB_TYPE_MY_COLLECTION;

  const uri = _getNewSetUri(subTypeName);

  const mayCreate = true;
  const roleNameRead = getRoleNameForCurrentUser(CAPABILITY_READ, mayCreate);
  const roleNameUpdate = getRoleNameForCurrentUser(
    CAPABILITY_UPDATE,
    mayCreate
  );

  xdmp.documentInsert(uri, doc, {
    permissions: [
      xdmp.permission(roleNameRead, 'read'),
      xdmp.permission(roleNameUpdate, 'update'),
    ],
    collections: [
      getTenantRole(),
      COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
      subTypeName,
    ],
  });

  return doc;
}

function _getNewSetUri(subType, attempt = 1) {
  // Insurance
  if (attempt > MAX_ATTEMPTS_FOR_NEW_URI) {
    throw new LoopDetectedError(
      `Unable to determine a unique URI for a new Set within ${MAX_ATTEMPTS_FOR_NEW_URI} attempts.`
    );
  }

  // Prevent unsupported sub types.
  if (!PERMITTED_SET_SUB_TYPES.includes(subType)) {
    throw new BadRequestError(`Invalid Set sub type: '${subType}'`);
  }

  // We like this request.
  const uri = `${BASE_URL}/${subType}/${sem.uuidString()}`;
  if (fn.docAvailable(uri)) {
    return _getNewSetUri(subType, ++attempt);
  }
  return uri;
}

export { createSet };
