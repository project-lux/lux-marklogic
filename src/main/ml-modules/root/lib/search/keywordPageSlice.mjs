'use strict';

// Experimental page-slice hydration path for simple keyword-only searches.
//
// For pure-keyword queries the standard Optic pipeline incurs ~2.4s of cold
// compile/wrap overhead around large CTS payloads (e.g. ~49K IRIs in the
// tripleRangeQuery for "woman greek art"). This module runs cts.search outside
// Optic, slices to the page the user will see (page * pageLength), then
// hydrates the dataType column via a tiny op.fromParam plan. See approach-D1
// in scratch/performance/woman-greek-art-memberOf/ for the reference run
// that closed the cold-start gap (1526ms vs CTS baseline 1623ms vs Optic
// 4000ms).
//
// V1 scope (deliberately narrow):
//   * Single text term, or AND-only of text terms (no OR/NOT/nesting).
//   * Single scope (allowMultiScope must be false).
//   * Relevance sort only (no semantic, random, or non-semantic sort).
//   * Search results requested; no facets; no pageWith.
//   * SEARCH_PAGE_SLICE_ENABLED must be true (build-time toggle).
//
// FUTURE: Generalize to other patterns by promoting page-slice execution to
// a new "contribution" type from patterns to engine.mjs's accumulator. That
// would let any pure-CTS reduction (multiple patterns folded to a single
// cts query) trigger this path. Tracked but deferred per session decision.

import op from '/MarkLogic/optic.mjs';
import { DEFAULT_SEARCH_OPTIONS_KEYWORD } from '../appConstants.mjs';
import { buildKeywordCtsQuery } from './patterns/Keyword.mjs';

// Returns null when the request is not eligible for the page-slice path.
// Otherwise returns { rows, total } where rows is the top-K array of
// { id, type, score } objects (matching the standard plan's row shape)
// and total is an index-only estimate via cts.estimate.
//
// NOTE: This function does NOT check SEARCH_PAGE_SLICE_ENABLED. The toggle
// is gated at the call site (engine.mjs::performSearch) so verification
// scripts can invoke this function directly to compare paths without a
// redeploy.
function tryExecuteKeywordPageSlice(scp) {
  if (!scp.getIncludeSearchResults()) return null;
  if (scp.getFacetRequests()?.length > 0) return null;
  if (scp.isAllowMultiScope()) return null;
  if (scp.getPageWith()) return null;

  const sortCriteria = scp.getSortCriteria();
  if (sortCriteria) {
    if (
      !sortCriteria.isRelevanceSort() ||
      sortCriteria.isRandomSort() ||
      sortCriteria.hasSemanticSortOption() ||
      sortCriteria.hasNonSemanticSortDescriptors()
    ) {
      return null;
    }
  }

  const scopeName = scp.getSearchScope();
  if (!scopeName) return null;

  const textTerms = extractSimpleTextTerms(scp.getSearchCriteria());
  if (!textTerms) return null;

  const page = Math.max(scp.getPage() ?? 1, 1);
  const pageLength = scp.getPageLength() ?? 20;
  // Hydrate only the rows the user will see (page * pageLength). cts.search
  // is lazy, so this slice forces only top-K node fetches. Critically, this
  // keeps the hydration plan's documentQuery payload small (approach-D vs
  // D'1 showed ~1.1s page-1 difference between 10K-URI and 20-URI payloads).
  const topK = page * pageLength;

  const perTermQueries = textTerms.map((value) =>
    buildKeywordCtsQuery({
      termValues: [value],
      termScopeName: scopeName,
      isCompleteMatch: false,
      searchOptions: DEFAULT_SEARCH_OPTIONS_KEYWORD,
      termWeight: 1.0,
    }),
  );
  const finalQuery =
    perTermQueries.length === 1
      ? perTermQueries[0]
      : cts.andQuery(perTermQueries);

  // cts.scoreOrder('descending') means raw results arrive sorted; slicing
  // before any further work shrinks the payload from 10K+ URIs to top-K.
  const survivors = cts
    .search(finalQuery, [
      'unfiltered',
      'score-logtfidf',
      cts.scoreOrder('descending'),
    ])
    .toArray()
    .slice(0, topK);

  // Hydrate dataType for the top-K survivors via a tiny op.fromParam plan
  // (matches approach-D1's shape). cts.score returns an integer; coerce to
  // double or fromParam binds with type 'double' raise XDMP-INVALID-BINDING.
  const survivorRows = survivors.map((node) => ({
    uri: xdmp.nodeUri(node),
    score: xs.double(cts.score(node)),
  }));

  let rows = [];
  if (survivorRows.length > 0) {
    const uriList = survivorRows.map((r) => r.uri);
    const hydrationPlan = op
      .fromParam('survivors', null, [
        { column: 'uri', type: 'string', nullable: false },
        { column: 'score', type: 'double', nullable: false },
      ])
      .joinInner(
        op
          .fromLexicons(
            {
              uri2: cts.uriReference(),
              dataType: cts.fieldReference('anyDataTypeName'),
            },
            null,
            op.fragmentIdCol('frag'),
          )
          .where(cts.documentQuery(uriList)),
        op.on('uri', 'uri2'),
      )
      .orderBy(op.desc('score'))
      .select([
        op.as('id', op.col('uri')),
        op.as('type', op.col('dataType')),
        op.col('score'),
      ]);
    rows = hydrationPlan.result(null, { survivors: survivorRows }).toArray();
  }

  // cts.estimate is index-only and approximates the unfiltered match count
  // — appropriate for the "total" displayed by the standard path.
  const total = cts.estimate(finalQuery);

  return { rows, total };
}

// Detects the V1-eligible shapes:
//   { text: 'foo' } | { text: ['foo'] }
//   { AND: [{ text: 'foo' }, { text: 'bar' }, ...] }
// Returns an array of string term values, or null when ineligible.
// _scope has already been stripped by SearchCriteriaProcessor by this point.
function extractSimpleTextTerms(criteria) {
  if (!criteria || typeof criteria !== 'object') return null;
  const keys = Object.keys(criteria);
  if (keys.length !== 1) return null;
  const key = keys[0];

  if (key === 'text') {
    const v = criteria.text;
    if (typeof v === 'string') return [v];
    if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v;
    return null;
  }

  if (key === 'AND') {
    const children = criteria.AND;
    if (!Array.isArray(children) || children.length === 0) return null;
    const values = [];
    for (const child of children) {
      if (!child || typeof child !== 'object') return null;
      const childKeys = Object.keys(child);
      if (childKeys.length !== 1 || childKeys[0] !== 'text') return null;
      const v = child.text;
      if (typeof v === 'string') {
        values.push(v);
      } else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
        values.push(...v);
      } else {
        return null;
      }
    }
    return values;
  }

  return null;
}

export { tryExecuteKeywordPageSlice, extractSimpleTextTerms };
