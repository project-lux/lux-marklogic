import * as utils from '../../utils/utils.mjs';
import { convertPartialDateTimeToSeconds } from '../../utils/dateUtils.mjs';
import {
  ALLOWED_SEARCH_OPTIONS_EXACT,
  ALLOWED_SEARCH_OPTIONS_KEYWORD,
  DEFAULT_SEARCH_OPTIONS_EXACT,
  DEFAULT_SEARCH_OPTIONS_KEYWORD,
  FULL_TEXT_SEARCH_RELATED_FIELD_NAME,
  IRI_DOES_NOT_EXIST,
  SEARCH_OPTIONS_NAME_EXACT,
  SEARCH_OPTIONS_NAME_KEYWORD,
} from '../appConstants.mjs';
import {
  InternalServerError,
  InvalidSearchRequestError,
} from '../errorClasses.mjs';
import {
  getSearchScopeFields,
  getSearchScopePredicates,
  getSearchScopeTypes,
  isSearchScopeName,
} from '../searchScope.mjs';
import { SearchCriteriaProcessor } from '../SearchCriteriaProcessor.mjs';

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

// Apply a search pattern to a search term.
function applyPattern({
  searchCriteriaProcessor,
  searchTerm,
  searchPatternOptions,
  requestOptions,
}) {
  // TODO: Still relevant?
  // // If not yet dealing with an atomic value, request the resolved CTS query for this term's value.
  // if (!searchTerm.hasValueType()) {
  //   throw new InternalServerError(
  //     `Unable to determine a search term's value type.`,
  //   );
  // } else if (searchTerm.getValueType() !== TYPE_ATOMIC) {
  //   searchTerm.setValue(
  //     searchCriteriaProcessor.generateQueryFromCriteria(
  //       searchTerm.getScopeName(),
  //       searchTerm.getValue(),
  //       searchTerm,
  //       false, // Given we're not in a group, we need not require the child to return a CTS query.
  //     ),
  //   );
  // }

  const termConfig = searchTerm.getSearchTermConfig();
  const patternName = termConfig.getPatternName();
  const resolvedSearchOptions = resolveSearchOptions(
    termConfig.getOptionsReference(),
    patternName,
    requestOptions,
    searchTerm.getSearchOptions(),
  );
  return getPatternConfig(patternName).function(
    searchTerm,
    resolvedSearchOptions,
    searchPatternOptions,
    requestOptions,
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
 * The configuration of every search pattern is to be represented in SEARCH_PATTERN_CONFIG where the
 * pattern name is the top-level property and the value is an object with the following properties.
 *
 * "allowedChildren": set to the sum of one or more of the TYPE_* constants.
 *
 * "isConvertIdChildToIri": set to true if ID child terms are to use the IRI search pattern.
 *
 * "allowedOptionsName": set to the search options name that terms configured to this pattern are
 *   allowed to specify.  Set to null when the pattern doesn't support or offer options.
 *
 * "defaultOptionsName": set to the search options name that terms configured to this pattern should
 *   default to.  Set to null when the pattern doesn't support or offer options.
 *
 * "function": the function to execute when applying the search pattern to an instance of a search
 *   term.  The function is to return an object with the following properties.
 *
 *   "codeStr": Most patterns return CTS query strings --but not all.  Searches that use terms configured
 *     to patterns that do not return CTS query strings are expected to nest those in terms that do return
 *     CTS query strings.  Required.
 *
 *     Values should be put in double quotes, as opposed to single quotes.  Double quotes are part
 *     of the string search grammar and do not conflict with values such as "O'Keffee".
 *
 * Please alphabetize the search patterns by pattern name.
 *
 */
const SEARCH_PATTERN_CONFIG = {};

// TODO: Only here because the generators require some pattern-level configuration.
// We plan to redefine all pattern configurations after getting further along with the
// (Optic) patterns themselves.
SEARCH_PATTERN_CONFIG[PATTERN_NAME_ANN_TOP_K] = {
  allowedChildren: TYPE_GROUP + TYPE_TERM,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    // Not implemented in CTS.
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_RELATED_LIST] = {
  allowedChildren: TYPE_NONE,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: false,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    // Not implemented in CTS.
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_DATE_RANGE] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    const termName = searchTerm.getName();
    const scopeName = searchTerm.getScopeName();

    // Terms configured to this pattern are to be configured to two indexes.
    const termConfig = searchTerm.getSearchTermConfig();
    const indexReferences = termConfig.getIndexReferences();
    if (!utils.isArray(indexReferences) || indexReferences.length !== 2) {
      throw new InternalServerError(
        `The '${termName}' search term within the '${scopeName}' scope is not correctly configured: two indexes are required.`,
      );
    }
    const startIndexName = indexReferences[0];
    const endIndexName = indexReferences[1];

    // Accept two dates, requiring at least one.
    const delim = ';';
    let termValue = searchTerm.getValue() + '';
    if (termValue.indexOf(delim) === -1) {
      termValue += delim;
    }
    const dates = termValue.split(';');
    const startDateStr = dates[0].length > 0 ? dates[0] : null;
    const endDateStr = dates[1].length > 0 ? dates[1] : null;
    if (!startDateStr && !endDateStr) {
      throw new InvalidSearchRequestError(
        `the '${termName} search term requires at least one date, such as '1800;1810', '1800', '1800;', or ';1810' (end of date range only).`,
      );
    }

    let codeStr = null;
    const op = searchTerm.getComparisonOperator();
    const termWeight = searchTerm.getWeight();
    _requireRangeOperator(termName, op);
    if (['>', '>=', '<', '<='].includes(op)) {
      // Use the end index and prefer the end date.
      codeStr = _getDateFieldRangeQuery(
        startIndexName,
        startDateStr,
        endIndexName,
        endDateStr,
        op,
        termWeight,
      );
    } else if ('=' == op) {
      codeStr = `cts.andQuery([
        ${_getDateFieldRangeQuery(
          startIndexName,
          startDateStr,
          endIndexName,
          endDateStr,
          '>=',
          termWeight,
        )},
        ${_getDateFieldRangeQuery(
          startIndexName,
          startDateStr,
          endIndexName,
          endDateStr,
          '<=',
          termWeight,
        )}
      ])`;
    } else if ('!=' == op) {
      codeStr = `cts.orQuery([
        ${_getDateFieldRangeQuery(
          startIndexName,
          startDateStr,
          endIndexName,
          endDateStr,
          '<',
          termWeight,
        )},
        ${_getDateFieldRangeQuery(
          startIndexName,
          startDateStr,
          endIndexName,
          endDateStr,
          '>',
          termWeight,
        )}
      ])`;
    } else {
      throw new InternalServerError(
        `The date range pattern has not accounted for the '${op}' operator.`,
      );
    }

    return _formattedPatternResponse(codeStr);
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_DOCUMENT_ID] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    return _formattedPatternResponse(
      `cts.documentQuery(['${searchTerm.getValue()}'])`,
    );
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_GEOSPATIAL] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
  // Pattern logic lives in patterns/Geospatial.mjs; engine.mjs invokes it via
  // PATTERNS[name].apply(). This handler is unused but retained for shape parity.
  handler: () => {
    throw new InternalServerError(
      `The 'geospatial' pattern is implemented via patterns/Geospatial.mjs and should not be invoked through SEARCH_PATTERN_CONFIG.handler.`,
    );
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_HOP_INVERSE] = {
  allowedChildren: TYPE_GROUP + TYPE_TERM,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  // This pattern conditionally returns a CTS query, but not believed when this setting is relied upon by nested terms;
  // should this become an issue, perhaps we need to make this a function that determines what it returns by context.
  returnsCtsQuery: false,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    //   /*
    //    * When request is for values, we need to create a values query and a CTS query.  We always
    //    * need to make a CTS query, which should be the same regardless of creating a values query.
    //    * The values query has a couple differences, specifically not wrapping a top-level term's
    //    * cts.triples call within cts.documentQuery.
    //    */
    //   const requestIsForValues = patternOptions.get(
    //     OPTION_NAME_RETURN_VALUES,
    //     false,
    //   );
    //   // While the overall request may be for values, we need to return a query when this term instance
    //   // is a child of another.
    //   const isChildTerm = searchTerm.hasParentSearchTerm();
    //   // Final determination
    //   const returnValues = requestIsForValues && !isChildTerm;
    //   // Tread carefully.
    //   const wrapInDocumentQuery =
    //     !isChildTerm || // if not a child term, we need to ensure this is a cts query to be fed into cts.search.
    //     searchTerm.getMustReturnCtsQuery() || // Could be directly in a group, such as cts.andQuery.
    //     ![PATTERN_NAME_HOP_INVERSE, PATTERN_NAME_HOP_WITH_FIELD].includes(
    //       searchTerm.getParentSearchTerm().getSearchTermConfig().getPatternName(),
    //     ); // Parent HOP_WITH_FIELD and HOP_INVERSE terms don't need a document query
    //   // because they use cts.tripleRangeQuery and cts.triples, respectively.
    //   // Other patterns expect a cts query.
    //   const wrapStart = wrapInDocumentQuery ? 'cts.documentQuery(' : '';
    //   const wrapEnd = wrapInDocumentQuery ? ')' : '';
    //   const searchTermConfig = searchTerm.getSearchTermConfig();
    //   const eagerEvaluation = patternOptions.get(
    //     OPTION_NAME_EAGER_EVALUATION,
    //     true,
    //   );
    //   const ctsQueryStr = `${wrapStart}${_getAtLeastOneCtsTriple(
    //     searchTerm.getValue(),
    //     searchTermConfig.getPredicates(),
    //     searchTerm.getChildWillReturnCtsQuery(),
    //     false,
    //     eagerEvaluation,
    //   )}${wrapEnd}`;
    //   let values = null;
    //   if (returnValues) {
    //     // A request may specify the maximum number of values to return.
    //     const maximumNumberOfValues = patternOptions.get(
    //       OPTION_NAME_MAXIMUM_VALUES,
    //       -1,
    //     );
    //     const codeStr = `${_getAtLeastOneCtsTriple(
    //       searchTerm.getValue(),
    //       searchTermConfig.getPredicates(),
    //       searchTerm.getChildWillReturnCtsQuery(),
    //       true,
    //       eagerEvaluation,
    //       maximumNumberOfValues,
    //     )}`;
    //     values = SearchCriteriaProcessor.evalQueryString(codeStr);
    //   }
    //   return _formattedPatternResponse(ctsQueryStr, values);
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_HOP_WITH_FIELD] = {
  allowedChildren: TYPE_GROUP + TYPE_TERM,
  isConvertIdChildToIri: false,
  allowedOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  defaultOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  //   handler: (
  //     searchTerm,
  //     resolvedSearchOptions,
  //     patternOptions,
  //     requestOptions,
  //   ) => {
  //     if (termConfig.isTransitive()) {
  //       return processTransitiveHopWithFieldTerm(
  //         searchTerm,
  //         resolvedSearchOptions,
  //         patternOptions,
  //         requestOptions,
  //       );
  //     } else {
  //       return processHopWithFieldTerm(
  //         searchTerm,
  //         resolvedSearchOptions,
  //         patternOptions,
  //         requestOptions,
  //       );
  //     }
  //   },
  //   processTransitiveHopWithFieldTerm: (
  //     searchTerm,
  //     resolvedSearchOptions,
  //     patternOptions,
  //     requestOptions,
  //   ) => {
  //     const termConfig = searchTerm.getSearchTermConfig();

  //     // Get the IRIs from the inner query and apply as a constraint to the SPARQL query.
  //     const _refIri = id + '_iri';
  //     const fieldPlan = searchTerm.hasValue()
  //       ? getFieldAtomicPlan({
  //           fragCol,
  //           iriCol,
  //           id,
  //           searchTerm,
  //           options,
  //         })
  //       : getFieldNestedPlan({
  //           fragCol,
  //           iriCol,
  //           id,
  //           searchTerm,
  //           criteria,
  //           options,
  //         });
  //     // DEBUG.push(`Transitive fieldPlan: ${getPlanSource(fieldPlan)}`);

  //     // TODO: if there are zero results from the fieldPlan, should we do anything different?
  //     const sparql = `
  // ${getPrefixesForSPARQL()}
  // select ?${id}_s ?${id}_o where {
  //   VALUES ?${id}_o {
  //     ${fieldPlan
  //       .result()
  //       .toArray()
  //       .map((row) => `<${row[_refIri]}>`)
  //       .join('\n    ')}
  //   }
  //   ?${id}_s ${formatPredicatesForSPARQL(termConfig.getPredicates())} ?${id}_o
  // }`;

  //     return {
  //       patternJoins: [
  //         {
  //           right: op.fromSPARQL(sparql, null, { dedup: 'on' }),
  //           on: [op.on(op.col(iriCol), op.col(id + '_s'))],
  //           extraCols: [],
  //         },
  //       ],
  //     };
  //   },
  //   processHopWithFieldTerm: (
  //     searchTerm,
  //     resolvedSearchOptions,
  //     patternOptions,
  //     requestOptions,
  //   ) => {
  //     const termValue = searchTerm.getValue();
  //     const termConfig = searchTerm.getSearchTermConfig();
  //     const _hopFragCol = id + '_hopFrag';
  //     const hopPlan = op.fromTriples([
  //       op.pattern(
  //         op.col(id + '_s'),
  //         expandPredicates(termConfig.getPredicates()),
  //         op.col(id + '_o'),
  //         op.fragmentIdCol(_hopFragCol),
  //       ),
  //     ]);

  //     const _refIri = id + '_iri';
  //     const fieldPlan = termValue
  //       ? getFieldAtomicPlan({
  //           fragCol,
  //           iriCol,
  //           id,
  //           searchTerm,
  //           options,
  //         })
  //       : getFieldNestedPlan({
  //           fragCol,
  //           iriCol,
  //           id,
  //           searchTerm,
  //           criteria,
  //           options,
  //         });

  //     // DEBUG.push('Generated right plan:');
  //     // DEBUG.push(getPlanSource(right));

  //     return {
  //       patternJoins: [
  //         {
  //           right: hopPlan.joinInner(
  //             fieldPlan,
  //             op.on(op.col(id + '_o'), op.col(_refIri)),
  //           ),
  //           // op.fromTriples doesn't return URIs so we are using fragment regardless of config
  //           on: [
  //             op.on(op.col(iriCol), op.col(id + '_s')),
  //             op.on(op.fragmentIdCol(fragCol), op.fragmentIdCol(_hopFragCol)),
  //           ],
  //           extraCols: [],
  //         },
  //       ],
  //     };
  //   },
  //   getFieldNestedPlan: (
  //     searchTerm,
  //     resolvedSearchOptions,
  //     patternOptions,
  //     requestOptions,
  //   ) => {
  //     const termConfig = searchTerm.getSearchTermConfig();
  //     return processCriteria({
  //       planCriteria: criteria,
  //       planScope: termConfig.getTargetScopeName(),
  //       patternOptions: options,
  //       groups: null, // Grouping by here prevents grouping by at the end.
  //       parentId: id,
  //     });
  //   },
  //   getFieldAtomicPlan: (
  //     searchTerm,
  //     resolvedSearchOptions,
  //     patternOptions,
  //     requestOptions,
  //   ) => {
  //     const termValue = searchTerm.getValue();
  //     const termSearchOptions = searchTerm.getSearchOptions();
  //     const termConfig = searchTerm.getSearchTermConfig();
  //     const _refIri = id + '_iri';
  //     return searchTerm.isCompleteMatch()
  //       ? op
  //           .fromLexicons({
  //             [_refIri]: cts.iriReference(),
  //             // TODO: determine if support for a single index is an issue.
  //             [id + '_field']: cts.fieldReference(
  //               termConfig.getIndexReferences()[0],
  //             ),
  //           })
  //           .where(op.eq(op.col(id + '_field'), termValue))
  //       : op
  //           .fromLexicons({
  //             [_refIri]: cts.iriReference(),
  //           })
  //           .where(
  //             cts.fieldWordQuery(
  //               termConfig.getIndexReferences(),
  //               termValue,
  //               termSearchOptions,
  //             ),
  //           );
  //   },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_INDEXED_RANGE] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: true,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    const op = searchTerm.getComparisonOperator();
    _requireRangeOperator(searchTerm.getName(), op);
    const termConfig = searchTerm.getSearchTermConfig();
    const codeStr = `cts.fieldRangeQuery(
      ${utils.arrayToString(termConfig.getIndexReferences())},
      '${op}',
      ${utils.arrayToString(
        utils.toArray(searchTerm.getValue(), termConfig.getScalarType()),
        termConfig.getScalarType(),
      )},
      ${utils.arrayToString(resolvedSearchOptions)},
      ${searchTerm.getWeight()}
    )`;
    return _formattedPatternResponse(codeStr);
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_INDEXED_VALUE] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: SEARCH_OPTIONS_NAME_EXACT,
  defaultOptionsName: SEARCH_OPTIONS_NAME_EXACT,
  returnsCtsQuery: true,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    const termConfig = searchTerm.getSearchTermConfig();
    const codeStr = `cts.fieldValueQuery(
      ${utils.arrayToString(termConfig.getIndexReferences())},
      ${utils.arrayToString(
        utils.toArray(searchTerm.getValue(), termConfig.getScalarType()),
        termConfig.getScalarType(),
      )},
      ${utils.arrayToString(resolvedSearchOptions)},
      ${searchTerm.getWeight()}
    )`;
    return _formattedPatternResponse(codeStr);
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_INDEXED_WORD] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  defaultOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  returnsCtsQuery: true,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    const termConfig = searchTerm.getSearchTermConfig();
    const codeStr = `${_getCtsQueryFunctionName(
      'field',
      searchTerm.isCompleteMatch(),
    )}(
      ${utils.arrayToString(termConfig.getIndexReferences())},
      ${utils.arrayToString(utils.toArray(searchTerm.getValue()))},
      ${utils.arrayToString(resolvedSearchOptions)},
      ${searchTerm.getWeight()}
    )`;
    return _formattedPatternResponse(codeStr);
  },
};

