'use strict';
// V3: Punctuation sensitivity
// Tests whether punctuation-sensitive search distinguishes O'Keeffe variants.
// Bob Starbird: "Punctuation and space tokens are not indexed as words in the
// universal index. Use of punctuation in the query will allow false positives."
//
// Test A: punctuation-insensitive "o'keeffe" — should match item-003, item-004, possibly item-005.
// Test B: punctuation-sensitive "o'keeffe" — should match ONLY item-003.
// Test C: punctuation-sensitive "self-portrait" — should match ONLY item-012.
// Test D: punctuation-insensitive "self-portrait" — should match item-012, item-013, possibly item-014.

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

// Test A: punctuation-insensitive "o'keeffe"
const testA = runScenario(
  'A: punctuation-insensitive "o\'keeffe"',
  cts.fieldWordQuery(
    'itemAnyText',
    "o'keeffe",
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

// Test B: punctuation-sensitive "o'keeffe"
const testB = runScenario(
  'B: punctuation-sensitive "o\'keeffe"',
  cts.fieldWordQuery(
    'itemAnyText',
    "o'keeffe",
    [
      'case-insensitive',
      'diacritic-insensitive',
      'punctuation-sensitive',
      'whitespace-insensitive',
      'stemmed',
      'wildcarded',
    ],
    1,
  ),
);

// Test C: punctuation-sensitive "self-portrait"
const testC = runScenario(
  'C: punctuation-sensitive "self-portrait"',
  cts.fieldWordQuery(
    'itemAnyText',
    'self-portrait',
    [
      'case-insensitive',
      'diacritic-insensitive',
      'punctuation-sensitive',
      'whitespace-insensitive',
      'stemmed',
      'wildcarded',
    ],
    1,
  ),
);

// Test D: punctuation-insensitive "self-portrait"
const testD = runScenario(
  'D: punctuation-insensitive "self-portrait"',
  cts.fieldWordQuery(
    'itemAnyText',
    'self-portrait',
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
  scenario: 'V3: Punctuation sensitivity',
  description:
    'Tests punctuation-sensitive search accuracy. Bob: punctuation tokens are not indexed; punctuation in queries allows false positives.',
  expectedBehavior: {
    testA:
      "Broad match: item-003 (O'Keeffe), item-004 (O Keeffe), possibly item-005 (OKeeffe)",
    testB:
      "Strict: only item-003 (O'Keeffe) should match after filtering. Unfiltered may include false positives.",
    testC:
      'Strict: only item-012 (Self-portrait) after filtering. Unfiltered may include item-013 (self portrait).',
    testD:
      'Broad: item-012 (Self-portrait) and item-013 (self portrait), possibly item-014 (Selfportrait)',
  },
  testA,
  testB,
  testC,
  testD,
};
export default results;
