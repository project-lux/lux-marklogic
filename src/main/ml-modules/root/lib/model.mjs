/*
 * The goal of this library is to minimize how much of the JSON-LD data model the rest of the backend
 * code base is aware of.  Last audit:
 *
 *    1. profileDocLib knows top-level property names.
 *    2. facetsLib knows indexed property names (subset are JSON-LD).
 *    3. searchLib references /json/id in a couple places.
 *
 * Every exported function should use _upTo(), which is responsible for correctly represented the JSON-LD
 * structure between the top-level JSON-LD property and the selected value.  The caller is responsible
 * for setting the return of an exported model function to the top-level property.
 *
 * Conventions:
 *    1. Pass docNode (document as a Node) into the getters and has*.  After the v8 engine upgrade, we may want to
 *       switch to optional?.chaining.
 *    2. Pass docObj (docNode.toObject()) into setters and add*.
 *
 * Exported functions are in alphabetical order, both where they are defined and exported.
 */
import {
  IDENTIFIERS,
  getLanguageIdentifier,
  hasLanguageIdentifier,
} from './identifierConstants.mjs';
import { getCurrentUsername } from './securityLib.mjs';
import { DataMergeError, InternalServerError } from './mlErrorsLib.mjs';
import { isDefined, isUndefined, toArray } from '../utils/utils.mjs';
import { toISOStringThroughSeconds } from '../utils/dateUtils.mjs';
import { PERSON_PREFIX } from './appConstants.mjs';

const LANGUAGE_EN = 'en';

const TYPE_ACTIVITY = 'Activity';
const TYPE_DIGITAL_OBJECT = 'DigitalObject';
const TYPE_HUMAN_MADE_OBJECT = 'HumanMadeObject';
const TYPE_LINGUISTIC_OBJECT = 'LinguisticObject';
const TYPE_PERSON = 'Person';
const TYPE_PLACE = 'Place';
const TYPE_SET = 'Set';
const TYPE_MATERIAL = 'Material';

const UI_TYPE_CONCEPT = 'Concept';

const PROP_NAME_BEGIN_OF_THE_BEGIN = 'begin_of_the_begin';
const PROP_NAME_END_OF_THE_END = 'end_of_the_end';

function _getDataIdForCurrentUser() {
  return `${PERSON_PREFIX}${getCurrentUsername()}`;
}

// Intended for when modifies a Set.
function addAddedToByEntry(docObj) {
  const now = toISOStringThroughSeconds(new Date());
  if (isUndefined(docObj.json.added_to_by)) {
    docObj.json.added_to_by = [];
  }
  docObj.json.added_to_by.push({
    type: 'Addition',
    carried_out_by: [{ id: _getDataIdForCurrentUser(), type: 'Person' }],
    timespan: {
      begin_of_the_begin: now,
      end_of_the_end: now,
    },
  });
}

function getBorn(docNode) {
  return _upTo('born', docNode.xpath('json/born'));
}

function getCarriedOutBy(docNode) {
  return _upTo('carried_out_by', docNode.xpath('json/carried_out_by'));
}

function getClassifiedAs(docNode) {
  return _upTo('classified_as', docNode.xpath('json/classified_as'));
}

// Returns null when given doc is not considered an exhibition.
function getClassifiedAsExhibition(docNode) {
  return _upTo(
    'classified_as',
    docNode.xpath(
      `json/classified_as[equivalent/id = "${IDENTIFIERS.exhibition}"]`
    ),
    null
  );
}

function getClassifiedAsNationalities(docNode) {
  return _upTo(
    'classified_as',
    docNode.xpath(
      `json/classified_as[classified_as[equivalent/id = "${IDENTIFIERS.nationality}"]]`
    )
  );
}

function getClassifiedAsOccupations(docNode) {
  return _upTo(
    'classified_as',
    docNode.xpath(
      `json/classified_as[classified_as[equivalent/id = "${IDENTIFIERS.occupation}}"]]`
    )
  );
}

