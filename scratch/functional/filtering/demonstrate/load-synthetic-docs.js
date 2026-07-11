'use strict';
// Load all synthetic filtering test documents.
// Run in Query Console against the TEST CONTENT database.
// Documents are defined inline so no filesystem access is needed.
declareUpdate();

const COLLECTION = 'filtering-validation';
const PERMISSIONS = [
  xdmp.permission('rest-reader', 'read'),
  xdmp.permission('rest-writer', 'update'),
];

// Minimal item document factory. All docs are HumanMadeObject with itemAnyText-eligible content.
function makeDoc(id, names, descriptions) {
  const identified_by = names.map((n) => ({
    type: 'Name',
    content: n,
    classified_as: [
      {
        id: 'https://lux.collections.yale.edu/data/concept/f7ef5bb4-e7fb-443d-9c6b-371a23e717ec',
        type: 'Type',
        _label: 'Primary Name',
        equivalent: [
          { id: 'http://vocab.getty.edu/aat/300404670', type: 'Type' },
        ],
      },
    ],
  }));
  const referred_to_by = (descriptions || []).map((d) => ({
    type: 'LinguisticObject',
    content: d,
    classified_as: [
      {
        id: 'https://lux.collections.yale.edu/data/concept/b9d84f17-662e-46ef-ab8b-7499717f8337',
        type: 'Type',
        _label: 'Description',
        equivalent: [
          { id: 'http://vocab.getty.edu/aat/300435416', type: 'Type' },
        ],
      },
    ],
  }));
  return {
    json: {
      id: `https://lux.collections.yale.edu/data/test/${id}`,
      type: 'HumanMadeObject',
      _label: `Test ${id}`,
      identified_by,
      referred_to_by,
      classified_as: [
        {
          id: 'https://lux.collections.yale.edu/data/concept/test-type-1',
          type: 'Type',
        },
      ],
    },
    triples: [],
    admin: {},
    indexedProperties: { dataType: 'HumanMadeObject' },
  };
}

const docs = [
  {
    uri: '/test/filtering/item-001.json',
    content: makeDoc(
      'item-001',
      ['Georgia Landscape'],
      ['Painted by Keeffe in 1920'],
    ),
  },
  {
    uri: '/test/filtering/item-002.json',
    content: makeDoc('item-002', ['Portrait of Georgia Keeffe'], []),
  },
  {
    uri: '/test/filtering/item-003.json',
    content: makeDoc('item-003', ["O'Keeffe Exhibition Catalog"], []),
  },
  {
    uri: '/test/filtering/item-004.json',
    content: makeDoc('item-004', ['O Keeffe Collection Guide'], []),
  },
  {
    uri: '/test/filtering/item-005.json',
    content: makeDoc('item-005', ['OKeeffe Digital Archive'], []),
  },
  {
    uri: '/test/filtering/item-006.json',
    content: makeDoc(
      'item-006',
      ['Stieglitz Photograph'],
      ['Held in the Beinecke Rare Book and Manuscript Library'],
    ),
  },
  {
    uri: '/test/filtering/item-007.json',
    content: makeDoc(
      'item-007',
      ['Stieglitz Cloud Study'],
      ['A gelatin silver print from the museum collection'],
    ),
  },
  {
    uri: '/test/filtering/item-008.json',
    content: makeDoc('item-008', ['PAINTING BY UNKNOWN ARTIST'], []),
  },
  {
    uri: '/test/filtering/item-009.json',
    content: makeDoc('item-009', ['A painting of the seaside'], []),
  },
  {
    uri: '/test/filtering/item-010.json',
    content: makeDoc('item-010', ['Painting of Flowers'], []),
  },
  {
    uri: '/test/filtering/item-011.json',
    content: makeDoc('item-011', ['Collection of watercolor paintings'], []),
  },
  {
    uri: '/test/filtering/item-012.json',
    content: makeDoc('item-012', ['Self-portrait in Blue'], []),
  },
  {
    uri: '/test/filtering/item-013.json',
    content: makeDoc('item-013', ['Self portrait in Red'], []),
  },
  {
    uri: '/test/filtering/item-014.json',
    content: makeDoc('item-014', ['Selfportrait with Hat'], []),
  },
];

let loaded = 0;
let skipped = 0;

for (const doc of docs) {
  if (fn.docAvailable(doc.uri)) {
    skipped++;
    continue;
  }
  xdmp.documentInsert(doc.uri, doc.content, {
    collections: [COLLECTION],
    permissions: PERMISSIONS,
  });
  loaded++;
}

const results = {
  loaded,
  skipped,
  total: docs.length,
  collection: COLLECTION,
  message: `Loaded ${loaded} documents, skipped ${skipped} (already exist). Collection: ${COLLECTION}`,
};
export default results;
