const op = require('/MarkLogic/optic');

const page = 1;
const pageLen = 20;
const offset = (page - 1) * pageLen;

const q = cts.fieldValueQuery(
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
);

let results = op
  .fromSearch(q, ['fragmentId', 'score'])
  .offset(offset)
  .limit(pageLen)
  .orderBy(op.desc('score'))
  .joinDocAndUri('doc', 'uri', op.fragmentIdCol('fragmentId'))
  .result()
  .toArray()
  .map((row) => ({ id: row.uri, type: row.doc.xpath('/json/type') }));
export default results;