SEARCH_PATTERN_CONFIG[PATTERN_NAME_IRI] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: null,
  defaultOptionsName: null,
  returnsCtsQuery: false,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    return _formattedPatternResponse(`sem.iri('${searchTerm.getValue()}')`);
  },
};

// SEARCH_PATTERN_CONFIG[PATTERN_NAME_PROPERTY_VALUE] = {
//   allowedChildren: TYPE_ATOMIC,
//   isConvertIdChildToIri: false,
//   allowedOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
//   defaultOptionsName: null,
//   returnsCtsQuery: true,
//   handler: (
//     searchTerm,
//     resolvedSearchOptions,
//     patternOptions,
//     requestOptions,
//   ) => {
//     let termValue = searchTerm.getValue();
//     if (searchTerm.getName() == 'recordType') {
//       // If the term value is search scope name, use that scope's types.
//       if (isSearchScopeName(termValue)) {
//         termValue = getSearchScopeTypes(termValue);
//       } else {
//         // Get the correct case such that we can use the exact search option.
//         termValue = getCorrectlyCasedType(termValue);
//       }
//     }

//     const termConfig = searchTerm.getSearchTermConfig();
//     if (termConfig.isForceExactMatch()) {
//       resolvedSearchOptions = DEFAULT_SEARCH_OPTIONS_EXACT;
//     }

