const SORT_BINDINGS = {
  agentActiveDate: {
    indexType: 'field',
    indexReference: 'agentActiveStartDateFloat',
    defaultOrder: 'asc',
  },
  agentEndDate: {
    indexType: 'field',
    indexReference: 'agentDiedStartDateFloat',
    defaultOrder: 'asc',
  },
  agentStartDate: {
    indexType: 'field',
    indexReference: 'agentBornStartDateFloat',
    defaultOrder: 'asc',
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
    indexReference: 'eventInitiatedStartDateFloat',
    defaultOrder: 'asc',
  },
  eventEndDate: {
    indexType: 'field',
    indexReference: 'eventCompletedStartDateFloat',
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
    indexReference: 'itemEncounteredStartDateFloat',
    defaultOrder: 'asc',
  },
  itemProductionDate: {
    indexType: 'field',
    indexReference: 'itemProductionStartDateFloat',
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
    indexReference: 'workCreationStartDateFloat',
    defaultOrder: 'asc',
  },
  workPublicationDate: {
    indexType: 'field',
    indexReference: 'workPublicationStartDateFloat',
    defaultOrder: 'asc',
  },
};

export { SORT_BINDINGS };
