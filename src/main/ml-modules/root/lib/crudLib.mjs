import {
  BASE_URL,
  COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
  COLLECTION_NAME_MY_COLLECTION,
  COLLECTION_NAME_NON_PRODUCTION,
  COLLECTION_NAME_PRODUCTION,
  COLLECTION_NAME_USER_PROFILE,
} from './appConstants.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
  ROLE_NAME_MY_COLLECTION_DATA_READER,
  ROLE_NAME_USER_PROFILE_DATA_READER,
  getExclusiveDocumentPermissions,
  getExclusiveRoleNameByUsername,
  throwIfCurrentUserIsServiceAccount,
  throwIfUserIsServiceAccount,
} from './securityLib.mjs';
import { User } from './User.mjs';
import {
  addAddedToByEntry,
  getAddedToBy,
  getCreatedBy,
  getDefaultCollection,
  getId,
  getSetMembers,
  isMyCollection,
  isUserProfile,
  removeAddedToBy,
  setAddedToBy,
  setCreatedBy,
  setId,
  setIndexedProperties,
  setSetMembers,
  setUsername,
} from './model.mjs';
import { applyProfile } from './profileDocLib.mjs';
import { isProduction } from './environmentLib.mjs';
import {
  BadRequestError,
  LoopDetectedError,
  NotFoundError,
} from './mlErrorsLib.mjs';
import {
  getNodeFromObject,
  isNonEmptyArray,
  isDefined,
  isUndefined,
} from '../utils/utils.mjs';

const DEFAULT_LANG = 'en';
const MAX_ATTEMPTS_FOR_NEW_URI = 20;

const DOCUMENT_TYPE_MY_COLLECTION = 'My Collection';
const DOCUMENT_TYPE_USER_PROFILE = 'User Profile';

function createDocument(docNode, newUserMode, lang = DEFAULT_LANG) {
  const uri = null; // determined later
  const newDocumentMode = true;
  return _insertDocument(uri, docNode, newUserMode, newDocumentMode, lang);
}

// This function has access to all user profiles and is responsible for restricting access
// to the name profile when the requesting user is not the owner of the profile.
function _readDocument(uri, profile = null, lang = DEFAULT_LANG) {
  if (fn.docAvailable(uri)) {
    const docNode = cts.doc(uri);

    // If a user profile but not the current user's profile, restrict to the name profile.
    if (isUserProfile(docNode) && new User().getUserIri() !== uri) {
      profile = 'name';
    }

    return applyProfile(docNode, profile, lang);
  } else {
    throw new NotFoundError(`Document '${uri}' not found`);
  }
}
const readDocument = import.meta.amp(_readDocument);

function updateDocument(uri, docNode, newUserMode, lang = DEFAULT_LANG) {
  const newDocumentMode = false;
  return _insertDocument(uri, docNode, newUserMode, newDocumentMode, lang);
}

function deleteDocument(uri) {
  throwIfCurrentUserIsServiceAccount();

  if (isDefined(uri)) {
    if (fn.docAvailable(uri)) {
      // We're purposely blocking the deletion of user profiles as user IRIs are used in
      // My Collection documents and are not deterministic.
      const doc = cts.doc(uri);
      if (isMyCollection(doc)) {
        // Do not allow deletion of a user's default My Collection.
        const defaultMyCollectionIri = getDefaultCollection(
          cts.doc(new User().getUserIri())
        );
        if (uri === defaultMyCollectionIri) {
          throw new BadRequestError(
            `Default personal collections may not be deleted.`
          );
        }
        // Delete the document.
        xdmp.documentDelete(uri);
      } else {
        throw new BadRequestError(
          `The document type is not supported. The document must be a ${DOCUMENT_TYPE_MY_COLLECTION}.`
        );
      }
    } else {
      throw new NotFoundError(`Document '${uri}' not found`);
    }
  } else {
    throw new BadRequestError('The URI is required.');
  }
}

