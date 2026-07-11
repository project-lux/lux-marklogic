'use strict';
// V7: Lower-case case-sensitive search (Bob's specific callout)
// Bob Starbird: "If the word is all-lowercase, then case-sensitive search
// requires filtering. When the input term is all lower case it will match
// on any occurrence of the term (upper or lower)."
//
// This directly contradicts the expectation that fast-case-sensitive-searches
// resolves all case-sensitive queries from the index. The Bob document says
// this is a known MarkLogic behavior.
//
// Test A: case-sensitive "stieglitz" (lower) — item-006, item-007 have "Stieglitz" (title case).
//         If Bob is correct, this will match those docs unfiltered (false positive)
//         but filtering will exclude them.
// Test B: case-sensitive "Stieglitz" (title case) — should correctly match item-006, item-007.

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

// Test A: case-sensitive "stieglitz" (all lowercase query)
const testA = runScenario(
  'A: case-sensitive "stieglitz" (lower-case query)',
  cts.fieldWordQuery(
    'itemAnyText',
    'stieglitz',
    [
      'case-sensitive',
      'diacritic-insensitive',
      'punctuation-insensitive',
      'whitespace-insensitive',
      'unstemmed',
      'wildcarded',
    ],
    1,
  ),
);

// Test B: case-sensitive "Stieglitz" (title-case query)
const testB = runScenario(
  'B: case-sensitive "Stieglitz" (title-case query)',
  cts.fieldWordQuery(
    'itemAnyText',
    'Stieglitz',
    [
      'case-sensitive',
      'diacritic-insensitive',
      'punctuation-insensitive',
      'whitespace-insensitive',
      'unstemmed',
      'wildcarded',
    ],
    1,
  ),
);

// Test C: case-insensitive "stieglitz" (baseline — should match both)
const testC = runScenario(
  'C: case-insensitive "stieglitz" (baseline)',
  cts.fieldWordQuery(
    'itemAnyText',
    'stieglitz',
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
  scenario: "V7: Lower-case case-sensitive search (Bob's callout)",
  description:
    'Bob Starbird: lower-case case-sensitive queries cannot eliminate false positives even with fast-case-sensitive-searches. The index resolves all-lowercase terms case-insensitively.',
  expectedBehavior: {
    testA:
      'Data has "Stieglitz" (title case). A case-sensitive search for "stieglitz" (lower) should find NO matches if filtering. Bob says unfiltered will match anyway (false positive).',
    testB:
      'Case-sensitive "Stieglitz" should correctly match item-006 and item-007.',
    testC: 'Case-insensitive baseline should match item-006 and item-007.',
  },
  testA,
  testB,
  testC,
  criticalInsight:
    'If testA.unfiltered > testA.filtered, Bob is confirmed: lower-case case-sensitive queries produce false positives that only filtering can remove. This would explain the UAT finding where Optic returned same count with and without case sensitivity.',
};
export default results;
