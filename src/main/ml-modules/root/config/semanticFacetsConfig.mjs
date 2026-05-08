import { IDENTIFIERS } from '../lib/identifierConstants.mjs';
import op from '/MarkLogic/optic';
import { getPrefixesForSPARQL } from '../lib/search/prefixUtils.mjs';

const SEMANTIC_FACETS_CONFIG = {
  responsibleCollections: {
    plan: op.fromSPARQL(`
      ${getPrefixesForSPARQL()}
      SELECT ?item ?set
      WHERE {
        ?item la:member_of ?set .
        ?set lux:setClassifiedAs <${IDENTIFIERS.collection}> .
      }
    `),
    sourceJoinColName: 'iri',
    facetValueColName: 'set',
    constraintJoinColName: 'item',
    getFacetSelectedCriteria: (baseSearchJsonCriteria, facetValueId) => {
      const criteria = {
        _scope: 'item',
        AND: [
          {
            memberOf: {
              id: facetValueId,
            },
          },
          baseSearchJsonCriteria,
        ],
      };
      return criteria;
    },
  },
  responsibleUnits: {
    plan: op.fromSPARQL(`
      ${getPrefixesForSPARQL()}
      SELECT ?item ?set ?curator ?unit
      WHERE {?item la:member_of ?set .
            ?set lux:agentOfCuration ?curator.
            ?curator crm:P107i_is_current_or_former_member_of ?unit
      }
    `),
    sourceJoinColName: 'iri',
    facetValueColName: 'unit',
    constraintJoinColName: 'item',
    getFacetSelectedCriteria: (baseSearchJsonCriteria, facetValueId) => {
      const criteria = {
        _scope: 'item',
        AND: [
          {
            memberOf: {
              curatedBy: {
                OR: [
                  {
                    memberOf: {
                      id: facetValueId,
                    },
                  },
                  {
                    id: facetValueId,
                  },
                ],
              },
            },
          },
          baseSearchJsonCriteria,
        ],
      };
      return criteria;
    },
  },
};

export { SEMANTIC_FACETS_CONFIG };
