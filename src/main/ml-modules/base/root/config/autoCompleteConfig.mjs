import * as utils from '../utils/utils.mjs';

const AUTO_COMPLETE_CONFIG = {
  agent: {
    activeAt: {
      namesIndexReference: 'placePrimaryName',
      idsIndexReferences: ['agentActivePlaceId'],
    },
    classification: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['agentTypeId'],
    },
    endAt: {
      namesIndexReference: 'placePrimaryName',
      idsIndexReferences: ['agentEndPlaceId'],
    },
    gender: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['agentGenderId'],
    },
    memberOf: {
      namesIndexReference: 'agentPrimaryName',
      idsIndexReferences: ['agentMemberOfId'],
    },
    nationality: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['agentNationalityId'],
    },
    occupation: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['agentOccupationId'],
    },
    startAt: {
      namesIndexReference: 'placePrimaryName',
      idsIndexReferences: ['agentStartPlaceId'],
    },
  },
  concept: {
    classification: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['conceptTypeId'],
    },
    influencedByAgent: {
      namesIndexReference: 'agentPrimaryName',
      idsIndexReferences: ['conceptInfluencedByAgentId'],
    },
    influencedByConcept: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['conceptInfluencedByConceptId'],
    },
    influencedByEvent: {
      namesIndexReference: 'eventPrimaryName',
      idsIndexReferences: ['conceptInfluencedByEventId'],
    },
    influencedByPlace: {
      namesIndexReference: 'placePrimaryName',
      idsIndexReferences: ['conceptInfluencedByPlaceId'],
    },
  },
  event: {
    carriedOutBy: {
      namesIndexReference: 'agentPrimaryName',
      idsIndexReferences: ['eventAgentId'],
    },
    classification: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['eventTypeId'],
    },
    tookPlaceAt: {
      namesIndexReference: 'placePrimaryName',
      idsIndexReferences: ['eventPlaceId'],
    },
  },
  item: {
    classification: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['itemTypeId'],
    },
    material: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['itemMaterialId'],
    },
    producedBy: {
      namesIndexReference: 'agentPrimaryName',
      idsIndexReferences: ['itemProductionAgentId'],
    },
    productionTechnique: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['itemProductionTechniqueId'],
    },
  },
  work: {
    classification: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['workTypeId'],
    },
    language: {
      namesIndexReference: 'conceptPrimaryName',
      idsIndexReferences: ['workLanguageId'],
    },
    publishedAt: {
      namesIndexReference: 'placePrimaryName',
      idsIndexReferences: ['workPublicationPlaceId'],
    },
    publishedBy: {
      namesIndexReference: 'agentPrimaryName',
      idsIndexReferences: ['workPublicationAgentId'],
    },
  },
};

function getConfigurationByContext(context) {
  if (utils.isNonEmptyString(context)) {
    const [scopeName, termName] = context.split('.');
    if (AUTO_COMPLETE_CONFIG[scopeName]) {
      return AUTO_COMPLETE_CONFIG[scopeName][termName];
    }
  }
  return null;
}

// Get the auto complete endpoint's context parameter value for the given scope and term names.
// Null is returned when auto complete is not configured for the pair.
function getContextParameterValue(scopeName, termName) {
  if (
    AUTO_COMPLETE_CONFIG[scopeName] &&
    AUTO_COMPLETE_CONFIG[scopeName][termName]
  ) {
    return `${scopeName}.${termName}`;
  }
  return null;
}

function getContextParameterValues() {
  const values = [];
  Object.keys(AUTO_COMPLETE_CONFIG).forEach((scopeName) => {
    Object.keys(AUTO_COMPLETE_CONFIG[scopeName]).forEach((termName) => {
      values.push(`${scopeName}.${termName}`);
    });
  });
  return values;
}

export {
  AUTO_COMPLETE_CONFIG,
  getConfigurationByContext,
  getContextParameterValue,
  getContextParameterValues,
};
