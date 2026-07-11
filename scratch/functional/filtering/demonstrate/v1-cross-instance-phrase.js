'use strict';
// V1: Cross-instance phrase matching
// Tests whether a phrase query for "Georgia Keeffe" matches a document where
// "Georgia" and "Keeffe" appear in SEPARATE content nodes (different field instances).
//
// Expected: item-002 matches (phrase exists in single content node).
//           item-001 should NOT match (words are in different content nodes).
//           If item-001 matches unfiltered, that is a false positive.

const op = require('/MarkLogic/optic');

const COLLECTION = 'filtering-validation';
const SCOPE_CONSTRAINT = cts.collectionQuery(COLLECTION);

// The phrase query: "Georgia Keeffe" as a phrase (complete match = fieldValueQuery)
// and as adjacent words (fieldWordQuery with the phrase as a single string).
const phraseWordQuery = cts.fieldWordQuery(
  'itemAnyText',
  'Georgia Keeffe',
  [
    'case-insensitive',
    'diacritic-insensitive',
    'punctuation-insensitive',
    'whitespace-insensitive',
    'stemmed',
    'wildcarded',
  ],
  1,
);

const scopedPhraseQuery = cts.andQuery([SCOPE_CONSTRAINT, phraseWordQuery]);

// 1. Unfiltered (cts.uris)
const unfilteredUris = cts
  .uris(null, [], scopedPhraseQuery)
  .toArray()
  .map(String);

// 2. Filtered (cts.search)
const filteredUris = [];
for (const doc of cts.search(scopedPhraseQuery)) {
  filteredUris.push(String(fn.documentUri(doc)));
}

// 3. Optic plan (non-semantic keyword path)
const opticPlan = op
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
  .where(op.in(op.col('dataType'), ['DigitalObject', 'HumanMadeObject']))
  .joinInner(
    op.fromSearch(phraseWordQuery, null, null, { scoreMethod: 'logtfidf' }),
    op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('fragmentId')),
  )
  .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);

const opticUris = opticPlan
  .result()
  .toArray()
  .map((r) => r.id);

const results = {
  scenario: 'V1: Cross-instance phrase matching',
  query: 'fieldWordQuery("itemAnyText", "Georgia Keeffe", [default options])',
  description:
    'Tests whether words in separate //content nodes produce a false-positive phrase match.',
  expectedMatch: ['/test/filtering/item-002.json'],
  expectedNoMatch: ['/test/filtering/item-001.json'],
  unfiltered: { count: unfilteredUris.length, uris: unfilteredUris.sort() },
  filtered: { count: filteredUris.length, uris: filteredUris.sort() },
  optic: { count: opticUris.length, uris: opticUris.sort() },
  falsePositives: unfilteredUris.filter((u) => !filteredUris.includes(u)),
  opticVsFiltered: opticUris.filter((u) => !filteredUris.includes(u)),
  analysis: {
    unfilteredMatchesFiltered: unfilteredUris.length === filteredUris.length,
    opticMatchesFiltered: opticUris.length === filteredUris.length,
    hasFalsePositives: unfilteredUris.length > filteredUris.length,
  },
};
export default results;
