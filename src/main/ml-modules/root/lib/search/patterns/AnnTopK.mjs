import op from '/MarkLogic/optic.mjs';
import { InvalidSearchRequestError } from '../../errorClasses.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';
import { getSearchScopeTypes } from '../../searchScope.mjs';

// Match with src/main/ml-schemas/tde/vectors.json
const SCHEMA_NAME = 'lux';
const VIEW_NAME = 'vectors';

// Inflate candidateK to compensate for post-filter attrition. Vectors cluster
// heavily by type (benchmarked at 100% same-type for top 500 of a DigitalObject
// seed), so a small buffer suffices for same-scope seeds. Cross-scope seeds may
// need more, but the maxDistance cap provides a safety net.
const CANDIDATE_K_MULTIPLIER = 1.2;
const CANDIDATE_K_BUFFER = 10;

class AnnTopK extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    const id = searchTerm.getId();
    const name = searchTerm.getName();
    const termValue = searchTerm.getValue();
    const vecFrag = id + '_vecFrag';
    const distCol = id + '_distance';
    const vectorColumn = searchTerm.getVectorColumn();
    const maxDistance = searchTerm.getVectorDistance();
    const k = searchTerm.getAnnK();
    const scopeName = searchTerm.getScopeName();

    // Require the seed document have the specified vector.
    if (!fn.docAvailable(termValue)) {
      throw new InvalidSearchRequestError(
        `Document specified by search term ${name} is not available: ${termValue}`,
      );
    }
    const vectorData = cts
      .doc(termValue)
      .xpath(`vectors/${vectorColumn}`)
      .toArray();
    if (!vectorData || vectorData.length === 0) {
      throw new InvalidSearchRequestError(
        `Document specified by search term ${name} is missing vector data for column '${vectorColumn}': ${termValue}`,
      );
    }
    const queryVector = vec.vector(vectorData);

    // Opt 22: Run annTopK without pre-filters to use the HNSW index
    // (indexed="true"). Pre-filters pushed inside plan:template-view force
    // brute-force kNN (indexed="false") — 800× slower on 20M vectors.
    // Scope and self-exclusion are applied as post-filters after annTopK.
    const candidateK = Math.ceil(
      Math.max(k * CANDIDATE_K_MULTIPLIER, k + CANDIDATE_K_BUFFER),
    );

    let annPlan = op
      .fromView(SCHEMA_NAME, VIEW_NAME, id, op.fragmentIdCol(vecFrag))
      .annTopK(candidateK, op.col(vectorColumn), queryVector, op.col(distCol), {
        distance: 'cosine',
        maxDistance,
        searchFactor: 1,
      });

    // Post-filter: scope constraint.
    annPlan = annPlan.where(
      op.in(op.viewCol(id, 'dataType'), getSearchScopeTypes(scopeName)),
    );

    // Post-filter: exclude the seed document for single similarity queries.
    if (logicType !== 'or') {
      annPlan = annPlan.where(op.ne(op.col('uri'), termValue));
    }

    annPlan = annPlan.select([
      op.as(id + '_vectorUri', op.col('uri')),
      op.fragmentIdCol(vecFrag),
      distCol,
    ]);

    return {
      patternJoins: [
        {
          right: annPlan,
          on: op.on(
            op.fragmentIdCol(searchTerm.getParentFragmentColumn()),
            op.fragmentIdCol(vecFrag),
          ),
          extraCols: [distCol],
          // Opt 20 extension: signal that this join's plan is self-sufficient
          // (provides uri + dataType from the TDE view). When annTopK is the
          // sole criterion, the engine can skip fromLexicons entirely.
          annTopKSelfSufficient: true,
          annTopKPlanForDirect: this.#buildDirectPlan({
            id,
            vecFrag,
            distCol,
            vectorColumn,
            queryVector,
            maxDistance,
            k,
            candidateK,
            scopeName,
            termValue,
            logicType,
          }),
        },
      ],
    };
  }

  // Builds a plan that produces {uri, dataType, distCol} directly — no
  // fromLexicons join needed. Used by the engine's avoidLexicons path when
  // annTopK is the sole criterion.
  #buildDirectPlan({
    id,
    vecFrag,
    distCol,
    vectorColumn,
    queryVector,
    maxDistance,
    k,
    candidateK,
    scopeName,
    termValue,
    logicType,
  }) {
    let plan = op
      .fromView(SCHEMA_NAME, VIEW_NAME, id, op.fragmentIdCol(vecFrag))
      .annTopK(candidateK, op.col(vectorColumn), queryVector, op.col(distCol), {
        distance: 'cosine',
        maxDistance,
        searchFactor: 1,
      });

    // Post-filter: scope.
    plan = plan.where(
      op.in(op.viewCol(id, 'dataType'), getSearchScopeTypes(scopeName)),
    );

    // Post-filter: self-exclusion.
    if (logicType !== 'or') {
      plan = plan.where(op.ne(op.col('uri'), termValue));
    }

    // Project to standard result columns: uri, dataType (+ distance for sort).
    plan = plan.select([
      op.as('uri', op.col('uri')),
      op.as('dataType', op.viewCol(id, 'dataType')),
      op.fragmentIdCol(vecFrag),
      distCol,
    ]);

    return plan;
  }

  mayTokenizeValue() {
    return false;
  }

  getRequiredRuntimeSearchTermProperties() {
    return [];
  }

  getAllowedChildren() {
    return CHILD_TYPE_ATOMIC;
  }

  isConvertIdChildToIri() {
    return false;
  }

  getAllowedSearchOptionsName() {
    return null;
  }

  getDefaultSearchOptionsName() {
    return null;
  }
}

const PATTERN_NAME_ANN_TOP_K = 'annTopK';
SearchPatternBase.register(PATTERN_NAME_ANN_TOP_K, new AnnTopK());

export { PATTERN_NAME_ANN_TOP_K };
