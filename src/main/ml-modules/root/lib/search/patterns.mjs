import {
  ALLOWED_SEARCH_OPTIONS_EXACT,
  ALLOWED_SEARCH_OPTIONS_KEYWORD,
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
  SEARCH_OPTIONS_NAME_EXACT,
  SEARCH_OPTIONS_NAME_KEYWORD,
} from '../appConstants.mjs';
import { InternalServerError } from '../errorClasses.mjs';

const PATTERN_NAME_ANN_TOP_K = 'annTopK';
const PATTERN_NAME_DATE_RANGE = 'dateRange';
const PATTERN_NAME_DOCUMENT_ID = 'documentId';
const PATTERN_NAME_GEOSPATIAL = 'geospatial';
const PATTERN_NAME_HOP_INVERSE = 'hopInverse';
const PATTERN_NAME_HOP_WITH_FIELD = 'hopWithField';
const PATTERN_NAME_INDEXED_RANGE = 'indexedRange';
const PATTERN_NAME_INDEXED_VALUE = 'indexedValue';
const PATTERN_NAME_INDEXED_WORD = 'indexedWord';
const PATTERN_NAME_IRI = 'iri';
// const PATTERN_NAME_PROPERTY_VALUE = 'propertyValue'; // subsumed by indexedValue
const PATTERN_NAME_RELATED_LIST = 'relatedList'; // for related list configs
const PATTERN_NAME_KEYWORD = 'keyword';

const OPTION_NAME_EAGER_EVALUATION = 'eagerEvaluation';
const OPTION_NAME_EXCLUDE_SELF_IRI = 'excludeSelfIri';
const OPTION_NAME_PREFER_FRAG_JOINS = 'preferFragJoins';
const OPTION_NAME_MAXIMUM_VALUES = 'maximumValues';
const OPTION_NAME_RETURN_VALUES = 'returnValues';

const TYPE_GROUP = 4;
const TYPE_TERM = 2;
const TYPE_ATOMIC = 1;
const TYPE_NONE = 0;

function getPatternConfig(patternName) {
  if (SEARCH_PATTERN_CONFIG[patternName]) {
    return SEARCH_PATTERN_CONFIG[patternName];
  }
  throw new InternalServerError(
    `Unknown search pattern '${patternName}' configured to a term.`,
  );
}

function exposedViaSearch(patternName) {
  return getPatternConfig(patternName).allowedChildren !== TYPE_NONE;
}

function acceptsGroup(patternName) {
  return (
    (getPatternConfig(patternName).allowedChildren & TYPE_GROUP) === TYPE_GROUP
  );
}

function acceptsTerm(patternName) {
  return (
    (getPatternConfig(patternName).allowedChildren & TYPE_TERM) === TYPE_TERM
  );
}

function acceptsAtomicValue(patternName) {
  return (
    (getPatternConfig(patternName).allowedChildren & TYPE_ATOMIC) ===
    TYPE_ATOMIC
  );
}

function onlyAcceptsAtomicValue(patternName) {
  return getPatternConfig(patternName).allowedChildren === TYPE_ATOMIC;
}

function isConvertIdChildToIri(patternName) {
  return getPatternConfig(patternName).isConvertIdChildToIri === true;
}

function returnsCtsQuery(patternName) {
  return getPatternConfig(patternName).returnsCtsQuery;
}

function getAllowedSearchOptionsNameByPatternName(patternName) {
  return getPatternConfig(patternName).allowedOptionsName;
}

function getAllowedSearchOptionsByOptionsName(optionsName) {
  if (optionsName == SEARCH_OPTIONS_NAME_EXACT) {
    return ALLOWED_SEARCH_OPTIONS_EXACT;
  } else if (optionsName == SEARCH_OPTIONS_NAME_KEYWORD) {
    return ALLOWED_SEARCH_OPTIONS_KEYWORD;
  }
  return null;
}

function getDefaultSearchOptionsNameByPatternName(patternName) {
  return getPatternConfig(patternName).defaultOptionsName;
}

function getDefaultSearchOptionsByOptionsName(optionsName) {
  if (optionsName == SEARCH_OPTIONS_NAME_EXACT) {
    return DEFAULT_SEARCH_OPTIONS_EXACT;
  } else if (optionsName == SEARCH_OPTIONS_NAME_KEYWORD) {
    return DEFAULT_SEARCH_OPTIONS_KEYWORD;
  }
  return null;
}

/*
 * Metadata-only configuration of every search pattern.  Pattern logic lives in
 * the individual pattern classes under patterns/ (e.g. HopInverse.mjs); engine.mjs
 * dispatches via PATTERNS[name].apply().
 *
 * Properties:
 *   "allowedChildren" — sum of TYPE_* constants indicating what child types the
 *       pattern accepts.
 *   "isConvertIdChildToIri" — true when ID child terms should use the IRI pattern.
 *   "allowedOptionsName" — search options name that terms may specify (null = none).
 *   "defaultOptionsName" — default search options name (null = none).
 *   "returnsCtsQuery" — whether the pattern's contribution is a CTS query.
 */
const SEARCH_PATTERN_CONFIG = {};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_ANN_TOP_K] = {
  allowedChildren: TYPE_GROUP + TYPE_TERM,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_RELATED_LIST] = {
  allowedChildren: TYPE_NONE,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: false,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_DATE_RANGE] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_DOCUMENT_ID] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_GEOSPATIAL] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_HOP_INVERSE] = {
  allowedChildren: TYPE_GROUP + TYPE_TERM,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: false,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_HOP_WITH_FIELD] = {
  allowedChildren: TYPE_GROUP + TYPE_TERM,
  isConvertIdChildToIri: false,
  allowedOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  defaultOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_INDEXED_RANGE] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_INDEXED_VALUE] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: SEARCH_OPTIONS_NAME_EXACT,
  defaultOptionsName: SEARCH_OPTIONS_NAME_EXACT,
  returnsCtsQuery: true,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_INDEXED_WORD] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  defaultOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  returnsCtsQuery: true,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_IRI] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: false,
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_KEYWORD] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  defaultOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  returnsCtsQuery: true,
};

export {
  OPTION_NAME_EAGER_EVALUATION,
  OPTION_NAME_EXCLUDE_SELF_IRI,
  OPTION_NAME_MAXIMUM_VALUES,
  OPTION_NAME_PREFER_FRAG_JOINS,
  OPTION_NAME_RETURN_VALUES,
  PATTERN_NAME_ANN_TOP_K,
  PATTERN_NAME_DATE_RANGE,
  PATTERN_NAME_DOCUMENT_ID,
  PATTERN_NAME_GEOSPATIAL,
  PATTERN_NAME_HOP_INVERSE,
  PATTERN_NAME_HOP_WITH_FIELD,
  PATTERN_NAME_INDEXED_RANGE,
  PATTERN_NAME_INDEXED_VALUE,
  PATTERN_NAME_INDEXED_WORD,
  PATTERN_NAME_IRI,
  PATTERN_NAME_RELATED_LIST,
  PATTERN_NAME_KEYWORD,
  acceptsGroup,
  acceptsTerm,
  acceptsAtomicValue,
  exposedViaSearch,
  getAllowedSearchOptionsByOptionsName,
  getAllowedSearchOptionsNameByPatternName,
  getDefaultSearchOptionsByOptionsName,
  getDefaultSearchOptionsNameByPatternName,
  getPatternConfig,
  isConvertIdChildToIri,
  onlyAcceptsAtomicValue,
  returnsCtsQuery,
};
