'use strict';
// V4: NOT with approximate sub-query
// Mirrors the UAT finding: (stieglitz OR o'keeffe) AND NOT library
// If "library" word query has false positives (unlikely for a simple word),
// NOT would produce false negatives. More importantly, this tests whether
// Optic's notExistsJoin / CTS fold correctly excludes documents.
//
// Expected: item-007 matches (has stieglitz, no library).
//           item-006 should NOT match (has stieglitz AND library).
//           item-003 matches (has o'keeffe, no library).

const op = require('/MarkLogic/optic');

const COLLECTION = 'filtering-validation';
const SCOPE_CONSTRAINT = cts.collectionQuery(COLLECTION);
const SCOPE_TYPES = ['DigitalObject', 'HumanMadeObject'];

const DEFAULT_OPTIONS = [
  'case-insensitive',
  'diacritic-insensitive',
  'punctuation-insensitive',
  'whitespace-insensitive',
  'stemmed',
  'wildcarded',
];

// The full query: (stieglitz OR o'keeffe) AND NOT library
const stieglitzQuery = cts.fieldWordQuery(
  'itemAnyText',
  'stieglitz',
  DEFAULT_OPTIONS,
  1,
);
const okeeffeQuery = cts.fieldWordQuery(
  'itemAnyText',
  "o'keeffe",
  DEFAULT_OPTIONS,
  1,
);
const libraryQuery = cts.fieldWordQuery(
  'itemAnyText',
  'library',
  DEFAULT_OPTIONS,
  1,
);

const combinedQuery = cts.andNotQuery(
  cts.orQuery([stieglitzQuery, okeeffeQuery]),
  libraryQuery,
);

const scopedQuery = cts.andQuery([SCOPE_CONSTRAINT, combinedQuery]);

// 1. Unfiltered
const unfilteredUris = cts.uris(null, [], scopedQuery).toArray().map(String);

// 2. Filtered
const filteredUris = [];
for (const doc of cts.search(scopedQuery)) {
  filteredUris.push(String(fn.documentUri(doc)));
}

// 3. Optic — using the CTS query in a where clause (non-scoring path, like Opt 1)
const opticPlanWhere = op
  .fromLexicons(
    {
      uri: cts.uriReference(),
      iri: cts.iriReference(),
      dataType: cts.fieldReference('anyDataTypeName', [
        'type=string',
        'collation=http://marklogic.com/collation/codepoint',
      ]),
    },
    null,
    op.fragmentIdCol('frag'),
  )
  .where(cts.collectionQuery(COLLECTION))
  .where(op.in(op.col('dataType'), SCOPE_TYPES))
  .where(combinedQuery)
  .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);

const opticWhereUris = opticPlanWhere
  .result()
  .toArray()
  .map((r) => r.id);

// 4. Optic — using fromSearch (scoring path)
const opticPlanFromSearch = op
  .fromLexicons(
    {
      uri: cts.uriReference(),
      iri: cts.iriReference(),
      dataType: cts.fieldReference('anyDataTypeName', [
        'type=string',
        'collation=http://marklogic.com/collation/codepoint',
      ]),
    },
    null,
    op.fragmentIdCol('frag'),
  )
  .where(cts.collectionQuery(COLLECTION))
  .where(op.in(op.col('dataType'), SCOPE_TYPES))
  .joinInner(
    op.fromSearch(combinedQuery, null, null, { scoreMethod: 'logtfidf' }),
    op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('fragmentId')),
  )
  .groupBy(
    ['uri'],
    [
      op.sample('dataType', op.col('dataType')),
      op.max('score', op.col('score')),
    ],
  )
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);

const opticFromSearchUris = opticPlanFromSearch
  .result()
  .toArray()
  .map((r) => r.id);

const results = {
  scenario: 'V4: NOT with approximate sub-query',
  description:
    "Tests (stieglitz OR o'keeffe) AND NOT library. Mirrors UAT finding where Optic returned 158 vs CTS 3.",
  expectedBehavior: {
    shouldMatch: [
      "item-003 (o'keeffe)",
      'item-004 (O Keeffe)',
      'item-005 (OKeeffe)',
      'item-007 (stieglitz, no library)',
    ],
    shouldNotMatch: ['item-006 (stieglitz WITH library)'],
  },
  unfiltered: { count: unfilteredUris.length, uris: unfilteredUris.sort() },
  filtered: { count: filteredUris.length, uris: filteredUris.sort() },
  opticWhere: { count: opticWhereUris.length, uris: opticWhereUris.sort() },
  opticFromSearch: {
    count: opticFromSearchUris.length,
    uris: opticFromSearchUris.sort(),
  },
  falsePositives: unfilteredUris.filter((u) => !filteredUris.includes(u)),
  falseNegatives: filteredUris.filter((u) => !unfilteredUris.includes(u)),
  opticWhereVsFiltered: opticWhereUris.filter((u) => !filteredUris.includes(u)),
  opticFromSearchVsFiltered: opticFromSearchUris.filter(
    (u) => !filteredUris.includes(u),
  ),
  analysis: {
    unfilteredMatchesFiltered: unfilteredUris.length === filteredUris.length,
    opticWhereMatchesFiltered: opticWhereUris.length === filteredUris.length,
    opticFromSearchMatchesFiltered:
      opticFromSearchUris.length === filteredUris.length,
    note: 'If unfiltered > filtered, NOT is producing false negatives (documents incorrectly excluded). If unfiltered < filtered for the positive part, the OR has false positives that NOT amplified.',
  },
};
export default results;
