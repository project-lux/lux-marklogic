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
// 6/18 where-clause optimization
import op from '/MarkLogic/optic.mjs';

// Builds the same `cts.orQuery([nonSemanticWordQuery, tripleRangeQuery])`
// produced by Keyword.apply, but driven by raw values instead of a SearchTerm.
// Used by the experimental page-slice hydration path (keywordPageSlice.mjs)
// so the two execution paths cannot drift on query semantics.
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

class Keyword extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    // 6/18 where-clause optimization: when relevance scoring is not needed,
    // use op.fromTriples with a where-clause filter instead of pre-resolving
    // IRIs into cts.tripleRangeQuery. This keeps the plan AST compact and
    // avoids the ~3.8s cold-start optimizer cost from embedding 49K IRI
    // literals. The scoring path retains the existing CTS approach because
    // assemblePlan requires ctsConstraints to drive op.fromSearch.
    const areScoresRequired =
      scp.getSortCriteria()?.areScoresRequired() ?? false;

    if (areScoresRequired) {
      // Scoring path: unchanged -- ctsConstraints feeds op.fromSearch in
      // assemblePlan to produce the score column for relevance ranking.
      const ctsQuery = buildKeywordCtsQuery({
        termValues: utils.toArray(searchTerm.getValue()),
        termScopeName: searchTerm.getScopeName(),
        isCompleteMatch: searchTerm.isCompleteMatch(),
        searchOptions: searchTerm.getSearchOptions(),
        termWeight: searchTerm.getWeight() ?? 1.0,
      });
      return { ctsConstraints: [ctsQuery] };
    }

    // 6/18 where-clause optimization: no-score path.
    // Return the combined (text union semantic) plan as a patternJoin.
    // assemblePlan will joinInner it (AND) or joinFullOuter it via the
    // duplicate-lexicon wrap (OR), giving correct per-keyword OR semantics
    // across both legs without any IRI literals in the plan AST.
    return buildKeywordFromTriplesPlan({
      id: searchTerm.getId(),
      termValues: utils.toArray(searchTerm.getValue()),
      termScopeName: searchTerm.getScopeName(),
      isCompleteMatch: searchTerm.isCompleteMatch(),
      searchOptions: searchTerm.getSearchOptions(),
      termWeight: searchTerm.getWeight() ?? 1.0,
      parentUriCol: searchTerm.getParentUriColumn(),
    });
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
}

// Builds a single CTS field query, or an AND of them when multiple values
// are supplied. fieldWordQuery / fieldValueQuery accept an array of field
// names natively, so multiple fields are passed through as-is.
function buildWordQueries(fields, values, isCompleteMatch, options, weight) {
  const queryFn = isCompleteMatch ? cts.fieldValueQuery : cts.fieldWordQuery;
  const queries = values.map((v) => queryFn(fields, v, options, weight));
  return queries.length === 1 ? queries[0] : cts.andQuery(queries);
}

// 6/18 where-clause optimization: builds the combined (text union semantic)
// Optic sub-plan for a single keyword under the no-score path.
//
// Shape: fromLexicons(uri).where(textQuery)
//          .union(
//            fromLexicons(uri).joinInner(
//              fromTriples([s, predicate, o, tripleSubjFrag])
//                .where(semanticFieldWordQuery),
//              on(frag, tripleSubjFrag)
//            )
//          )
//          .groupBy([id_uri], [])
//
// Key design decisions:
//   - No cts.iriReference() in fromLexicons -- the IRI lexicon has 43.9M
//     entries and caused MEMCANCELED in earlier experiments (Theory N2).
//     Using only cts.uriReference() keeps the lexicon scan manageable.
//   - fromTriples subject frag joined to lexicon frag -- avoids the IRI
//     column entirely; op.fromTriples co-locates triples on the subject doc.
//   - groupBy([id_uri]) deduplicates documents that matched via both legs
//     (e.g., a document whose text also matches the reference field directly).
//   - The returned patternJoin is joined to the base plan by assemblePlan:
//       AND context  -> joinInner(combinedPlan, on(parentUri, id_uri))
//       OR context   -> duplicate-lexicon joinFullOuter (engine handles it)
//       NOT context  -> notExistsJoin
function buildKeywordFromTriplesPlan({
  id,
  termValues,
  termScopeName,
  isCompleteMatch,
  searchOptions,
  termWeight,
  parentUriCol,
}) {
  const outUriCol = id + '_uri';
  const outFragCol = id + '_frag';
  const tripleSubjCol = id + '_s';
  const tripleObjCol = id + '_o';
  const tripleSubjFragCol = id + '_tripleSubjFrag';

  // Lexicon spec deliberately omits cts.iriReference() to avoid the
  // 43.9M-entry IRI scan. uri + dataType is sufficient for the join and
  // for the scope filter applied by assemblePlan in OR context.
  const lexiconSpec = {
    [outUriCol]: cts.uriReference(),
  };
  const lexiconOpts = null;
  const fragIdCol = op.fragmentIdCol(outFragCol);

  const predicates = expandPredicates(getSearchScopePredicates(termScopeName));

  const textCtsQuery = buildWordQueries(
    getSearchScopeFields(termScopeName),
    termValues,
    isCompleteMatch,
    searchOptions,
    termWeight,
  );

  const semanticCtsQuery = buildWordQueries(
    [FULL_TEXT_SEARCH_RELATED_FIELD_NAME],
    termValues,
    isCompleteMatch,
    searchOptions,
    termWeight,
  );

  // Text leg: documents that directly match the keyword via the scope's text field.
  const textLeg = op
    .fromLexicons(lexiconSpec, lexiconOpts, fragIdCol)
    .where(textCtsQuery);

  // Semantic leg: documents that are subjects of triples whose object documents
  // match the keyword via the reference name field. The where-clause filter is
  // pushed into the triple index scan at execution time -- no IRI pre-resolution.
  const semanticLeg = op
    .fromLexicons(lexiconSpec, lexiconOpts, fragIdCol)
    .joinInner(
      op
        .fromTriples([
          op.pattern(
            op.col(tripleSubjCol),
            predicates,
            op.col(tripleObjCol),
            op.fragmentIdCol(tripleSubjFragCol),
          ),
        ])
        .where(semanticCtsQuery),
      op.on(op.fragmentIdCol(outFragCol), op.fragmentIdCol(tripleSubjFragCol)),
    );

  const combinedPlan = textLeg
    .union(semanticLeg)
    .groupBy([outUriCol], []);

  return {
    patternJoins: [
      {
        right: combinedPlan,
        on: [op.on(op.col(parentUriCol), op.col(outUriCol))],
        extraCols: [],
      },
    ],
  };
}

const PATTERN_NAME_KEYWORD = 'keyword';
SearchPatternBase.register(PATTERN_NAME_KEYWORD, new Keyword());

export { PATTERN_NAME_KEYWORD, buildKeywordCtsQuery };
