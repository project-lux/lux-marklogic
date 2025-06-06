// These are all the non-semantic facets.
const FACETS_CONFIG = {
  agentActiveDate: { indexReference: 'agentActiveStartDateLong' },
  agentActivePlaceId: {
    indexReference: 'agentActivePlaceId',
    searchTermName: 'activeAtId',
  },
  agentEndDate: { indexReference: 'agentDiedStartDateLong' },
  agentEndPlaceId: {
    indexReference: 'agentEndPlaceId',
    searchTermName: 'endAtId',
  },
  agentGenderId: { indexReference: 'agentGenderId' },
  agentHasDigitalImage: { indexReference: 'agentHasDigitalImageBoolean' },
  agentIdentifier: { indexReference: 'agentIdentifier' },
  agentMemberOfId: { indexReference: 'agentMemberOfId' },
  agentNationalityId: { indexReference: 'agentNationalityId' },
  agentOccupationId: { indexReference: 'agentOccupationId' },
  agentProfessionalActivityId: {
    indexReference: 'agentProfessionalActivityId',
  },
  agentRecordType: { indexReference: 'agentDataTypeName' },
  agentStartDate: { indexReference: 'agentBornStartDateLong' },
  agentStartPlaceId: {
    indexReference: 'agentStartPlaceId',
    searchTermName: 'startAtId',
  },
  agentTypeId: {
    indexReference: 'agentTypeId',
    searchTermName: 'classificationId',
  },
  conceptHasDigitalImage: { indexReference: 'conceptHasDigitalImageBoolean' },
  conceptIdentifier: { indexReference: 'conceptIdentifier' },
  conceptInfluencedByAgentId: { indexReference: 'conceptInfluencedByAgentId' },
  conceptInfluencedByConceptId: {
    indexReference: 'conceptInfluencedByConceptId',
  },
  conceptInfluencedByEventId: { indexReference: 'conceptInfluencedByEventId' },
  conceptInfluencedByPlaceId: { indexReference: 'conceptInfluencedByPlaceId' },
  conceptPartOfId: {
    indexReference: 'conceptPartOfId',
    searchTermName: 'broaderId',
  },
  conceptRecordType: { indexReference: 'conceptDataTypeName' },
  conceptTypeId: {
    indexReference: 'conceptTypeId',
    searchTermName: 'classificationId',
  },
  eventAgentId: {
    indexReference: 'eventAgentId',
    searchTermName: 'carriedOutById',
  },
  eventRecordType: { indexReference: 'eventDataTypeName' },
  eventStartDate: { indexReference: 'eventInitiatedStartDateLong' },
  eventEndDate: { indexReference: 'eventCompletedStartDateLong' },
  eventIdentifier: { indexReference: 'eventIdentifier' },
  eventPlaceId: {
    indexReference: 'eventPlaceId',
    searchTermName: 'tookPlaceAtId',
  },
  eventTypeId: {
    indexReference: 'eventTypeId',
    searchTermName: 'classificationId',
  },
  itemCarriedById: {
    indexReference: 'itemCarriedById',
    searchTermName: 'carriesId',
  },
  itemDepthDimensionValue: {
    indexReference: 'itemDepthDimensionValue',
    searchTermName: 'depth',
  },
  itemDimensionValue: {
    indexReference: 'itemDimensionValue',
    searchTermName: 'dimension',
  },
  itemEncounteredAgentId: {
    indexReference: 'itemEncounteredAgentId',
    searchTermName: 'encounteredById',
  },
  itemEncounteredDate: {
    indexReference: 'itemEncounteredStartDateLong',
    searchTermName: 'encounteredDate',
  },
  itemEncounteredPlaceId: {
    indexReference: 'itemEncounteredPlaceId',
    searchTermName: 'encounteredAtId',
  },
  itemHasDigitalImage: { indexReference: 'itemHasDigitalImageBoolean' },
  itemHeightDimensionValue: {
    indexReference: 'itemHeightDimensionValue',
    searchTermName: 'height',
  },
  itemIsOnline: { indexReference: 'itemIsOnlineBoolean' },
  itemIdentifier: { indexReference: 'itemIdentifier' },
  itemMaterialId: { indexReference: 'itemMaterialId' },
  itemMemberOfId: { indexReference: 'itemMemberOfId' },
  itemProductionAgentId: {
    indexReference: 'itemProductionAgentId',
    searchTermName: 'producedById',
  },
  itemProductionDate: {
    indexReference: 'itemProductionStartDateLong',
    searchTermName: 'producedDate',
  },
  itemProductionPlaceId: {
    indexReference: 'itemProductionPlaceId',
    searchTermName: 'producedAtId',
  },
  itemProductionTechniqueId: {
    indexReference: 'itemProductionTechniqueId',
    searchTermName: 'producedUsing',
  },
  itemRecordType: { indexReference: 'itemDataTypeName' },
  itemShownById: {
    indexReference: 'itemShownById',
    searchTermName: 'carriesId',
  },
  itemTypeId: {
    indexReference: 'itemTypeId',
    searchTermName: 'classificationId',
  },
  itemWidthDimensionValue: {
    indexReference: 'itemWidthDimensionValue',
    searchTermName: 'width',
  },
  placeHasDigitalImage: { indexReference: 'placeHasDigitalImageBoolean' },
  placeIdentifier: { indexReference: 'placeIdentifier' },
  placePartOfId: { indexReference: 'placePartOfId' },
  placeTypeId: {
    indexReference: 'placeTypeId',
    searchTermName: 'classificationId',
  },
  setAboutAgentId: { indexReference: 'setAboutAgentId' },
  setAboutConceptId: { indexReference: 'setAboutConceptId' },
  setAboutEventId: { indexReference: 'setAboutEventId' },
  setAboutItemId: { indexReference: 'setAboutItemId' },
  setAboutPlaceId: { indexReference: 'setAboutPlaceId' },
  setAboutSetId: { indexReference: 'setAboutSetId' },
  setAboutWorkId: { indexReference: 'setAboutWorkId' },
  setCreationAgentId: {
    indexReference: 'setCreationAgentId',
    searchTermName: 'createdById',
  },
  setCreationDate: {
    indexReference: 'setCreationStartDateLong',
    searchTermName: 'createdDate',
  },
  setCreationOrPublicationDate: {
    subFacets: ['setCreationDate', 'setPublicationDate'],
  },
  setCreationPlaceId: {
    indexReference: 'setCreationPlaceId',
    searchTermName: 'createdAtId',
  },
  setCurationAgentId: { indexReference: 'setCurationAgentId' },
  setHasDigitalImage: { indexReference: 'setHasDigitalImageBoolean' },
  setIdentifier: { indexReference: 'setIdentifier' },
  setIsOnline: { indexReference: 'setIsOnlineBoolean' },
  setPartOfId: { indexReference: 'setPartOfId' },
  setPublicationAgentId: {
    indexReference: 'setPublicationAgentId',
    searchTermName: 'publishedById',
  },
  setPublicationDate: {
    indexReference: 'setPublicationStartDateLong',
    searchTermName: 'publishedDate',
  },
  setPublicationPlaceId: {
    indexReference: 'setPublicationPlaceId',
    searchTermName: 'publishedAtId',
  },
  setTypeId: {
    indexReference: 'setTypeId',
    searchTermName: 'classificationId',
  },
  workAboutAgentId: { indexReference: 'workAboutAgentId' },
  workAboutConceptId: { indexReference: 'workAboutConceptId' },
  workAboutEventId: { indexReference: 'workAboutEventId' },
  workAboutItemId: { indexReference: 'workAboutItemId' },
  workAboutPlaceId: { indexReference: 'workAboutPlaceId' },
  workAboutSetId: { indexReference: 'workAboutSetId' },
  workAboutWorkId: { indexReference: 'workAboutWorkId' },
  workCreationAgentId: {
    indexReference: 'workCreationAgentId',
    searchTermName: 'createdById',
  },
  workCreationDate: {
    indexReference: 'workCreationStartDateLong',
    searchTermName: 'createdDate',
  },
  workCreationOrPublicationDate: {
    subFacets: ['workCreationDate', 'workPublicationDate'],
  },
  workCreationPlaceId: {
    indexReference: 'workCreationPlaceId',
    searchTermName: 'createdAtId',
  },
  workHasDigitalImage: { indexReference: 'workHasDigitalImageBoolean' },
  workIdentifier: { indexReference: 'workIdentifier' },
  workIsOnline: { indexReference: 'workIsOnlineBoolean' },
  workLanguageId: { indexReference: 'workLanguageId' },
  workPartOfId: { indexReference: 'workPartOfId' },
  workPublicationAgentId: {
    indexReference: 'workPublicationAgentId',
    searchTermName: 'publishedById',
  },
  workPublicationDate: {
    indexReference: 'workPublicationStartDateLong',
    searchTermName: 'publishedDate',
  },
  workPublicationPlaceId: {
    indexReference: 'workPublicationPlaceId',
    searchTermName: 'publishedAtId',
  },
  workRecordType: { indexReference: 'workDataTypeName' },
  workTypeId: {
    indexReference: 'workTypeId',
    searchTermName: 'classificationId',
  },
};

export { FACETS_CONFIG };
