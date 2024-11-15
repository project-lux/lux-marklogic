const SORT_BINDINGS = {
  agentActiveDate: {
    indexType: 'field',
    indexReference: 'agentActiveStartDateLong',
    defaultOrder: 'asc',
  },
  agentEndDate: {
    indexType: 'field',
    indexReference: 'agentDiedStartDateLong',
    defaultOrder: 'asc',
  },
  agentStartDate: {
    indexType: 'field',
    indexReference: 'agentBornStartDateLong',
    defaultOrder: 'asc',
  },
  archiveSortId: {
    subSorts: ['itemArchiveSortId', 'workArchiveSortId'],
  },
  anySortName: {
    indexType: 'field',
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  anySortNameEn: {
    indexType: 'field',
    indexReference: 'anySortNameEn',
    defaultOrder: 'asc',
  },
  anySortNameFr: {
    indexType: 'field',
    indexReference: 'anySortNameFr',
    defaultOrder: 'asc',
  },
  anySortNameZh: {
    indexType: 'field',
    indexReference: 'anySortNameZh',
    defaultOrder: 'asc',
  },
  eventStartDate: {
    indexType: 'field',
    indexReference: 'eventInitiatedStartDateLong',
    defaultOrder: 'asc',
  },
  eventEndDate: {
    indexType: 'field',
    indexReference: 'eventCompletedStartDateLong',
    defaultOrder: 'asc',
  },
  itemArchiveSortId: {
    indexType: 'field',
    indexReference: 'itemArchiveSortId',
    defaultOrder: 'asc',
  },
  itemDepthDimensionValue: {
    indexType: 'field',
    indexReference: 'itemDepthDimensionValue',
    defaultOrder: 'asc',
  },
  itemDimensionValue: {
    indexType: 'field',
    indexReference: 'itemDimensionValue',
    defaultOrder: 'asc',
  },
  itemHeightDimensionValue: {
    indexType: 'field',
    indexReference: 'itemHeightDimensionValue',
    defaultOrder: 'asc',
  },
  itemEncounteredDate: {
    indexType: 'field',
    indexReference: 'itemEncounteredStartDateLong',
    defaultOrder: 'asc',
  },
  itemProductionDate: {
    indexType: 'field',
    indexReference: 'itemProductionStartDateLong',
    defaultOrder: 'asc',
  },
  itemWidthDimensionValue: {
    indexType: 'field',
    indexReference: 'itemWidthDimensionValue',
    defaultOrder: 'asc',
  },
  workArchiveSortId: {
    indexType: 'field',
    indexReference: 'workArchiveSortId',
    defaultOrder: 'asc',
  },
  workCreationDate: {
    indexType: 'field',
    indexReference: 'workCreationStartDateLong',
    defaultOrder: 'asc',
  },
  workPublicationDate: {
    indexType: 'field',
    indexReference: 'workPublicationStartDateLong',
    defaultOrder: 'asc',
  },
};

export { SORT_BINDINGS };