function _insertDocument(
  uri,
  readOnlyDocNode,
  newUserMode,
  newDocumentMode,
  lang = DEFAULT_LANG
) {
  const user = new User();
  throwIfUserIsServiceAccount(user);

  // We're to receive the contents of /json but need the full context going forward.
  readOnlyDocNode = getNodeFromObject({
    json: readOnlyDocNode,
  });

  // When updating a document, require the given URI match the document's ID.
  if (!newDocumentMode) {
    if (isUndefined(uri)) {
      throw new BadRequestError('The URI is required for updating a document.');
    }
    const docId = getId(readOnlyDocNode);
    if (uri !== docId) {
      throw new BadRequestError(
        `The URI '${uri}' does not match the document ID '${docId}'.`
      );
    }
  } // Update mode may now rely on the value of the uri parameter.

  let config;
  const docIsUserProfile = isUserProfile(readOnlyDocNode);
  if (docIsUserProfile) {
    config = _getUserProfileConfig(
      user,
      uri,
      readOnlyDocNode,
      newUserMode,
      newDocumentMode,
      lang
    );
  } else if (isMyCollection(readOnlyDocNode)) {
    config = _getMyCollectionConfig(
      user,
      uri,
      readOnlyDocNode,
      newUserMode,
      newDocumentMode,
      lang
    );
  } else {
    throw new BadRequestError(
      `The document type is not supported. The document must be a ${DOCUMENT_TYPE_MY_COLLECTION} or ${DOCUMENT_TYPE_USER_PROFILE}.`
    );
  }

  const report = xdmp.jsonValidateReport(readOnlyDocNode, config.schemaPath, [
    'full',
  ]);
  if (isNonEmptyArray(report.errors)) {
    throw new BadRequestError(
      `${report.errors.length} validation error(s) found: ${report.errors
        .map((error, idx) => {
          return `${idx + 1}: ${error}`;
        })
        .join('; ')}`
    );
  }

  // Switching from read-only to read-write.
  const editableDocObj = readOnlyDocNode.toObject();

  // The post validation callback may be used to modify the document.
  if (config.postValidationCallback) {
    config.postValidationCallback(readOnlyDocNode, editableDocObj);
  }

  if (newDocumentMode) {
    uri = _getNewDocumentUri(config.recordType);
    setId(editableDocObj, uri);
    // When creating a new user profile, the user object will not yet be able to serve up the IRI.
    const userIri = docIsUserProfile ? uri : user.getUserIri();
    removeAddedToBy(editableDocObj); // execute before setCreatedBy.
    setCreatedBy(editableDocObj, userIri); // duplicates created by in added to by.
    setIndexedProperties(editableDocObj, config.indexedProperties);
  } else {
    // Searching for the document and requiring the user be able to update the document in order
    // to provide a better error message (for an edge case of trying to use a My Collection or
    // user profile IRI to update a pipeline-provided document).
    const existingDocNode = fn.head(
      cts.search(
        cts.andQuery([
          cts.documentQuery(uri),
          cts.documentPermissionQuery(
            getExclusiveRoleNameByUsername(
              user.getUsername(),
              CAPABILITY_UPDATE
            ),
            CAPABILITY_UPDATE
          ),
        ])
      )
    );

    if (isUndefined(existingDocNode)) {
      throw new BadRequestError(
        'Either the document does not exist or you do not have permission to update it.'
      );
    }

    // Preserve anything outside of /json
    const existingDocObj = existingDocNode.toObject();
    for (const prop in existingDocObj) {
      if (prop !== 'json') {
        editableDocObj[prop] = existingDocObj[prop];
      }
    }

    // Always preserve creation and modification histories, then add a new modification entry.
    setCreatedBy(editableDocObj, null, getCreatedBy(existingDocNode));
    setAddedToBy(editableDocObj, getAddedToBy(existingDocNode));
    addAddedToByEntry(editableDocObj, user.getUserIri());
  }

  xdmp.documentInsert(uri, editableDocObj, config.docOptions);

  return editableDocObj.json;
}