//     const codeStr = `cts.jsonPropertyValueQuery(
//       ${utils.arrayToString(termConfig.getPropertyNames())},
//       ${utils.arrayToString(
//         utils.toArray(termValue, termConfig.getScalarType()),
//         termConfig.getScalarType(),
//       )},
//       ${utils.arrayToString(resolvedSearchOptions)},
//       ${searchTerm.getWeight()}
//     )`;
//     return _formattedPatternResponse(codeStr);
//   },
// };

SEARCH_PATTERN_CONFIG[PATTERN_NAME_KEYWORD] = {
  allowedChildren: TYPE_ATOMIC,
  isConvertIdChildToIri: false,
  allowedOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  defaultOptionsName: SEARCH_OPTIONS_NAME_KEYWORD,
  returnsCtsQuery: true,
  handler: (
    searchTerm,
    resolvedSearchOptions,
    patternOptions,
    requestOptions,
  ) => {
    // Convert to an array, if not already one.
    const termValues = utils.toArray(searchTerm.getValue());
    const termWeight = searchTerm.getWeight();
    const termScopeName = searchTerm.getScopeName();
    const isRequestedScope = termScopeName == requestOptions.scopeName;

    const nonSemanticWordQuery = _getWordQueries(
      'field',
      getSearchScopeFields(termScopeName),
      termValues,
      searchTerm.isCompleteMatch(),
      resolvedSearchOptions,
      termWeight,
    );

    const semanticWordQuery = _getWordQueries(
      'field',
      [FULL_TEXT_SEARCH_RELATED_FIELD_NAME],
      termValues,
      searchTerm.isCompleteMatch(),
      resolvedSearchOptions,
      termWeight,
    );

    const codeStr = `cts.orQuery([
      ${nonSemanticWordQuery},
      ${_getTripleRangeQuery(
        getSearchScopePredicates(termScopeName),
        semanticWordQuery,
        termWeight,
      )}
    ])`;
    return _formattedPatternResponse(codeStr);
  },
};

