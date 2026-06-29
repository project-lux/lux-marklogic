import op from 'MarkLogic/optic.mjs';

const selectedPlan = op
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
  .where(op.in(op.col('dataType'), ['Place']))
  .where(
    cts.andQuery(
      cts.fieldValueQuery(
        'placePartOfId',
        'https://lux.collections.yale.edu/data/place/46d4ec4a-77f0-4f43-9e23-e46b2f4a5ef6',
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

const offset = 0;
const limit = 20;
const results = selectedPlan.offset(offset).limit(limit).result().toArray();
export default results;
