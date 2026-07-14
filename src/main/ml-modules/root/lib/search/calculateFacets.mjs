'use strict';

// Facet computation module — owns the three-way dispatch for calculating
// facet values and counts from search results or a CTS query.
//
// Paths:
//   1. CTS + semantic  → enumerate candidates via cts.search, count via cts.estimate
//   2. CTS + non-semantic → op.fromSearch(scopedCtsQuery) + Optic join/groupBy
//   3. No CTS (non-foldable) → op.fromSearch(cts.documentQuery(uriList)) + Optic join/groupBy

import op from '/MarkLogic/optic.mjs';
import { FACETS_CONFIG } from '../../config/facetsConfig.mjs';
import { SEMANTIC_FACETS_CONFIG } from '../../config/semanticFacetsConfig.mjs';
import { isSemanticFacet } from '../facetsLib.mjs';
import { convertSecondsToDateStr } from '../../utils/dateUtils.mjs';
import * as utils from '../../utils/utils.mjs';
import {
  BadRequestError,
  InternalServerError,
  InvalidSearchRequestError,
} from '../errorClasses.mjs';
import { FacetResponses } from './FacetResponses.mjs';

const SEMANTIC_VALUE_LIMIT = 100;

// Main entry point. Called by performSearch in engine.mjs.
//
// When scopedCtsQuery is non-null (join-free accumulator):
//   - Semantic facets use CTS enumerate-and-estimate (Path 1).
//   - Non-semantic facets use op.fromSearch(scopedCtsQuery) (Path 2).
// When scopedCtsQuery is null (non-foldable query):
//   - All facets use op.fromSearch(cts.documentQuery(uriList)) (Path 3).
//   - rows must be non-null.
function calculateFacets(
  rows,
  facetRequests,
  scopedCtsQuery = null,
  scopedCtsQueryEstimate = null,
  testDispatchLogic = false,
) {
  if (facetRequests == null || facetRequests.length === 0) {
    return null;
  }

  const requests = facetRequests.getFacetRequests();
  if (!utils.isNonEmptyArray(requests)) {
    return _buildEmptyFacetResponses([]);
  }

  // Use the estimate when provided, but do not call cts.estimate here when
  // absent; forcing an estimate in this layer can impose a performance
  // penalty for some query shapes.
  if (scopedCtsQuery && scopedCtsQueryEstimate === 0) {
    return _buildEmptyFacetResponses(requests);
  }

  const page = facetRequests.getPage() ?? 1;
  const pageLength = facetRequests.getPageLength() ?? 20;
  const start = (page - 1) * pageLength;
  const end = page * pageLength;

  let docsPlan = null;
  if (!scopedCtsQuery) {
    const uriList = Array.isArray(rows) ? rows.map((row) => row.id) : [];
    if (uriList.length === 0) {
      return _buildEmptyFacetResponses(requests);
    }
    docsPlan = op.fromSearch(cts.documentQuery(uriList));
  }

  const facets = {};
  requests.forEach((request) => {
    const facetName = request?.name;
    const isSemantic = isSemanticFacet(facetName);
    let dispatchPath;

    if (isSemantic && scopedCtsQuery) {
      // Path 1: CTS enumerate + estimate.
      facets[facetName] = testDispatchLogic
        ? 'semanticFacetViaCts'
        : _calculateSemanticFacetViaCts(facetName, scopedCtsQuery, start, end);
    } else if (!isSemantic && scopedCtsQuery) {
      // Path 2: cts.fieldValues
      facets[facetName] = testDispatchLogic
        ? 'nonSemanticFacetViaCts'
        : _calculateNonSemanticFacetViaCts(
            facetName,
            scopedCtsQuery,
            page,
            pageLength,
            request?.sort,
          );
    } else {
      // Path 3: Full materialization of search results given to Optic.
      facets[facetName] = testDispatchLogic
        ? 'facetViaOptic'
        : _calculateFacetViaOptic(facetName, docsPlan, request, start, end);
    }
  });

  return new FacetResponses(facets);
}

// Path 1: CTS-native semantic facet computation.
// Enumerates candidate facet values via cts.search (search-independent),
// then counts per candidate via cts.estimate (pure index intersection).
function _calculateSemanticFacetViaCts(facetName, scopedCtsQuery, start, end) {
  const semanticConfig = _getValidatedSemanticFacetConfig(facetName);

  if (typeof semanticConfig.potentialFacetValuesCtsQuery !== 'function') {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: missing 'potentialFacetValuesCtsQuery' function (required for CTS path).`,
    );
  }
  if (typeof semanticConfig.getValuesCountCtsQuery !== 'function') {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: missing 'getValuesCountCtsQuery' function (required for CTS path).`,
    );
  }

  const potentialFacetValues = fn
    .subsequence(
      cts.search(semanticConfig.potentialFacetValuesCtsQuery(), [
        'unfiltered',
        'unfaceted',
        'score-zero',
      ]),
      1,
      SEMANTIC_VALUE_LIMIT + 1,
    )
    .toArray();

  if (potentialFacetValues.length > SEMANTIC_VALUE_LIMIT) {
    console.warn(
      `The '${facetName}' semantic facet exceeded the ${SEMANTIC_VALUE_LIMIT} value limit.`,
    );
    potentialFacetValues.length = SEMANTIC_VALUE_LIMIT;
  }

  const facetValues = potentialFacetValues
    .map((doc) => {
      const uri = doc.baseURI;
      return {
        value: uri,
        count: cts.estimate(
          semanticConfig.getValuesCountCtsQuery(scopedCtsQuery, uri),
        ),
      };
    })
    .filter((result) => result.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    totalItems: facetValues.length,
    facetValues: facetValues.slice(start, end),
  };
}

