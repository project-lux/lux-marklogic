import {
  BASE_URL,
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
} from './appConstants.mjs';
import {
  getExclusiveDocumentPermissionsForCurrentUser,
  throwIfCurrentUserIsServiceAccount,
} from './securityLib.mjs';
import {
  TYPE_SET,
  hasJsonLD,
  getClassifiedAsIds,
  getIdentifiedByPrimaryName,
  setCreatedBy,
  setId,
  getType,
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

  // Check the Set's type.
  if (TYPE_SET != getType(docNode)) {
    throw new BadRequestError('The provided document must be a Set.');
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

  xdmp.documentInsert(uri, docObj, {
    permissions: getExclusiveDocumentPermissionsForCurrentUser(),
    collections: [getTenantRole(), COLLECTION_NAME_MY_COLLECTIONS_FEATURE],
  });

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
