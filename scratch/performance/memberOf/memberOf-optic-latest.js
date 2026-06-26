op.fromLexicons(
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
  .where(op.in(op.col('dataType'), ['DigitalObject', 'HumanMadeObject']))
  .where(
    cts.andQuery(
      cts.fieldValueQuery(
        'itemMemberOfId',
        'https://lux.collections.yale.edu/data/set/d1b8a867-8be7-4325-ad78-1f3abda76056',
        [
          'case-sensitive',
          'diacritic-sensitive',
          'punctuation-sensitive',
          'whitespace-sensitive',
          'unstemmed',
          'unwildcarded',
          'lang=en',
        ],
        1,
      ),
      null,
    ),
  )
  .groupBy(['uri'], [op.sample('dataType', op.col('dataType'))])
  .select([op.as('id', op.col('uri')), op.as('type', op.col('dataType'))]);
