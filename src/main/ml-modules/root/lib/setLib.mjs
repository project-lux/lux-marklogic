import {
  BASE_URL,
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
} from './appConstants.mjs';
import {
  getExclusiveDocumentPermissionsForCurrentUser,
  throwIfCurrentUserIsServiceAccount,
} from './securityLib.mjs';
import {
  addAddedToByEntry,
  getAddedToBy,
  getCreatedBy,
  getId,
  getSetMembers,
  setAddedToBy,
  setCreatedBy,
  setId,
  setSetMembers,
} from './model.mjs';
import { getTenantRole } from './tenantStatusLib.mjs';
import { BadRequestError, LoopDetectedError } from './mlErrorsLib.mjs';
import { getLanguageIdentifier } from './identifierConstants.mjs';
import { isNonEmptyArray } from '../utils/utils.mjs';

const DEFAULT_LANG = getLanguageIdentifier('en');
const MAX_ATTEMPTS_FOR_NEW_URI = 20;

function createSet(docNode, lang = DEFAULT_LANG) {
  return _insertSet(docNode, lang, true);
}

function updateSet(docNode, lang = DEFAULT_LANG) {
  return _insertSet(docNode, lang, false);
}

function _insertSet(readOnlyDocNode, lang, newSet = false) {
  throwIfCurrentUserIsServiceAccount();

  // We're to receive the contents of /json but need the full context going forward.
  readOnlyDocNode = xdmp.toJSON({
    json: readOnlyDocNode.toObject(),
  });

  const report = xdmp.jsonValidateReport(
    readOnlyDocNode,
    '/json-schema/editable-set.schema.json',
    ['full']
  );
  if (isNonEmptyArray(report.errors)) {
    throw new BadRequestError(
      `${report.errors.length} validation error(s) found: ${report.errors
        .map((error, idx) => {
          return `${idx + 1}: ${error}`;
        })
        .join('; ')}`
    );
  } else {
    const editableDocObj = readOnlyDocNode.toObject();

    // Deduplicate and drop references to self.
    let givenMembers = getSetMembers(readOnlyDocNode);
    if (givenMembers) {
      const self = getId(readOnlyDocNode);
      const revisedMembers = Array.from(
        new Map(
          givenMembers
            .filter((member) => member.id + '' !== self)
            .map((member) => [member.id + '', member])
        ).values()
      );
      setSetMembers(editableDocObj, revisedMembers);
    }

    let uri;
    let docOptions = {};
    if (newSet) {
      uri = _getNewSetUri();
      setId(editableDocObj, uri);
      setCreatedBy(editableDocObj);
      setAddedToBy(editableDocObj, null);
      docOptions = {
        permissions: getExclusiveDocumentPermissionsForCurrentUser(),
        collections: [getTenantRole(), COLLECTION_NAME_MY_COLLECTIONS_FEATURE],
      };
    } else {
      uri = getId(readOnlyDocNode);
      if (!fn.docAvailable(uri)) {
        throw new BadRequestError(
          `The document with URI '${uri}' does not exist.`
        );
      }

      // Preserve creation and modification histories.
      const existingDocNode = cts.doc(uri);
      setCreatedBy(editableDocObj, getCreatedBy(existingDocNode));
      setAddedToBy(editableDocObj, getAddedToBy(existingDocNode));

      addAddedToByEntry(editableDocObj);

      docOptions = {
        permissions: xdmp.documentGetPermissions(uri),
        collections: xdmp.documentGetCollections(uri),
      };
    }

    xdmp.documentInsert(uri, editableDocObj, docOptions);

    return editableDocObj.json;
  }
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

export { createSet, updateSet };
