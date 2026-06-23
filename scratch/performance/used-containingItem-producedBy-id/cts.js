cts.andQuery([
  cts.jsonPropertyValueQuery('dataType', ['Activity', 'Period'], ['exact']),
  cts.tripleRangeQuery(
    [],
    [crm('P16_used_specific_object')],
    cts
      .triples(
        [],
        [la('member_of')],
        [],
        '=',
        ['eager', 'concurrent'],
        cts.fieldValueQuery(
          ['itemProductionAgentId'],
          [
            'https://lux.collections.yale.edu/data/person/e17df9e9-7254-409f-98c3-7c2fb3e73cd1',
          ],
          ['exact'],
          1,
        ),
      )
      .toArray()
      .map((x) => sem.tripleObject(x))
      .concat(sem.iri('/does/not/exist')),
    '=',
    [],
    1,
  ),
]);