function _getUserProfileConfig(
  user,
  uri,
  readOnlyDocNode,
  newUserMode,
  newDocumentMode,
  lang = DEFAULT_LANG
) {
  // Pre-validation checks.
  const userId = user.getUserIri();
  const userProfileExists = fn.docAvailable(userId);
  const defaultMyCollectionUri = getDefaultCollection(readOnlyDocNode);
  const isDefaultMyCollectionSpecified = isDefined(defaultMyCollectionUri);
  if (newDocumentMode && userProfileExists) {
    throw new BadRequestError(
      `The user '${user.getUsername()}' already has a profile.`
    );
  } else if (!newDocumentMode) {
    if (uri !== userId) {
      throw new BadRequestError(
        `The ID in the provided document, '${uri}', does not match that of user '${user.getUsername()}'.`
      );
    } else if (!userProfileExists) {
      // Unlikely as the user IRI comes from the profile.
      throw new BadRequestError(
        `User '${user.getUsername()}' does not have a profile.`
      );
    } else if (!isDefaultMyCollectionSpecified) {
      throw new BadRequestError('The default collection is required.');
    }
  }
  // When creating or updating a user profile and a default collection is specified (required above
  // when updating) but not when establishing a new user, ensure it is a qualifying collection.
  if (isDefaultMyCollectionSpecified && !newUserMode) {
    if (!fn.docAvailable(defaultMyCollectionUri)) {
      throw new BadRequestError(
        'The document specified as the default collection does not exist.'
      );
    }
    if (!isMyCollection(cts.doc(defaultMyCollectionUri))) {
      throw new BadRequestError(
        'The document specified as the default collection exists but is not a qualifying collection.'
      );
    }
  }

  const postValidationCallback = (readOnlyDocNode, editableDocObj) => {
    // Force this for new and updated user profiles.
    setUsername(editableDocObj, user.getUsername());
  };

  let docOptions;
  if (newDocumentMode) {
    docOptions = {
      permissions: getExclusiveDocumentPermissions(user).concat([
        xdmp.permission(
          ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
          CAPABILITY_READ
        ),
        xdmp.permission(
          ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
          CAPABILITY_UPDATE
        ),
        xdmp.permission(ROLE_NAME_USER_PROFILE_DATA_READER, CAPABILITY_READ),
      ]),
      collections: [
        isProduction()
          ? COLLECTION_NAME_PRODUCTION
          : COLLECTION_NAME_NON_PRODUCTION,
        COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
        COLLECTION_NAME_USER_PROFILE,
      ],
    };
  } else {
    const uri = userId;
    docOptions = {
      permissions: xdmp.documentGetPermissions(uri),
      collections: xdmp.documentGetCollections(uri),
    };
  }

  return {
    recordType: 'person',
    schemaPath: '/json-schema/user-profile.schema.json',
    postValidationCallback,
    indexedProperties: {
      dataType: 'Person',
      uiType: 'Agent',
      isCollectionItem: 0,
      hasDigitalImage: 0,
      isOnline: 0,
    },
    docOptions,
  };
}

function _getMyCollectionConfig(
  user,
  uri,
  readOnlyDocNode,
  newUserMode,
  newDocumentMode,
  lang = DEFAULT_LANG
) {
  const postValidationCallback = (readOnlyDocNode, editableDocObj) => {
    // Deduplicate and drop references to self.
    let givenMembers = getSetMembers(readOnlyDocNode);
    if (givenMembers) {
      const revisedMembers = Array.from(
        new Map(
          givenMembers
            .filter((member) => member.id + '' !== uri)
            .map((member) => [member.id + '', member])
        ).values()
      );
      setSetMembers(editableDocObj, revisedMembers);
    }
  };

  let docOptions;
  if (newDocumentMode) {
    docOptions = {
      permissions: getExclusiveDocumentPermissions(user).concat([
        xdmp.permission(
          ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
          CAPABILITY_READ
        ),
        xdmp.permission(
          ROLE_NAME_MY_COLLECTIONS_FEATURE_DATA_UPDATER,
          CAPABILITY_UPDATE
        ),
        xdmp.permission(ROLE_NAME_MY_COLLECTION_DATA_READER, CAPABILITY_READ),
      ]),
      collections: [
        isProduction()
          ? COLLECTION_NAME_PRODUCTION
          : COLLECTION_NAME_NON_PRODUCTION,
        COLLECTION_NAME_MY_COLLECTIONS_FEATURE,
        COLLECTION_NAME_MY_COLLECTION,
      ],
    };
  } else {
    if (isUndefined(uri)) {
      throw new BadRequestError(
        'The document must have an ID in order to update it.'
      );
    }
    docOptions = {
      permissions: xdmp.documentGetPermissions(uri),
      collections: xdmp.documentGetCollections(uri),
    };
  }

  return {
    recordType: 'set',
    schemaPath: '/json-schema/editable-set.schema.json',
    postValidationCallback,
    indexedProperties: {
      dataType: 'Set',
      uiType: 'Set',
      isCollectionItem: 0,
      hasDigitalImage: 0, // TODO: once user may set an image, make this conditional.
      isOnline: 0,
    },
    docOptions,
  };
}

function _getNewDocumentUri(recordType, attempt = 1) {
  // Insurance
  if (attempt > MAX_ATTEMPTS_FOR_NEW_URI) {
    throw new LoopDetectedError(
      `Unable to determine a unique URI for a new Set within ${MAX_ATTEMPTS_FOR_NEW_URI} attempts.`
    );
  }

  // We like this request.
  const uri = `${BASE_URL}/data/${recordType}/${sem.uuidString()}`;
  if (fn.docAvailable(uri)) {
    return _getNewDocumentUri(recordType, ++attempt);
  }
  return uri;
}

export { createDocument, deleteDocument, readDocument, updateDocument };