function _formattedPatternResponse(
  codeStr,
  values = null,
  includeTypeConstraint = true,
) {
  return {
    codeStr,
    values,
    includeTypeConstraint,
  };
}

function _requireRangeOperator(termName, op) {
  if (!['>', '>=', '<', '<=', '=', '!='].includes(op)) {
    throw new InvalidSearchRequestError(
      `the '${termName}' search term requires the '_comp' property set to '>', '>=', '<', '<=', '=', or '!='.`,
    );
  }
}

// Returns a string of CTS word query(ies).
function _getWordQueries(
  indexType,
  indexReferences,
  termValues,
  isCompleteMatch,
  resolvedSearchOptions,
  weight,
) {
  const wordQueries = termValues.map((value) => {
    // Double-quote the value.
    return `${_getCtsQueryFunctionName(
      indexType,
      isCompleteMatch,
    )}(${utils.arrayToString(indexReferences)}, "${utils.escapeCharacters(
      value,
      '"',
    )}", ${utils.arrayToString(resolvedSearchOptions)}, ${weight})`;
  });

  // When there are multiple term values, AND them.
  const andQueryStart = termValues.length > 1 ? 'cts.andQuery([' : '';
  const andQueryStop = termValues.length > 1 ? '])' : '';

  return `${andQueryStart}${wordQueries.join(', ')}${andQueryStop}`;
}

