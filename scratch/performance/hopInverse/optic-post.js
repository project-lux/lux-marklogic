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
  .where(op.in(op.col('dataType'), ['DigitalObject', 'HumanMadeObject']))
  .joinInner(
    op.fromSearch(
      cts.andQuery(
        cts.tripleRangeQuery(
          null,
          sem.iri('https://linked.art/ns/terms/member_of'),
          sem.iri('/does/not/exist'),
          ['=', '=', '='],
          null,
          1,
        ),
        null,
      ),
      null,
      null,
      { scoreMethod: 'logtfidf' },
    ),
    op.on(op.fragmentIdCol('frag'), op.fragmentIdCol('fragmentId')),
  )
  .groupBy(
    ['uri'],
    [
      op.sample('dataType', op.col('dataType')),
      op.max('score', op.col('score')),
    ],
  )
  .orderBy([op.desc(op.col('score'))])
  .select([
    op.as('id', op.col('uri')),
    op.as('type', op.col('dataType')),
    'score',
  ]);

const offset = 0;
const limit = 20;
const results = selectedPlan.offset(offset).limit(limit).result().toArray();
export default results;
