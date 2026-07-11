'use strict';
// V2: Case sensitivity
// Tests whether case-sensitive search correctly distinguishes case variants.
// Bob Starbird: "unfiltered case-sensitive searches of lower-case queries
// cannot eliminate false positives" — even WITH fast-case-sensitive-searches.
//
// Test A: case-sensitive search for "PAINTING" (upper) — should match item-008 only.
// Test B: case-sensitive search for "painting" (lower) — Bob says this MAY
//         produce false positives (matches upper-case too) unfiltered.
// Test C: case-insensitive search for "painting" — should match all three (008, 009, 010).

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

// Test A: case-sensitive "PAINTING"
const testA = runScenario(
  'A: case-sensitive "PAINTING" (upper)',
  cts.fieldWordQuery(
    'itemAnyText',
    'PAINTING',
    [
      'case-sensitive',
      'diacritic-insensitive',
      'punctuation-insensitive',
      'whitespace-insensitive',
      'stemmed',
      'wildcarded',
    ],
    1,
  ),
);

// Test B: case-sensitive "painting" (lower) — Bob's known false-positive trigger
const testB = runScenario(
  'B: case-sensitive "painting" (lower)',
  cts.fieldWordQuery(
    'itemAnyText',
    'painting',
    [
      'case-sensitive',
      'diacritic-insensitive',
      'punctuation-insensitive',
      'whitespace-insensitive',
      'stemmed',
      'wildcarded',
    ],
    1,
  ),
);

// Test C: case-insensitive "painting" (baseline)
const testC = runScenario(
  'C: case-insensitive "painting" (baseline)',
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

const results = {
  scenario: 'V2: Case sensitivity',
  description:
    'Tests case-sensitive search accuracy. Bob Starbird notes lower-case case-sensitive queries cannot eliminate false positives even with fast-case-sensitive-searches.',
  expectedBehavior: {
    testA: 'Only item-008 (PAINTING) should match',
    testB:
      'Only item-009 (painting) should match — but Bob says false positives from item-008/010 are possible',
    testC:
      'All three (008, 009, 010) plus item-011 (paintings via stemming) should match',
  },
  testA,
  testB,
  testC,
};
export default results;