function _getTripleRangeQuery(predicates, valuesQueryStr, weight = 1.0) {
  // The third parameter into cts.tripleRangeQuery should either use valuesQueryStr as is
  // or wrap it in cts.values.  Cases when to use it as is:
  //   1. Starts with 'sem.iri'.  It's already an IRI.
  //   2. Starts with 'cts.triples'.  This code presumes the string ends by mapping the
  //      triples to IRIs.
  const valuesQueryWithoutSpaces = valuesQueryStr.replace(/\s/g, '');
  const alreadyHaveIris =
    valuesQueryWithoutSpaces.startsWith('sem.iri(') ||
    valuesQueryWithoutSpaces.startsWith('cts.triples(');
  return `cts.tripleRangeQuery(
    [],
    ${utils.arrayToString(predicates, 'code')},
    ${
      alreadyHaveIris ? valuesQueryStr : _getAtLeastOneCtsValue(valuesQueryStr)
    }, '=', [], ${weight}
  )`;
}

function _getAtLeastOneCtsValue(valuesQueryStr) {
  return `fn.insertBefore(
    cts.values(
      cts.iriReference(),
      '',
      ['eager', 'concurrent'],
      ${valuesQueryStr}
    ), 
    0,
    sem.iri('${IRI_DOES_NOT_EXIST}')
  )`;
}

