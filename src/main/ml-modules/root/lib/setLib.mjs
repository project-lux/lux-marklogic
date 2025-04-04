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
import {
  hasJsonLD,
  getIdentifiedByPrimaryName,
  getType,
  setId,
} from './model.mjs';
import { getTenantRole } from './tenantStatusLib.mjs';
import { BadRequestError, LoopDetectedError } from './mlErrorsLib.mjs';
import { isUndefined } from '../utils/utils.mjs';

const SET_SUB_TYPE_MY_COLLECTION = 'myCollection';

const PERMITTED_SET_SUB_TYPES = [SET_SUB_TYPE_MY_COLLECTION];
const MAX_ATTEMPTS_FOR_NEW_URI = 20;

function createSet(docNode, lang) {
  throwIfCurrentUserIsServiceAccount();

  // May become a parameter later.
  const subTypeName = SET_SUB_TYPE_MY_COLLECTION;

  if (!hasJsonLD(docNode)) {
    throw new BadRequestError(
      'The provided document does not contain JSON-LD in the required location.'
    );
  }

  // Type in JSON-LD can be the entity, which can be the sub-type.
  _throwIfUnsupportedSubType(getType(docNode));

  if (isUndefined(getIdentifiedByPrimaryName(docNode, lang))) {
    throw new BadRequestError(
      'The provided document does not contain a primary name.'
    );
  }

  const docObj = docNode.toObject();

  const uri = _getNewSetUri(subTypeName);
  setId(docObj, uri);

  const mayCreateRole = true;
  xdmp.documentInsert(uri, docObj, {
    permissions: [
      xdmp.permission(
        getRoleNameForCurrentUser(CAPABILITY_READ, mayCreateRole),
        'read'
      ),
      xdmp.permission(
        getRoleNameForCurrentUser(CAPABILITY_UPDATE, mayCreateRole),
        'update'
      ),
    ],
    collections: [
      getTenantRole(),
      COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
      subTypeName,
    ],
  });

  return docObj;
}

function _getNewSetUri(subType, attempt = 1) {
  _throwIfUnsupportedSubType(subType);

  // Insurance
  if (attempt > MAX_ATTEMPTS_FOR_NEW_URI) {
    throw new LoopDetectedError(
      `Unable to determine a unique URI for a new Set within ${MAX_ATTEMPTS_FOR_NEW_URI} attempts.`
    );
  }

  // We like this request.
  const uri = `${BASE_URL}/${subType}/${sem.uuidString()}`;
  if (fn.docAvailable(uri)) {
    return _getNewSetUri(subType, ++attempt);
  }
  return uri;
}

function _throwIfUnsupportedSubType(subType) {
  if (!PERMITTED_SET_SUB_TYPES.includes(subType)) {
    throw new BadRequestError(`Invalid Set sub-type: '${subType}'`);
  }
}

export { createSet };