function getCreatedByCarriedOutBy(docNode) {
  const noPart = docNode.xpath('json/created_by/carried_out_by');
  if (!fn.empty(noPart)) {
    return _upTo('created_by', noPart);
  }
  return _upTo(
    'created_by',
    docNode.xpath('json/created_by/part/carried_out_by')
  );
}

function getCreatedByTimespan(docNode) {
  return _upTo('created_by', docNode.xpath(`json/created_by/timespan`));
}

function getDefinedBy(docNode) {
  return _upTo('defined_by', docNode.xpath('json/defined_by'));
}

function getDied(docNode) {
  return _upTo('died', docNode.xpath('json/died'));
}

function getId(docNode) {
  const node = fn.head(docNode.xpath('json/id'));
  const value = node ? node.toString() : node;
  return _upTo('id', node, value);
}

function setCreatedBy(docObj) {
  const now = toISOStringThroughSeconds(new Date());
  docObj.json.created_by = {
    type: 'Creation',
    carried_out_by: [{ id: _getDataIdForCurrentUser(), type: 'Person' }],
    timespan: {
      begin_of_the_begin: now,
      end_of_the_end: now,
    },
  };
}

function setId(docObj, id) {
  docObj.json.id = id;
}

function getIdentifiedByIdentifier(docNode) {
  return _upTo(
    'identified_by',
    docNode.xpath('json/identified_by[type="Identifier"]')
  );
}

function getIdentifiedByPrimaryName(docNode, lang) {
  let seq = null;

  // Ideal: requested language
  if (hasLanguageIdentifier(lang)) {
    seq = docNode.xpath(_getPrimaryNameByLanguage(lang));
  }
  // Fallback #1: primary name in English
  if (fn.empty(seq)) {
    seq = docNode.xpath(_getPrimaryNameByLanguage(LANGUAGE_EN));
  }
  // Fallback #2: the first name, primary or otherwise.
  if (fn.empty(seq)) {
    seq = docNode.xpath('json/identified_by[type = "Name"][1]');
  }

  return _upTo('identified_by', fn.head(seq));
}

function getMadeOf(docNode) {
  return _upTo('made_of', docNode.xpath('json/made_of'));
}

function getMemberOf(docNode) {
  return _upTo('member_of', docNode.xpath('json/member_of'));
}

function getPartOf(docNode) {
  return _upTo('part_of', docNode.xpath('json/part_of'));
}

function getProducedBy(docNode) {
  return _upTo('produced_by', docNode.xpath('json/produced_by'));
}

function getProducedByCarriedOutBy(docNode) {
  const noPart = docNode.xpath('json/produced_by/carried_out_by');
  if (!fn.empty(noPart)) {
    return _upTo('produced_by', noPart);
  }
  return _upTo(
    'produced_by',
    docNode.xpath('json/produced_by/part/carried_out_by')
  );
}

function getProducedByTimespan(docNode) {
  return _upTo('produced_by', docNode.xpath(`json/produced_by/timespan`));
}

function getReferredToBy(docNode) {
  return _upTo(
    'referred_to_by',
    docNode.xpath(
      `json/referred_to_by/classified_as[equivalent/id = "${IDENTIFIERS.descriptionStatement}"]`
    )
  );
}

function getRepresentation(docNode) {
  return _upTo('representation', docNode.xpath('json/representation'));
}

function getRepresentationImage(docNode) {
  return _upTo(
    'representation',
    docNode.xpath('json/representation/digitally_shown_by')
  );
}

function getSubjectTo(docNode) {
  return _upTo('subject_to', docNode.xpath('/json/subject_to'));
}

function getSupertypes(docNode) {
  return _upTo(
    'classified_as',
    docNode.xpath(
      `json/classified_as[./classified_as/equivalent/id = "${IDENTIFIERS.typeOfWork}"]`
    )
  );
}

function getTimespan(docNode) {
  return _upTo('timespan', docNode.xpath(`json/timespan`));
}

function getTookPlaceAt(docNode) {
  return _upTo('took_place_at', docNode.xpath('json/took_place_at'));
}

function getType(docNode) {
  const node = fn.head(docNode.xpath('json/type'));
  const value = node ? node.toString() : node;
  return _upTo('type', node, value);
}