/**
 * Get a string that, when evaluated, when return at least one value from cts.triples.
 *
 * @param {String} termValue Could be be code that may be passed into the subject IRIs parameter of
 *                 cts.triples, or could be a Cts Query
 * @param {String} predicates Array of predicates to use in the cts.triples call.
 * @param {Boolean} childReturnsCtsQuery Boolean which represents whether termValue is a ctsQuery
 * @param {String} castToString Submit true to get an array of URIs versus the default of IRIs.
 * @param {Boolean} eagerEvaluation Submit true if requesting all or many of the relevant triples
 *                  (vs. a handful would could then slow the request down).
 * @param {int} The maximum number of values to return.  Specify -1 (default) for all.
 * @returns {String} An array of at least one IRI or URI, even if only
 */
function _getAtLeastOneCtsTriple(
  termValue,
  predicates,
  childReturnsCtsQuery,
  castToString = false,
  eagerEvaluation = true,
  max = -1,
) {
  const needWrap = max > -1;
  const maxWrapStart = needWrap ? 'fn.subsequence(' : '';
  const maxWrapEnd = needWrap ? `, 1, ${max})` : '';
  const eagerOrLazy = eagerEvaluation ? 'eager' : 'lazy';
  return `${maxWrapStart}cts
    .triples(
      ${childReturnsCtsQuery ? '[]' : termValue},
      ${utils.arrayToString(predicates, 'code')},
      [],
      '=',
      ['${eagerOrLazy}', 'concurrent'],
      ${childReturnsCtsQuery ? termValue : 'undefined'}
    )${maxWrapEnd}
    .toArray()
    .map((x) => sem.tripleObject(x)${castToString ? ' + ""' : ''})
    .concat(${
      castToString
        ? `'${IRI_DOES_NOT_EXIST}'`
        : `sem.iri('${IRI_DOES_NOT_EXIST}')`
    })`;
}

