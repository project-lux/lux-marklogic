import { IDENTIFIERS } from '../lib/identifierConstants.mjs';
import op from '/MarkLogic/optic';

const crm = op.prefixer('http://www.cidoc-crm.org/cidoc-crm/');
const la = op.prefixer('https://linked.art/ns/terms/');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');
const skos = op.prefixer('http://www.w3.org/2004/02/skos/core#');

const SEMANTIC_FACETS_CONFIG = {
  responsibleCollections: {
    potentialFacetValuesCtsQuery: cts.andQuery([
      cts.jsonPropertyValueQuery('dataType', 'Set', ['exact']),
      cts.jsonPropertyValueQuery(
        'id',
        'http://vocab.getty.edu/aat/300025976',
        ['exact'],
        1
      ),
    ]),
    getValuesCountCtsQuery: (baseSearchCtsQuery, facetValueId) => {
      return cts.andQuery([
        cts.fieldValueQuery(['itemMemberOfId'], facetValueId, ['exact'], 1),
        baseSearchCtsQuery,
      ]);
    },
    getFacetSelectedCriteria: (baseSearchJsonCriteria, facetValueId) => {
      const criteria = {
        _scope: 'item',
        AND: [
          {
            memberOf: {
              id: facetValueId,
            },
          },
          baseSearchJsonCriteria,
        ],
      };
      return criteria;
    },
  },
  responsibleUnits: {
    potentialFacetValuesCtsQuery: cts.andQuery([
      cts.jsonPropertyValueQuery('dataType', ['Group'], ['exact']),
      cts.orQuery([
        cts.andQuery([
          cts.documentQuery(
            cts
              .triples(
                [],
                [lux('agentOfCuration')],
                [],
                '=',
                ['eager', 'concurrent'],
                cts.tripleRangeQuery(
                  [],
                  [lux('setClassifiedAs')],
                  fn.insertBefore(
                    cts.values(
                      cts.iriReference(),
                      '',
                      ['eager', 'concurrent'],
                      cts.fieldValueQuery(
                        ['conceptIdentifier'],
                        [IDENTIFIERS.collection],
                        ['exact'],
                        1
                      )
                    ),
                    0,
                    sem.iri('/does/not/exist')
                  ),
                  '=',
                  [],
                  1
                )
              )
              .toArray()
              .map((x) => sem.tripleObject(x))
              .concat(sem.iri('/does/not/exist'))
          ),
          cts.notQuery(
            cts.andQuery([
              cts.tripleRangeQuery(
                [],
                [lux('agentClassifiedAs')],
                fn.insertBefore(
                  cts.values(
                    cts.iriReference(),
                    '',
                    ['eager', 'concurrent'],
                    cts.fieldValueQuery(
                      ['conceptIdentifier'],
                      [IDENTIFIERS.department],
                      ['exact'],
                      1
                    )
                  ),
                  0,
                  sem.iri('/does/not/exist')
                ),
                '=',
                [],
                1
              ),
            ])
          ),
        ]),
        cts.andQuery([
          cts.documentQuery(
            cts
              .triples(
                [],
                [crm('P107i_is_current_or_former_member_of')],
                [],
                '=',
                ['eager', 'concurrent'],
                cts.andQuery([
                  cts.tripleRangeQuery(
                    [],
                    [lux('agentClassifiedAs')],
                    fn.insertBefore(
                      cts.values(
                        cts.iriReference(),
                        '',
                        ['eager', 'concurrent'],
                        cts.fieldValueQuery(
                          ['conceptIdentifier'],
                          [IDENTIFIERS.department],
                          ['exact'],
                          1
                        )
                      ),
                      0,
                      sem.iri('/does/not/exist')
                    ),
                    '=',
                    [],
                    1
                  ),
                  cts.documentQuery(
                    cts
                      .triples(
                        [],
                        [lux('agentOfCuration')],
                        [],
                        '=',
                        ['eager', 'concurrent'],
                        cts.tripleRangeQuery(
                          [],
                          [lux('setClassifiedAs')],
                          fn.insertBefore(
                            cts.values(
                              cts.iriReference(),
                              '',
                              ['eager', 'concurrent'],
                              cts.fieldValueQuery(
                                ['conceptIdentifier'],
                                [IDENTIFIERS.collection],
                                ['exact'],
                                1
                              )
                            ),
                            0,
                            sem.iri('/does/not/exist')
                          ),
                          '=',
                          [],
                          1
                        )
                      )
                      .toArray()
                      .map((x) => sem.tripleObject(x))
                      .concat(sem.iri('/does/not/exist'))
                  ),
                ])
              )
              .toArray()
              .map((x) => sem.tripleObject(x))
              .concat(sem.iri('/does/not/exist'))
          ),
        ]),
      ]),
    ]),
    getValuesCountCtsQuery: (baseSearchCtsQuery, facetValueId) => {
      return cts.andQuery([
        cts.andQuery([
          cts.jsonPropertyValueQuery(
            'dataType',
            ['DigitalObject', 'HumanMadeObject'],
            ['exact']
          ),
          cts.tripleRangeQuery(
            [],
            [la('member_of')],
            fn.insertBefore(
              cts.values(
                cts.iriReference(),
                '',
                ['eager', 'concurrent'],
                cts.tripleRangeQuery(
                  [],
                  [lux('agentOfCuration')],
                  fn.insertBefore(
                    cts.values(
                      cts.iriReference(),
                      '',
                      ['eager', 'concurrent'],
                      cts.orQuery([
                        cts.fieldValueQuery(
                          ['agentMemberOfId'],
                          [facetValueId],
                          ['exact'],
                          1
                        ),
                        cts.documentQuery([facetValueId]),
                      ])
                    ),
                    0,
                    sem.iri('/does/not/exist')
                  ),
                  '=',
                  [],
                  1
                )
              ),
              0,
              sem.iri('/does/not/exist')
            ),
            '=',
            [],
            1
          ),
        ]),
        baseSearchCtsQuery,
      ]);
    },
    getFacetSelectedCriteria: (baseSearchJsonCriteria, facetValueId) => {
      const criteria = {
        _scope: 'item',
        AND: [
          {
            memberOf: {
              curatedBy: {
                OR: [
                  {
                    memberOf: {
                      id: facetValueId,
                    },
                  },
                  {
                    id: facetValueId,
                  },
                ],
              },
            },
          },
          baseSearchJsonCriteria,
        ],
      };
      return criteria;
    },
  },
};

export { SEMANTIC_FACETS_CONFIG };
