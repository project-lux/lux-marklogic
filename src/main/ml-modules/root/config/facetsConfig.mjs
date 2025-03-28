// These are all the non-semantic facets.
const FACETS_CONFIG = {
  agentActiveDate: { indexReferences: ['agentActiveStartDateLong'] },
  agentActivePlaceId: {
    indexReferences: ['agentActivePlaceId'],
    searchTermName: 'activeAtId',
  },
  agentEndDate: { indexReferences: ['agentDiedStartDateLong'] },
  agentEndPlaceId: {
    indexReferences: ['agentEndPlaceId'],
    searchTermName: 'endAtId',
  },
  agentGenderId: { indexReferences: ['agentGenderId'] },
  agentHasDigitalImage: { indexReferences: ['agentHasDigitalImageBoolean'] },
  agentIdentifier: { indexReferences: ['agentIdentifier'] },
  agentMemberOfId: { indexReferences: ['agentMemberOfId'] },
  agentNationalityId: { indexReferences: ['agentNationalityId'] },
  agentOccupationId: { indexReferences: ['agentOccupationId'] },
  agentProfessionalActivityId: {
    indexReferences: ['agentProfessionalActivityId'],
  },
  agentRecordType: { indexReferences: ['agentDataTypeName'] },
  agentStartDate: { indexReferences: ['agentBornStartDateLong'] },
  agentStartPlaceId: {
    indexReferences: ['agentStartPlaceId'],
    searchTermName: 'startAtId',
  },
  agentTypeId: {
    indexReferences: ['agentTypeId'],
    searchTermName: 'classificationId',
  },
  conceptHasDigitalImage: {
    indexReferences: ['conceptHasDigitalImageBoolean'],
  },
  conceptIdentifier: { indexReferences: ['conceptIdentifier'] },
  conceptInfluencedByAgentId: {
    indexReferences: ['conceptInfluencedByAgentId'],
  },
  conceptInfluencedByConceptId: {
    indexReferences: ['conceptInfluencedByConceptId'],
  },
  conceptInfluencedByEventId: {
    indexReferences: ['conceptInfluencedByEventId'],
  },
  conceptInfluencedByPlaceId: {
    indexReferences: ['conceptInfluencedByPlaceId'],
  },
  conceptPartOfId: {
    indexReferences: ['conceptPartOfId'],
    searchTermName: 'broaderId',
  },
  conceptRecordType: { indexReferences: ['conceptDataTypeName'] },
  conceptTypeId: {
    indexReferences: ['conceptTypeId'],
    searchTermName: 'classificationId',
  },
  eventAgentId: {
    indexReferences: ['eventAgentId'],
    searchTermName: 'carriedOutById',
  },
  eventRecordType: { indexReferences: ['eventDataTypeName'] },
  eventStartDate: { indexReferences: ['eventInitiatedStartDateLong'] },
  eventEndDate: { indexReferences: ['eventCompletedStartDateLong'] },
  eventIdentifier: { indexReferences: ['eventIdentifier'] },
  eventPlaceId: {
    indexReferences: ['eventPlaceId'],
    searchTermName: 'tookPlaceAtId',
  },
  eventTypeId: {
    indexReferences: ['eventTypeId'],
    searchTermName: 'classificationId',
  },
  itemCarriedById: {
    indexReferences: ['itemCarriedById'],
    searchTermName: 'carriesId',
  },
  itemDepthDimensionValue: {
    indexReferences: ['itemDepthDimensionValue'],
    searchTermName: 'depth',
  },
  itemDimensionValue: {
    indexReferences: ['itemDimensionValue'],
    searchTermName: 'dimension',
  },
  itemEncounteredAgentId: {
    indexReferences: ['itemEncounteredAgentId'],
    searchTermName: 'encounteredById',
  },
  itemEncounteredDate: {
    indexReferences: ['itemEncounteredStartDateLong'],
    searchTermName: 'encounteredDate',
  },
  itemEncounteredPlaceId: {
    indexReferences: ['itemEncounteredPlaceId'],
    searchTermName: 'encounteredAtId',
  },
  itemHasDigitalImage: { indexReferences: ['itemHasDigitalImageBoolean'] },
  itemHeightDimensionValue: {
    indexReferences: ['itemHeightDimensionValue'],
    searchTermName: 'height',
  },
  itemIsOnline: { indexReferences: ['itemIsOnlineBoolean'] },
  itemIdentifier: { indexReferences: ['itemIdentifier'] },
  itemMaterialId: { indexReferences: ['itemMaterialId'] },
  itemMemberOfId: { indexReferences: ['itemMemberOfId'] },
  itemProductionAgentId: {
    indexReferences: ['itemProductionAgentId'],
    searchTermName: 'producedById',
  },
  itemProductionDate: {
    indexReferences: ['itemProductionStartDateLong'],
    searchTermName: 'producedDate',
  },
  itemProductionPlaceId: {
    indexReferences: ['itemProductionPlaceId'],
    searchTermName: 'producedAtId',
  },
  itemProductionTechniqueId: {
    indexReferences: ['itemProductionTechniqueId'],
    searchTermName: 'producedUsing',
  },
  itemRecordType: { indexReferences: ['itemDataTypeName'] },
  itemShownById: {
    indexReferences: ['itemShownById'],
    searchTermName: 'carriesId',
  },
  itemTypeId: {
    indexReferences: ['itemTypeId'],
    searchTermName: 'classificationId',
  },
  itemWidthDimensionValue: {
    indexReferences: ['itemWidthDimensionValue'],
    searchTermName: 'width',
  },
  placeHasDigitalImage: { indexReferences: ['placeHasDigitalImageBoolean'] },
  placeIdentifier: { indexReferences: ['placeIdentifier'] },
  placePartOfId: { indexReferences: ['placePartOfId'] },
  placeTypeId: {
    indexReferences: ['placeTypeId'],
    searchTermName: 'classificationId',
  },
  setAboutAgentId: { indexReferences: ['setAboutAgentId'] },
  setAboutConceptId: { indexReferences: ['setAboutConceptId'] },
  setAboutEventId: { indexReferences: ['setAboutEventId'] },
  setAboutItemId: { indexReferences: ['setAboutItemId'] },
  setAboutPlaceId: { indexReferences: ['setAboutPlaceId'] },
  setAboutSetId: { indexReferences: ['setAboutSetId'] },
  setAboutWorkId: { indexReferences: ['setAboutWorkId'] },
  setCreationAgentId: {
    indexReferences: ['setCreationAgentId'],
    searchTermName: 'createdById',
  },
  setCreationDate: {
    indexReferences: ['setCreationStartDateLong'],
    searchTermName: 'createdDate',
  },
  setCreationPlaceId: {
    indexReferences: ['setCreationPlaceId'],
    searchTermName: 'createdAtId',
  },
  setCurationAgentId: { indexReferences: ['setCurationAgentId'] },
  setHasDigitalImage: { indexReferences: ['setHasDigitalImageBoolean'] },
  setIdentifier: { indexReferences: ['setIdentifier'] },
  setIsOnline: { indexReferences: ['setIsOnlineBoolean'] },
  setPartOfId: { indexReferences: ['setPartOfId'] },
  setPublicationAgentId: {
    indexReferences: ['setPublicationAgentId'],
    searchTermName: 'publishedById',
  },
  setPublicationDate: {
    indexReferences: ['setPublicationStartDateLong'],
    searchTermName: 'publishedDate',
  },
  setPublicationPlaceId: {
    indexReferences: ['setPublicationPlaceId'],
    searchTermName: 'publishedAtId',
  },
  setTypeId: {
    indexReferences: ['setTypeId'],
    searchTermName: 'classificationId',
  },
  workAboutAgentId: { indexReferences: ['workAboutAgentId'] },
  workAboutConceptId: { indexReferences: ['workAboutConceptId'] },
  workAboutEventId: { indexReferences: ['workAboutEventId'] },
  workAboutItemId: { indexReferences: ['workAboutItemId'] },
  workAboutPlaceId: { indexReferences: ['workAboutPlaceId'] },
  workAboutSetId: { indexReferences: ['workAboutSetId'] },
  workAboutWorkId: { indexReferences: ['workAboutWorkId'] },
  workCreationAgentId: {
    indexReferences: ['workCreationAgentId'],
    searchTermName: 'createdById',
  },
  workCreationDate: {
    indexReferences: ['workCreationStartDateLong'],
    searchTermName: 'createdDate',
  },
  workCreationPlaceId: {
    indexReferences: ['workCreationPlaceId'],
    searchTermName: 'createdAtId',
  },
  workHasDigitalImage: { indexReferences: ['workHasDigitalImageBoolean'] },
  workIdentifier: { indexReferences: ['workIdentifier'] },
  workIsOnline: { indexReferences: ['workIsOnlineBoolean'] },
  workLanguageId: { indexReferences: ['workLanguageId'] },
  workPartOfId: { indexReferences: ['workPartOfId'] },
  workPublicationAgentId: {
    indexReferences: ['workPublicationAgentId'],
    searchTermName: 'publishedById',
  },
  workCreationAndPublicationDate: {
    indexReferences: [
      'workCreationStartDateLong',
      'workPublicationStartDateLong',
    ],
  },
  workPublicationDate: {
    indexReferences: ['workPublicationStartDateLong'],
    searchTermName: 'publishedDate',
  },
  workPublicationPlaceId: {
    indexReferences: ['workPublicationPlaceId'],
    searchTermName: 'publishedAtId',
  },
  workRecordType: { indexReferences: ['workDataTypeName'] },
  workTypeId: {
    indexReferences: ['workTypeId'],
    searchTermName: 'classificationId',
  },
};

export { FACETS_CONFIG };
