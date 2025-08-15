// In QC, set to the database you wish to check the indexes of.
'use strict';
const op = require('/MarkLogic/optic');

/**
 * This should work against MarkLogic 11.0 and later
 **/

const database = xdmp.database();

const databaseIndexes = xdmp.databaseDescribeIndexes(database).toObject();
const allIndexes = [];

Object.keys(databaseIndexes).forEach((key) => {
  const indexes = databaseIndexes[key];
  if (Array.isArray(indexes)) {
    indexes.forEach((index) => {
      index.indexType = key;
      allIndexes.push({
        indexId: index.indexId,
        indexDef: xdmp.toJSON(index),
      });
    });
  } else {
    indexes.indexType = key;
    allIndexes.push({
      indexId: indexes.indexId,
      indexDef: xdmp.toJSON(indexes),
    });
  }
});

const statuses = xdmp
  .forestStatus(xdmp.databaseForests(database), 'memoryDetail')
  .toArray()
  .map((s) => {
    return {
      status: s,
    };
  });

const indexColumnTypes = [
  { column: 'indexId', type: 'string' },
  { column: 'indexDef', type: 'none' },
];

const statusColumnTypes = [{ column: 'status', type: 'none' }];

const params = {
  indexDefs: allIndexes,
  statuses: statuses.slice(0, 1),
};

const indexDefs = op.fromParam('indexDefs', '', indexColumnTypes);

const indexSizes = op
  .fromParam('statuses', '', statusColumnTypes)
  .bind([
    op.as('forestName', op.xpath('status', './forestName/xs:string(.)')),
    op.as(
      'rangeIndexes',
      op.xpath('status', './stands/memoryDetail/memoryRangeIndexes/index')
    ),
  ])
  .unnestInner('rangeIndexes', 'rangeIndex')
  .bind([
    op.as('indexId', op.xpath('rangeIndex', './indexId/xs:string(.)')),
    op.as(
      'indexMemoryBytes',
      op.xpath('rangeIndex', './indexMemoryBytes/xs:unsignedLong(.)')
    ),
    op.as(
      'indexOnDiskBytes',
      op.xpath('rangeIndex', './indexOnDiskBytes/xs:unsignedLong(.)')
    ),
  ])
  .select(['forestName', 'indexId', 'indexMemoryBytes', 'indexOnDiskBytes'])
  .groupBy('indexId', [
    op.sum('totalMemoryBytes', 'indexMemoryBytes'),
    op.sum('totalOnDiskBytes', 'indexOnDiskBytes'),
  ]);

const findings = indexDefs
  .joinLeftOuter(indexSizes, op.on('indexId', 'indexId'))
  .result('object', params);

findings;
export default findings;