// Path 2: CTS-native non-semantic facet computation.
function _calculateNonSemanticFacetViaCts(
  facetName,
  scopedCtsQuery,
  page,
  pageLength,
  sort,
) {
  // Require search criteria.
  if (!scopedCtsQuery) {
    throw new BadRequestError(`The facet request requires search criteria.`);
  }

  const fieldValuesOptions = ['lazy', 'score-zero'];
  switch (sort) {
    case 'asc':
      fieldValuesOptions.push('ascending');
      break;
    case 'desc':
      fieldValuesOptions.push('descending');
      break;
    default:
      fieldValuesOptions.push('frequency-order');
  }

  const facetConfig = FACETS_CONFIG[facetName];
  const sequence = cts.fieldValues(
    facetConfig.indexReference,
    null,
    fieldValuesOptions,
    scopedCtsQuery,
  );

  const isDateFacet = facetName.endsWith('Date');
  return {
    totalItems: fn.count(sequence),
    facetValues: fn
      .subsequence(
        sequence,
        utils.getStartingPaginationIndexForSubsequence(page, pageLength),
        pageLength,
      )
      .toArray()
      .map((value) => ({
        value: isDateFacet ? convertSecondsToDateStr(value) : value,
        count: cts.frequency(value),
      })),
  };
}

// Path 3: Optic-based facet computation (semantic and non-semantic).
function _calculateFacetViaOptic(facetName, docsPlan, request, start, end) {
  let facetSourcePlan = docsPlan;

  let constraintPlan;
  let joinOn;
  let facetValueColName = 'value';
  let countColName = 'uri';

  if (isSemanticFacet(facetName)) {
    const semanticConfig = _getValidatedSemanticFacetConfig(facetName);
    facetValueColName = semanticConfig.facetValueColName;
    countColName = semanticConfig.constraintJoinColName;
    const sourceJoinColName = semanticConfig.sourceJoinColName;

    if (sourceJoinColName === 'iri') {
      facetSourcePlan = facetSourcePlan.joinInner(
        op.fromLexicons(
          { iri: cts.iriReference() },
          null,
          op.fragmentIdCol('iriFragId'),
        ),
        op.on('fragmentId', 'iriFragId'),
      );
    }

    // Projection barrier helps avoid optimizer paths that can collapse
    // certain semantic joins to zero rows.
    facetSourcePlan = facetSourcePlan.select([sourceJoinColName]);

    constraintPlan = semanticConfig.plan;
    joinOn = op.on(sourceJoinColName, countColName);
  } else {
    const indexReference = FACETS_CONFIG[facetName].indexReference;
    if (!utils.isNonEmptyString(indexReference)) {
      throw new InvalidSearchRequestError(
        `The '${facetName}' facet is not currently supported for this operation.`,
      );
    }

    constraintPlan = op.fromLexicons(
      {
        [facetValueColName]: cts.fieldReference(indexReference),
        [countColName]: cts.uriReference(),
      },
      null,
      op.fragmentIdCol('lexFragId'),
    );
    joinOn = op.on('fragmentId', 'lexFragId');
  }

  const isDateFacet = facetName.endsWith('Date');
  const sort = request?.sort;
  const rows = facetSourcePlan
    .joinInner(constraintPlan, joinOn)
    // The first groupBy ensures each facet value is only counted once per doc.
    .groupBy([op.col(countColName), op.col(facetValueColName)])
    .groupBy(op.col(facetValueColName), op.count('count', countColName))
    .orderBy(
      sort === 'desc'
        ? op.desc(facetValueColName)
        : sort === 'asc'
          ? op.asc(facetValueColName)
          : op.desc('count'),
    )
    .result()
    .toArray();

  return {
    totalItems: rows.length,
    facetValues: rows.slice(start, end).map((row) => {
      const rawValue = row[facetValueColName];
      return {
        value: isDateFacet ? convertSecondsToDateStr(rawValue) : rawValue,
        count: row.count,
      };
    }),
  };
}

function _getValidatedSemanticFacetConfig(facetName) {
  const semanticConfig = SEMANTIC_FACETS_CONFIG[facetName];
  const sourceJoinColName = semanticConfig?.sourceJoinColName;
  const constraintJoinColName = semanticConfig?.constraintJoinColName;

  if (!utils.isNonEmptyString(sourceJoinColName)) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: missing required 'sourceJoinColName'.`,
    );
  }
  if (!utils.isNonEmptyString(constraintJoinColName)) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: missing required 'constraintJoinColName'.`,
    );
  }

  const planValue = semanticConfig?.plan;
  const validPlanType =
    typeof planValue?.result === 'function' &&
    typeof planValue?.export === 'function';
  if (!validPlanType) {
    throw new InternalServerError(
      `Semantic facet '${facetName}' is misconfigured: 'plan' is required and must be an Optic plan.`,
    );
  }

  return {
    ...semanticConfig,
    sourceJoinColName,
    constraintJoinColName,
  };
}

function _buildEmptyFacetResponses(requests) {
  const facets = {};
  requests.forEach((request) => {
    const facetName = request?.name;
    facets[facetName] = {
      totalItems: 0,
      facetValues: [],
    };
  });
  return new FacetResponses(facets);
}

export { calculateFacets };
