'use strict';
// V5: Stemming correctness
// Tests that stemmed search matches morphological variants and that
// unstemmed search correctly excludes them.
//
// Test A: stemmed "painting" — should match item-009 (painting), item-010 (Painting),
//         item-011 (paintings). May also match item-008 (PAINTING).
// Test B: unstemmed "painting" — should match exact word only (009, 010, 008),
//         NOT item-011 (paintings).

const op = require('/MarkLogic/optic');

const COLLECTION = 'filtering-validation';
const SCOPE_CONSTRAINT = cts.collectionQuery(COLLECTION);
const SCOPE_TYPES = ['DigitalObject', 'HumanMadeObject'];

function buildOpticPlan(ctsQuery) {
  return op
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
      op.fromSearch(ctsQuery, null, null, { scoreMethod: 'logtfidf' }),
      op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('fragmentId')),
    )
    .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
    .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);
}

function runScenario(label, ctsQuery) {
  const scopedQuery = cts.andQuery([SCOPE_CONSTRAINT, ctsQuery]);
  const unfilteredUris = cts.uris(null, [], scopedQuery).toArray().map(String);
  const filteredUris = [];
  for (const doc of cts.search(scopedQuery)) {
    filteredUris.push(String(fn.documentUri(doc)));
  }
  const opticUris = buildOpticPlan(ctsQuery)
    .result()
    .toArray()
    .map((r) => r.id);

  return {
    label,
    unfiltered: { count: unfilteredUris.length, uris: unfilteredUris.sort() },
    filtered: { count: filteredUris.length, uris: filteredUris.sort() },
    optic: { count: opticUris.length, uris: opticUris.sort() },
    falsePositives: unfilteredUris.filter((u) => !filteredUris.includes(u)),
    opticVsFiltered: opticUris.filter((u) => !filteredUris.includes(u)),
    unfilteredMatchesFiltered: unfilteredUris.length === filteredUris.length,
    opticMatchesFiltered: opticUris.length === filteredUris.length,
  };
}

// Test A: stemmed "painting"
const testA = runScenario(
  'A: stemmed "painting"',
  cts.fieldWordQuery(
    'itemAnyText',
    'painting',
    [
      'case-insensitive',
      'diacritic-insensitive',
      'punctuation-insensitive',
      'whitespace-insensitive',
      'stemmed',
      'wildcarded',
    ],
    1,
  ),
);

// Test B: unstemmed "painting"
const testB = runScenario(
  'B: unstemmed "painting"',
  cts.fieldWordQuery(
    'itemAnyText',
    'painting',
    [
      'case-insensitive',
      'diacritic-insensitive',
      'punctuation-insensitive',
      'whitespace-insensitive',
      'unstemmed',
      'wildcarded',
    ],
    1,
  ),
);

const results = {
  scenario: 'V5: Stemming correctness',
  description: 'Tests stemmed vs unstemmed search behavior.',
  expectedBehavior: {
    testA:
      'Stemmed should match: 008 (PAINTING), 009 (painting), 010 (Painting), 011 (paintings)',
    testB:
      'Unstemmed should match: 008 (PAINTING), 009 (painting), 010 (Painting) — NOT 011 (paintings)',
  },
  testA,
  testB,
};
export default results;
