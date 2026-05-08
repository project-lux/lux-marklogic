import { IDENTIFIERS } from '../lib/identifierConstants.mjs';
import op from '/MarkLogic/optic';
import {
  expandPredicate,
  getPrefixesForSPARQL,
} from '../lib/search/prefixUtils.mjs';

const SEMANTIC_FACETS_CONFIG = {
  responsibleCollections: {
    plan: op
      .fromSearch(
        cts.andQuery(
          [
            cts.jsonPropertyValueQuery('dataType', 'Set', ['exact'], 1),
            // IDENTIFIERS.collection resolves against /json[type='Set']/classified_as/equivalent/id,
            // which we do not have a more targetted index for.
            cts.jsonPropertyValueQuery(
              'id',
              IDENTIFIERS.collection,
              ['exact'],
              1,
            ),
          ],
          null,
        ),
      )
      .joinInner(
        op.fromLexicons(
          { setIri: cts.iriReference() },
          null,
          op.fragmentIdCol('setFragId'),
        ),
        op.on('fragmentId', 'setFragId'),
      )
      .joinInner(
        op.fromTriples([
          op.pattern(
            op.col('item'),
            expandPredicate('la:member_of'),
            op.col('set'),
          ),
        ]),
        op.on('setIri', 'set'),
      ),
    sourceJoinColName: 'iri',
    constraintJoinColName: 'item',
    facetValueColName: 'set',
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
    constraintJoinColName: 'item',
    facetValueColName: 'unit',
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
