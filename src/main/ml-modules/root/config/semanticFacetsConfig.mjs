import { IDENTIFIERS } from '../lib/identifierConstants.mjs';
import op from '/MarkLogic/optic';
import {
  expandPredicate,
  getPrefixesForSPARQL,
} from '../lib/search/prefixUtils.mjs';

const crm = op.prefixer('http://www.cidoc-crm.org/cidoc-crm/');
const la = op.prefixer('https://linked.art/ns/terms/');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');

const SEMANTIC_FACETS_CONFIG = {
  responsibleCollections: {
    scope: 'item',
    plan: op
      .fromSearch(
        cts.andQuery(
          [
            cts.jsonPropertyValueQuery('dataType', 'Set', ['exact'], 1),
            // IDENTIFIERS.collection resolves against /json[type='Set']/classified_as/equivalent/id,
            // which we do not have a more targetted index for.
            cts.jsonPropertyValueQuery(
              'id',
              IDENTIFIERS.collection,
              ['exact'],
              1,
            ),
          ],
          null,
        ),
      )
      .joinInner(
        op.fromLexicons(
          { setIri: cts.iriReference() },
          null,
          op.fragmentIdCol('setFragId'),
        ),
        op.on('fragmentId', 'setFragId'),
      )
      .joinInner(
        op.fromTriples([
          op.pattern(
            op.col('item'),
            expandPredicate('la:member_of'),
            op.col('set'),
          ),
        ]),
        op.on('setIri', 'set'),
      ),
    sourceJoinColName: 'iri',
    constraintJoinColName: 'item',
    facetValueColName: 'set',
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
    // Opt 21: CTS-native semantic facet properties.
    potentialFacetValuesCtsQuery: () =>
      cts.andQuery([
        cts.jsonPropertyValueQuery('dataType', 'Set', ['exact']),
        cts.jsonPropertyValueQuery('id', IDENTIFIERS.collection, ['exact'], 1),
      ]),
    getValuesCountCtsQuery: (baseSearchCtsQuery, facetValueId) => {
      return cts.andQuery([
        cts.fieldValueQuery(['itemMemberOfId'], facetValueId, ['exact'], 1),
        baseSearchCtsQuery,
      ]);
    },
  },
  responsibleUnits: {
    scope: 'item',
    plan: op.fromSPARQL(`
      ${getPrefixesForSPARQL()}
      SELECT ?item ?set ?curator ?unit
      WHERE {?item la:member_of ?set .
            ?set lux:agentOfCuration ?curator.
            ?curator crm:P107i_is_current_or_former_member_of ?unit
      }
    `),
    sourceJoinColName: 'iri',
    constraintJoinColName: 'item',
    facetValueColName: 'unit',
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
    // Opt 21: CTS-native semantic facet properties.
    potentialFacetValuesCtsQuery: () =>
      cts.andQuery([
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
                          1,
                        ),
                      ),
                      0,
                      sem.iri('/does/not/exist'),
                    ),
                    '=',
                    [],
                    1,
                  ),
                )
                .toArray()
                .map((x) => sem.tripleObject(x))
                .concat(sem.iri('/does/not/exist')),
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
                        1,
                      ),
                    ),
                    0,
                    sem.iri('/does/not/exist'),
                  ),
                  '=',
                  [],
                  1,
                ),
              ]),
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
                            1,
                          ),
                        ),
                        0,
                        sem.iri('/does/not/exist'),
                      ),
                      '=',
                      [],
                      1,
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
                                  1,
                                ),
                              ),
                              0,
                              sem.iri('/does/not/exist'),
                            ),
                            '=',
                            [],
                            1,
                          ),
                        )
                        .toArray()
                        .map((x) => sem.tripleObject(x))
                        .concat(sem.iri('/does/not/exist')),
                    ),
                  ]),
                )
                .toArray()
                .map((x) => sem.tripleObject(x))
                .concat(sem.iri('/does/not/exist')),
            ),
          ]),
        ]),
      ]),
    getValuesCountCtsQuery: (baseSearchCtsQuery, facetValueId) => {
      return cts.andQuery([
        cts.andQuery([
          cts.jsonPropertyValueQuery(
            'dataType',
            ['DigitalObject', 'HumanMadeObject', 'Set'],
            ['exact'],
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
                          1,
                        ),
                        cts.documentQuery([facetValueId]),
                      ]),
                    ),
                    0,
                    sem.iri('/does/not/exist'),
                  ),
                  '=',
                  [],
                  1,
                ),
              ),
              0,
              sem.iri('/does/not/exist'),
            ),
            '=',
            [],
            1,
          ),
        ]),
        baseSearchCtsQuery,
      ]);
    },
  },
};

export { SEMANTIC_FACETS_CONFIG };
