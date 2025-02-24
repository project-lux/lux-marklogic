import op from '/MarkLogic/optic';
const crm = op.prefixer('http://www.cidoc-crm.org/cidoc-crm/');
const la = op.prefixer('https://linked.art/ns/terms/');
const lux = op.prefixer('https://lux.collections.yale.edu/ns/');
const skos = op.prefixer('http://www.w3.org/2004/02/skos/core#');

const SORT_BINDINGS = {
  agentActiveDate: {
    indexType: 'field',
    indexReference: 'agentActiveStartDateLong',
    defaultOrder: 'asc',
  },
  agentClassificationConceptName: {
    predicate: lux('agentClassifiedAs'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  agentEndDate: {
    indexType: 'field',
    indexReference: 'agentDiedStartDateLong',
    defaultOrder: 'asc',
  },
  agentEndPlaceName: {
    predicate: lux('placeOfEnding'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  agentGenderConceptName: {
    predicate: lux('agentGender'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  agentHasDigitalImage: {
    indexType: 'field',
    indexReference: 'agentHasDigitalImageBoolean',
    defaultOrder: 'desc',
  },
  agentOccupationConceptName: {
    predicate: lux('agentOccupation'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  agentNationalityConceptName: {
    predicate: lux('agentNationality'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  agentRecordType: {
    indexType: 'field',
    indexReference: 'agentDataTypeName',
    defaultOrder: 'asc',
  },
  agentStartDate: {
    indexType: 'field',
    indexReference: 'agentBornStartDateLong',
    defaultOrder: 'asc',
  },
  agentStartPlaceName: {
    predicate: lux('placeOfBeginning'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  archiveSortId: {
    subSorts: ['itemArchiveSortId', 'setArchiveSortId'],
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
  conceptClassificationConceptName: {
    predicate: lux('conceptClassifiedAs'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  conceptRecordType: {
    indexType: 'field',
    indexReference: 'conceptDataTypeName',
    defaultOrder: 'asc',
  },
  eventCarriedOutByAgentName: {
    predicate: lux('eventCarriedOutBy'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  eventClassificationConceptName: {
    predicate: lux('eventClassifiedAs'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  eventRecordType: {
    indexType: 'field',
    indexReference: 'eventDataTypeName',
    defaultOrder: 'asc',
  },
  eventTookPlaceAtPlaceName: {
    predicate: lux('eventTookPlaceAt'),
    indexReference: 'anySortName',
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
  itemClassificationConceptName: {
    predicate: lux('itemClassifiedAs'),
    indexReference: 'anySortName',
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
  itemEncounterAgentName: {
    predicate: lux('agentOfEncounter'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  itemEncounterPlaceName: {
    predicate: lux('placeOfEncounter'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  itemEncounteredDate: {
    indexType: 'field',
    indexReference: 'itemEncounteredStartDateLong',
    defaultOrder: 'asc',
  },
  itemHasDigitalImage: {
    indexType: 'field',
    indexReference: 'itemHasDigitalImageBoolean',
    defaultOrder: 'desc',
  },
  itemMaterialConceptName: {
    predicate: crm('P45_consists_of'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  itemProductionAgentName: {
    predicate: lux('agentOfProduction'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  itemProductionInfluencedByAgentName: {
    predicate: lux('agentInfluencedProduction'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  itemProductionPlaceName: {
    predicate: lux('placeOfProduction'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  itemProductionDate: {
    indexType: 'field',
    indexReference: 'itemProductionStartDateLong',
    defaultOrder: 'asc',
  },
  itemRecordType: {
    indexType: 'field',
    indexReference: 'itemDataTypeName',
    defaultOrder: 'asc',
  },
  itemTechniqueConceptName: {
    predicate: lux('techniqueOfProduction'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  itemWidthDimensionValue: {
    indexType: 'field',
    indexReference: 'itemWidthDimensionValue',
    defaultOrder: 'asc',
  },
  placeClassificationConceptName: {
    predicate: lux('placeClassifiedAs'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  placeHasDigitalImage: {
    indexType: 'field',
    indexReference: 'placeHasDigitalImageBoolean',
    defaultOrder: 'desc',
  },
  setArchiveSortId: {
    indexType: 'field',
    indexReference: 'setArchiveSortId',
    defaultOrder: 'asc',
  },
  setCreationAgentName: {
    predicate: lux('agentOfCreation'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  setCreationDate: {
    indexType: 'field',
    indexReference: 'setCreationStartDateLong',
    defaultOrder: 'asc',
  },
  setCurationAgentName: {
    predicate: lux('agentOfCuration'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  setClassificationConceptName: {
    predicate: lux('setClassifiedAs'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  setHasDigitalImage: {
    indexType: 'field',
    indexReference: 'setHasDigitalImageBoolean',
    defaultOrder: 'desc',
  },
  setPublicationDate: {
    indexType: 'field',
    indexReference: 'setPublicationStartDateLong',
    defaultOrder: 'asc',
  },
  setPublicationAgentName: {
    predicate: lux('agentOfPublication'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  setPublicationPlaceName: {
    predicate: lux('placeOfPublication'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  workCreationAgentName: {
    predicate: lux('agentOfCreation'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  workCreationDate: {
    indexType: 'field',
    indexReference: 'workCreationStartDateLong',
    defaultOrder: 'asc',
  },
  workClassificationConceptName: {
    predicate: lux('workClassifiedAs'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  workHasDigitalImage: {
    indexType: 'field',
    indexReference: 'workHasDigitalImageBoolean',
    defaultOrder: 'desc',
  },
  workPublicationDate: {
    indexType: 'field',
    indexReference: 'workPublicationStartDateLong',
    defaultOrder: 'asc',
  },
  workPublicationAgentName: {
    predicate: lux('agentOfPublication'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  workPublicationPlaceName: {
    predicate: lux('placeOfPublication'),
    indexReference: 'anySortName',
    defaultOrder: 'asc',
  },
  workRecordType: {
    indexType: 'field',
    indexReference: 'workDataTypeName',
    defaultOrder: 'asc',
  },
};

export { SORT_BINDINGS };
