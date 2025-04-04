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
  getClassifiedAsIds,
  getIdentifiedByPrimaryName,
  setCreatedBy,
  setId,
} from './model.mjs';
import { IDENTIFIERS } from './identifierConstants.mjs';
import { getTenantRole } from './tenantStatusLib.mjs';
import { BadRequestError, LoopDetectedError } from './mlErrorsLib.mjs';
import { getArrayOverlap, isUndefined } from '../utils/utils.mjs';

const PERMITTED_SET_CLASSIFICATION_IDS = [IDENTIFIERS.myCollection];

const MAX_ATTEMPTS_FOR_NEW_URI = 20;

function createSet(docNode, lang) {
  throwIfCurrentUserIsServiceAccount();

  if (!hasJsonLD(docNode)) {
    throw new BadRequestError(
      'The provided document does not contain JSON-LD in the required location.'
    );
  }

  // Check the Set's classification
  _throwIfUnsupportedSet(getClassifiedAsIds(docNode));

  if (isUndefined(getIdentifiedByPrimaryName(docNode, lang))) {
    throw new BadRequestError(
      'The provided document does not contain a primary name.'
    );
  }

  const docObj = docNode.toObject();

  const uri = _getNewSetUri();
  setId(docObj, uri);
  setCreatedBy(docObj);

  const mayCreateRole = true;
  const roleNameRead = getRoleNameForCurrentUser(
    CAPABILITY_READ,
    mayCreateRole
  );
  const roleNameUpdate = getRoleNameForCurrentUser(
    CAPABILITY_UPDATE,
    mayCreateRole
  );
  // Execute the user of the roles in a separate transaction; else, when the above
  // code creates them, they won't be available in the current (older) transaction.
  const fun = () => {
    declareUpdate();
    xdmp.documentInsert(uri, docObj, {
      permissions: [
        xdmp.permission(roleNameRead, 'read'),
        xdmp.permission(roleNameUpdate, 'update'),
      ],
      collections: [getTenantRole(), COLLECTION_NAME_MY_COLLECTIONS_FEATURE],
    });
  };
  xdmp.invokeFunction(fun);

  return docObj;
}

function _getNewSetUri(attempt = 1) {
  // Insurance
  if (attempt > MAX_ATTEMPTS_FOR_NEW_URI) {
    throw new LoopDetectedError(
      `Unable to determine a unique URI for a new Set within ${MAX_ATTEMPTS_FOR_NEW_URI} attempts.`
    );
  }

  // We like this request.
  const uri = `${BASE_URL}/set/${sem.uuidString()}`;
  if (fn.docAvailable(uri)) {
    return _getNewSetUri(++attempt);
  }
  return uri;
}

function _throwIfUnsupportedSet(classificationIds) {
  if (
    getArrayOverlap(PERMITTED_SET_CLASSIFICATION_IDS, classificationIds)
      .length === 0
  ) {
    throw new BadRequestError(
      `Unsupported Set classification(s) for the current operation: '${classificationIds.join(
        "', '"
      )}'`
    );
  }
}

export { createSet };
