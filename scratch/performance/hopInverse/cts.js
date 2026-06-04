cts.andQuery([
  cts.jsonPropertyValueQuery(
    'dataType',
    ['DigitalObject', 'HumanMadeObject'],
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
        cts.andQuery([
          cts.andQuery([
            cts.jsonPropertyValueQuery('dataType', ['Set'], ['exact']),
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
                    ['http://vocab.getty.edu/aat/300375748'],
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
          cts.documentQuery(
            cts
              .triples(
                [],
                [la('member_of')],
                [],
                '=',
                ['eager', 'concurrent'],
                cts.documentQuery([
                  'https://lux.collections.yale.edu/data/set/1dc7ad5a-6fe3-4ce5-a599-ca5e5742876d',
                ]),
              )
              .toArray()
              .map((x) => sem.tripleObject(x))
              .concat(sem.iri('/does/not/exist')),
          ),
        ]),
      ),
      0,
      sem.iri('/does/not/exist'),
    ),
    '=',
    [],
    1,
  ),
]);
