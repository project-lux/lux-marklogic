import {
  FULL_TEXT_SEARCH_RELATED_FIELD_NAME,
  IRI_DOES_NOT_EXIST,
  SEARCH_OPTIONS_NAME_KEYWORD,
} from '../../appConstants.mjs';
import {
  getSearchScopeFields,
  getSearchScopePredicates,
} from '../../searchScope.mjs';
import { expandPredicates } from '../prefixUtils.mjs';
import * as utils from '../../../utils/utils.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class Keyword extends SearchPatternBase {
  apply(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
    requestOptions,
  ) {
    const termValues = utils.toArray(searchTerm.getValue());
    const termWeight = searchTerm.getWeight() ?? 1.0;
    const termScopeName = searchTerm.getScopeName();
    const isCompleteMatch = searchTerm.isCompleteMatch();
    const searchOptions = searchTerm.getSearchOptions();

    // Non-semantic side: word/value match in this document's scope-any field(s).
    const nonSemanticWordQuery = buildWordQueries(
      getSearchScopeFields(termScopeName),
      termValues,
      isCompleteMatch,
      searchOptions,
      termWeight,
    );

    // Semantic side: this document's IRI must subject a scope-any predicate
    // pointing to an object whose referenceName field matches the term.
    // Resolve the matching object IRIs first, then express the constraint as
    // a triple-range query over the document's IRI. This collapses what was
    // previously a triple-hop OR sub-plan in Optic into a single CTS query
    // that ANDs cleanly with sibling keyword constraints on the outer
    // lexicon's where().
    const semanticWordQuery = buildWordQueries(
      [FULL_TEXT_SEARCH_RELATED_FIELD_NAME],
      termValues,
      isCompleteMatch,
      searchOptions,
      termWeight,
    );
    const refIris = cts
      .values(
        cts.iriReference(),
        null,
        ['eager', 'concurrent'],
        semanticWordQuery,
      )
      .toArray();
    // An empty array is interpreted as "any object" by cts.tripleRangeQuery
    // (incorrect when no objects matched). Sentinel guards against that.
    refIris.unshift(sem.iri(IRI_DOES_NOT_EXIST));

    const tripleRangeQuery = cts.tripleRangeQuery(
      [],
      expandPredicates(getSearchScopePredicates(termScopeName)),
      refIris,
      '=',
      [],
      termWeight,
    );

    return {
      ctsConstraints: [cts.orQuery([nonSemanticWordQuery, tripleRangeQuery])],
    };
  }

  getRequiredRuntimeSearchTermProperties() {
    return [];
  }

  getAllowedChildren() {
    return CHILD_TYPE_ATOMIC;
  }

  isConvertIdChildToIri() {
    return false;
  }

  getAllowedSearchOptionsName() {
    return SEARCH_OPTIONS_NAME_KEYWORD;
  }

  getDefaultSearchOptionsName() {
    return SEARCH_OPTIONS_NAME_KEYWORD;
  }
}

// Builds a single CTS field query, or an AND of them when multiple values
// are supplied. fieldWordQuery / fieldValueQuery accept an array of field
// names natively, so multiple fields are passed through as-is.
function buildWordQueries(fields, values, isCompleteMatch, options, weight) {
  const queryFn = isCompleteMatch ? cts.fieldValueQuery : cts.fieldWordQuery;
  const queries = values.map((v) => queryFn(fields, v, options, weight));
  return queries.length === 1 ? queries[0] : cts.andQuery(queries);
}

const KeywordPattern = Object.freeze(new Keyword());

export { KeywordPattern };
