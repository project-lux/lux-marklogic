import op from '/MarkLogic/optic.mjs';
import { InvalidSearchRequestError } from '/lib/errorClasses.mjs';
import {
  CHILD_TYPE_ATOMIC,
  SearchPatternBase,
} from '/lib/search/patterns/SearchPatternBase.mjs';
import { getSearchScopeTypes } from '/lib/searchScope.mjs';
import {
  ANN_CANDIDATE_K_BUFFER,
  ANN_CANDIDATE_K_MULTIPLIER,
} from '/lib/appConstants.mjs';

// Match with src/main/ml-schemas/tde/vectors.json
const SCHEMA_NAME = 'lux';
const VIEW_NAME = 'vectors';

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
      Math.max(k * ANN_CANDIDATE_K_MULTIPLIER, k + ANN_CANDIDATE_K_BUFFER),
    );

    // Shared base plan: annTopK + post-filters (scope, self-exclusion).
    let basePlan = op
      .fromView(SCHEMA_NAME, VIEW_NAME, id, op.fragmentIdCol(vecFrag))
      .annTopK(candidateK, op.col(vectorColumn), queryVector, op.col(distCol), {
        distance: 'cosine',
        maxDistance,
        searchFactor: 1,
      });

    // Post-filter: scope constraint.
    basePlan = basePlan.where(
      op.in(op.viewCol(id, 'dataType'), getSearchScopeTypes(scopeName)),
    );

    // Post-filter: exclude the seed document for single similarity queries.
    if (logicType !== 'or') {
      basePlan = basePlan.where(op.ne(op.viewCol(id, 'uri'), termValue));
    }

    // Join path: project to join columns.
    const joinPlan = basePlan.select([
      op.as(id + '_vectorUri', op.viewCol(id, 'uri')),
      op.fragmentIdCol(vecFrag),
      distCol,
    ]);

    return {
      patternJoins: [
        {
          right: joinPlan,
          on: op.on(
            op.fragmentIdCol(searchTerm.getParentFragmentColumn()),
            op.fragmentIdCol(vecFrag),
          ),
          extraCols: [distCol],
          // Opt 20 extension: signal that this join's plan is self-sufficient
          // (provides uri + dataType from the TDE view). When annTopK is the
          // sole criterion, the engine can skip fromLexicons entirely.
          annTopKSelfSufficient: true,
          // Pass basePlan with view-qualified columns; getDirectPlan handles
          // groupBy + column rename using the qualifier.
          annTopKPlanForDirect: basePlan,
          annTopKViewQualifier: id,
        },
      ],
    };
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
