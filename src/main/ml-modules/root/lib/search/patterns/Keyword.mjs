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
  apply(scp, searchTerm, logicType, patternOptions) {
    const ctsQuery = buildKeywordCtsQuery({
      termValues: utils.toArray(searchTerm.getValue()),
      termScopeName: searchTerm.getScopeName(),
      isCompleteMatch: searchTerm.isCompleteMatch(),
      searchOptions: searchTerm.getSearchOptions(),
      termWeight: searchTerm.getWeight() ?? 1.0,
    });
    return { ctsConstraints: [ctsQuery] };
  }

  mayTokenizeValue() {
    return true;
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

  contributesRelevanceScore() {
    return true;
  }
}

// Builds `cts.orQuery([nonSemanticWordQuery, tripleRangeQuery])` from raw
// values. Used by both Keyword.apply (via SearchTerm) and the page-slice
// hydration path (keywordPageSlice.mjs) so query semantics stay in one place.
function buildKeywordCtsQuery({
  termValues,
  termScopeName,
  isCompleteMatch = false,
  searchOptions,
  termWeight = 1.0,
}) {
  const nonSemanticWordQuery = buildWordQueries(
    getSearchScopeFields(termScopeName),
    termValues,
    isCompleteMatch,
    searchOptions,
    termWeight,
  );
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

  return cts.orQuery([nonSemanticWordQuery, tripleRangeQuery]);
}

// Builds a single CTS field query, or an AND of them when multiple values
// are supplied. fieldWordQuery / fieldValueQuery accept an array of field
// names natively, so multiple fields are passed through as-is.
function buildWordQueries(fields, values, isCompleteMatch, options, weight) {
  const queryFn = isCompleteMatch ? cts.fieldValueQuery : cts.fieldWordQuery;
  const queries = values.map((v) => queryFn(fields, v, options, weight));
  return queries.length === 1 ? queries[0] : cts.andQuery(queries);
}

const PATTERN_NAME_KEYWORD = 'keyword';
SearchPatternBase.register(PATTERN_NAME_KEYWORD, new Keyword());

export { PATTERN_NAME_KEYWORD, buildKeywordCtsQuery };