function getUiType(docNode) {
  const node = fn.head(docNode.xpath('indexedProperties/uiType'));
  const value = node ? node.toString() : node;
  return _upTo('uiType', node, value);
}

/**
 * Merge two objects.  Should the objects have the same property name as the same level, their values are combined.
 *
 * @param {Object} o1 An object to merge with another.
 * @param {Object} o2 The other object to merge with.
 * @throws {DataMergeError} when the same property is in both objects and has a different atomic value.
 * @returns {Object} Merged object.
 */
function merge(o1, o2) {
  // It takes two to tango
  if (o1 && o2) {
    const merged = {};
    const keys1 = Object.keys(o1);
    const keys2 = Object.keys(o2);
    const intersection = keys1.filter((value) => keys2.includes(value));
    if (intersection.length > 0) {
      // If a Node (immutable), convert to an Object (mutable) as intersecting keys are deleted below.
      if (o1.toObject) {
        o1 = o1.toObject();
      }
      if (o2.toObject) {
        o2 = o2.toObject();
      }

      // Merge each intersecting property.
      for (let key of intersection) {
        if (Array.isArray(o1[key]) && Array.isArray(o2[key])) {
          // Electing to include every entry from both arrays.  If we determine it is necessary
          // to de-dup, it will not be as simple as calling merge(arr, arr) as the likes of two
          // different id property values will trigger the below DataMergeError.
          merged[key] = o1[key].concat(o2[key]);
        } else if (typeof o1[key] == 'object') {
          merged[key] = merge(o1[key], o2[key]);
        } else if (o1[key] == o2[key]) {
          merged[key] = o1[key];
        } else {
          throw new DataMergeError(
            `Unable to merge the '${key}' property with differing atomic values of '${o1[key]}' and '${o2[key]}'.`
          );
        }
        delete o1[key];
        delete o2[key];
      }
    }

    return {
      ...o1,
      ...o2,
      ...merged,
    };
  }

  // This will return the first non-null, or null when both are null;
  return o1 || o2;
}

/**
 * Conditionally wrap the provided value in structure leading up to the specified ancestor.  Intended to
 * be a generic way to include the JSON-LD ancestor lineage for a selected value.
 *
 * @param {String} ancestorName - Name of the ancestor to go up to, and not include.
 * @param {Object} descendantNodeSeq - The Node(s) to start with.  Pass in a single Node, a sequence of Nodes, or null.
 *    Do not send an Array in.
 * @param {Object} descendantValue - The value to use that the lowest level. If null, descendantNode is used.
 *    Helpful in cases when you want to cast the value.
 * @returns An {Object} when there are ancestors to include; else, just descendantValue or descendantNode.
 */
