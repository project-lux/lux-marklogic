'use strict';
// V6: Field containment with //content paths
// Tests whether cts.fieldWordQuery against itemAnyText (path: //content)
// correctly scopes to field instances or conflates across them.
//
// This tests multi-word (tokenized) keyword searches where each word exists
// in the document but in DIFFERENT content nodes.
//
// item-001 has "Georgia Landscape" in one content and "Painted by Keeffe in 1920" in another.
// A tokenized search for "Georgia Keeffe" becomes AND(fieldWordQuery("Georgia"), fieldWordQuery("Keeffe")).
// Both words exist in the document's itemAnyText field — the question is whether
// the index correctly proves both words exist (it should, this is expected behavior
// for tokenized multi-word searches — each word is independently matched).
//
// This scenario validates that tokenized keyword search (the default for multi-word)
// correctly returns documents where individual tokens appear across field instances.
// This is NOT a false positive — it is the intended behavior of tokenized search.
// The false-positive risk is only for PHRASE queries (V1).

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

// Test A: Tokenized multi-word (AND of word queries) — LUX's default behavior
// Simulates what the engine does: tokenize "Georgia Keeffe" into AND(word("Georgia"), word("Keeffe"))
const tokenizedQuery = cts.andQuery([
  cts.fieldWordQuery(
    'itemAnyText',
    'Georgia',
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
  cts.fieldWordQuery(
    'itemAnyText',
    'Keeffe',
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
]);

const testA = runScenario(
  'A: Tokenized AND(word("Georgia"), word("Keeffe")) — cross-instance',
  tokenizedQuery,
);

// Test B: fieldValueQuery (exact match / _complete) — tests whether exact value
// correctly requires the ENTIRE value in a single field instance
const exactQuery = cts.fieldValueQuery(
  'itemAnyText',
  'Georgia Keeffe',
  [
    'case-insensitive',
    'diacritic-insensitive',
    'punctuation-insensitive',
    'whitespace-insensitive',
  ],
  1,
);

const testB = runScenario(
  'B: fieldValueQuery("Georgia Keeffe") — exact match',
  exactQuery,
);

// Test C: fieldValueQuery for a value that exists in a single node
const exactExistsQuery = cts.fieldValueQuery(
  'itemAnyText',
  'Georgia Landscape',
  [
    'case-insensitive',
    'diacritic-insensitive',
    'punctuation-insensitive',
    'whitespace-insensitive',
  ],
  1,
);

const testC = runScenario(
  'C: fieldValueQuery("Georgia Landscape") — exists in single node',
  exactExistsQuery,
);

const results = {
  scenario: 'V6: Field containment with //content paths',
  description:
    'Tests cross-field-instance behavior for tokenized vs exact searches.',
  expectedBehavior: {
    testA:
      'Both item-001 AND item-002 should match (tokenized words found independently across field — this is correct behavior, NOT a false positive)',
    testB:
      'Neither item-001 nor item-002 should match (no single content node contains the exact value "Georgia Keeffe")',
    testC:
      'Only item-001 should match (contains "Georgia Landscape" in a single content node)',
  },
  testA,
  testB,
  testC,
  insight:
    'If testA unfiltered !== filtered, the field-level containment has false positives even for individual word queries (unlikely). If testB returns results, fieldValueQuery does not enforce single-instance containment.',
};
export default results;
