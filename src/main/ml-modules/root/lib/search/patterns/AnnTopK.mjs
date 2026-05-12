import op from '/MarkLogic/optic.mjs';
import { InvalidSearchRequestError } from '../../errorClasses.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class AnnTopK extends SearchPatternBase {
  apply(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
    requestOptions,
  ) {
    const id = searchTerm.getId();
    const name = searchTerm.getName();
    const termValue = searchTerm.getValue();
    const vecFrag = id + '_vecFrag';
    const distCol = id + '_distance';
    const vectorColumn = searchTerm.getVectorColumn();
    const maxDistance = searchTerm.getVectorDistance();
    const k = searchTerm.getAnnK();

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

    // Create annTopK plan with URI column renamed to avoid conflicts with main lexicons.
    // TODO: Replace hardcoded schema and view names.
    let annPlan = op.fromView('lux', 'vectors', id, op.fragmentIdCol(vecFrag));

    // Exclude the seed document only for single similarity queries.
    if (logicType !== 'or') {
      annPlan = annPlan.where(op.ne(op.col('uri'), termValue));
    }

    annPlan = annPlan
      .annTopK(k, op.col(vectorColumn), queryVector, op.col(distCol), {
        distance: 'cosine',
        maxDistance,
      })
      .select([
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
        },
      ],
    };
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

const AnnTopKPattern = Object.freeze(new AnnTopK());

export { AnnTopKPattern };