function _upTo(ancestorName, descendantNodeSeq, descendantValue = null) {
  if (fn.empty(descendantNodeSeq)) {
    return descendantValue;
  }

  // Regardless of being given a single Node or a sequence of them, we want an array.
  const descendantNodeArr = toArray(descendantNodeSeq);
  const firstDescendantNode = descendantNodeArr[0];

  // Base ancestor structure on the first descendant node.  All descendant nodes will be accounted for later.
  let currentNode = firstDescendantNode;
  let currentName = fn.nodeName(currentNode).toString();
  const ancestorInfo = [];
  let ancestorIsArray = false;
  while (fn.exists(currentNode) && currentName != ancestorName) {
    currentNode = fn.head(currentNode.xpath('..'));
    if (fn.exists(currentNode)) {
      let isArray = false;

      // If name didn't change, go up another level as the current node is likely an array.
      if (currentName == fn.nodeName(currentNode).toString()) {
        currentNode = fn.head(currentNode.xpath('..'));
        isArray = true;
      }
      // Register now, in case the following safety check kicks us out.
      ancestorInfo.push({ name: currentName, isArray: isArray });

      // currentNode could have been set to null in previous if-block.
      if (fn.exists(currentNode)) {
        // Loop safety: bail if still the same
        if (currentName == fn.nodeName(currentNode).toString()) {
          console.warn(
            `May not have created the correct JSON-LD property lineage to ${fn.nodeName(
              firstDescendantNode
            )} as the ${currentName} property appears to be in the lineage more than two times.`
          );
          break;
        }

        currentName = fn.nodeName(currentNode).toString();
        // If we reach 'json', the caller likely provided an incorrect ancestorName.  In general, we want to fail gracefully.
        // In this case, me thinks someone made a boo boo and hasn't deployed this code to production yet.
        if (currentName === 'json') {
          throw new InternalServerError(
            `Did not encounter the '${ancestorName}' ancestor before reaching the JSON-LD root. Ancestors up to this point: ${ancestorInfo
              .map((info) => {
                return info.name;
              })
              .reverse()
              .join('/')}`
          );
        }
      }
    }
  }

  // Determine if the ancestor's value should be an array, as identified_by is, but wouldn't
  // be without this check.
  if (fn.exists(currentNode) && currentName == ancestorName) {
    ancestorIsArray =
      ancestorName == fn.nodeName(fn.head(currentNode.xpath('..'))).toString();
  }

  // Start low and build up
  let childObj = descendantValue ? descendantValue : descendantNodeArr;
  for (let info of ancestorInfo) {
    const parentObj = {};
    parentObj[info.name] = _getValue(info.isArray, childObj);
    childObj = parentObj;
  }

  return _getValue(ancestorIsArray, childObj);
}

/**
 * Figure out if the given value should be an array or not, then return it as such.  Only intended to be called by _upTo().
 *
 * @param {boolean} mustBeAnArray Submit true if this function is to ensure the returned value is an array.
 * @param {Object} val Could be an object or array.
 * @param {boolean} convertNodesToObjects When true (the default), any Nodes are converted to Objects.
 * @returns Either an Object or Array.
 */
function _getValue(mustBeAnArray, val) {
  let adjustedVal = null;
  // If we already figured out the value must be an array, ensure it is.
  if (mustBeAnArray === true) {
    adjustedVal = Array.isArray(val) ? val : [val];
  }
  // Else if we have an array **of more than one item**, keep all values
  else if (Array.isArray(val) && val.length > 1) {
    adjustedVal = val;
  }
  // Else, ensure we do not retain the value as an array.
  else {
    adjustedVal = Array.isArray(val) ? val[0] : val;
  }
  return adjustedVal;
}

// Only expected caller is getIdentifiedByPrimaryName()
function _getPrimaryNameByLanguage(lang) {
  return `json/identified_by[type = "Name"][classified_as/equivalent/id = "${
    IDENTIFIERS.primaryName
  }"][language/equivalent/id = "${getLanguageIdentifier(lang)}"]`;
}

export {
  addAddedToByEntry,
  getBorn,
  getCarriedOutBy,
  getClassifiedAs,
  getClassifiedAsExhibition,
  getClassifiedAsNationalities,
  getClassifiedAsOccupations,
  getCreatedByCarriedOutBy,
  getCreatedByTimespan,
  getDefinedBy,
  getDied,
  getId,
  getIdentifiedByIdentifier,
  getIdentifiedByPrimaryName,
  getMadeOf,
  getMemberOf,
  getPartOf,
  getProducedBy,
  getProducedByCarriedOutBy,
  getProducedByTimespan,
  getReferredToBy,
  getRepresentation,
  getRepresentationImage,
  getSubjectTo,
  getSupertypes,
  getTimespan,
  getTookPlaceAt,
  getType,
  getUiType,
  merge,
  setCreatedBy,
  setId,
  PROP_NAME_BEGIN_OF_THE_BEGIN,
  PROP_NAME_END_OF_THE_END,
  TYPE_ACTIVITY,
  TYPE_DIGITAL_OBJECT,
  TYPE_HUMAN_MADE_OBJECT,
  TYPE_LINGUISTIC_OBJECT,
  TYPE_MATERIAL,
  TYPE_PERSON,
  TYPE_PLACE,
  TYPE_SET,
  UI_TYPE_CONCEPT,
};