function _getDateFieldRangeQuery(
  startIndexName,
  startDateStr,
  endIndexName,
  endDateStr,
  op,
  weight,
) {
  const isStartDate = _determineIsStartDateByOperator(op);

  // Each date range is expected to be configured with a start and end field range index.
  const fieldName = isStartDate ? startIndexName : endIndexName;

  // We may only have of the two, and even if it is a start date but only given an end date,
  // use as a start date (and vice versa).
  const dateStr = isStartDate
    ? startDateStr || endDateStr
    : endDateStr || startDateStr;

  return `cts.fieldRangeQuery('${fieldName}', '${op}', ${convertPartialDateTimeToSeconds(
    dateStr,
    isStartDate,
  )}, [], ${weight})`;
}

function _determineIsStartDateByOperator(op) {
  // Only when the operator is < and >= should a partial date be treated as a start date.
  return ['<', '<='].includes(op);
}

function _getCtsQueryFunctionName(indexType, isCompleteMatch) {
  return `cts.${indexType}${isCompleteMatch === true ? 'Value' : 'Word'}Query`;
}

//#region Search pattern options
// TODO: add dedicated getters and setters for remaining, relavant options.
const PatternOptions = class {
  constructor(prefFragJoins = false) {
    this.options = {};
    this.prefFragJoins = prefFragJoins;
  }

  set(name, value) {
    this.options[name] = value;
  }

  get(name, defaultValue = null) {
    if (this.options.hasOwnProperty(name)) {
      return this.options[name];
    }
    return defaultValue;
  }

  setPreferFragJoins(b) {
    this.prefFragJoins = b;
  }
  getPreferFragJoins(defaultValue = false) {
    return this.prefFragJoins || defaultValue;
  }
};
//#endregion

export {
  OPTION_NAME_EAGER_EVALUATION,
  OPTION_NAME_MAXIMUM_VALUES,
  OPTION_NAME_PREFER_FRAG_JOINS,
  OPTION_NAME_RETURN_VALUES,
  PATTERN_NAME_DATE_RANGE,
  PATTERN_NAME_DOCUMENT_ID,
  PATTERN_NAME_GEOSPATIAL,
  PATTERN_NAME_HOP_INVERSE,
  PATTERN_NAME_HOP_WITH_FIELD,
  PATTERN_NAME_INDEXED_RANGE,
  PATTERN_NAME_INDEXED_VALUE,
  PATTERN_NAME_INDEXED_WORD,
  PATTERN_NAME_IRI,
  // PATTERN_NAME_PROPERTY_VALUE,
  PATTERN_NAME_RELATED_LIST,
  PATTERN_NAME_KEYWORD,
  TYPE_GROUP,
  TYPE_TERM,
  TYPE_ATOMIC,
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
  PatternOptions,
};
