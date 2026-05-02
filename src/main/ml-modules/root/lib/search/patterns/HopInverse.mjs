import op from '/MarkLogic/optic.mjs';
import { SearchCriteriaProcessor } from '../../SearchCriteriaProcessor.mjs';
import {
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  SearchPatternBase,
} from './SearchPatternBase.mjs';

class HopInverse extends SearchPatternBase {
  apply(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
    requestOptions,
  ) {
    const id = searchTerm.getId();
    const termConfig = searchTerm.getSearchTermConfig();
    const parentIriCol = searchTerm.getParentIriColumn();
    const triFragCol = id + '_triFrag';
    const refFragCol = id + '_frag';
    const predicates = SearchCriteriaProcessor.expandPredicates(
      termConfig.getPredicates(),
    );

    const tri = op.fromTriples([
      op.pattern(
        op.col(id + '_s'),
        predicates,
        op.col(id + '_o'),
        op.fragmentIdCol(triFragCol),
      ),
    ]);

    const right = tri.joinInner(
      searchCriteriaProcessor.processCriteria({
        planCriteria: searchTerm.getChildCriteria(),
        planScope: termConfig.getTargetScopeName(),
        patternOptions,
        groups: {
          by: [refFragCol],
        },
        parentId: id,
        requestOptions,
      }),
      [
        // Hop Inverse: the triple is on the referenced document, not the source document.
        op.on(op.fragmentIdCol(triFragCol), op.fragmentIdCol(refFragCol)),
      ],
    );

    return {
      patternJoins: [
        {
          right,
          // Can't join on frag because the triple isn't on the source document.
          on: op.on(op.col(parentIriCol), op.col(id + '_o')),
          extraCols: [],
        },
      ],
    };
  }

  getRequiredRuntimeSearchTermProperties() {
    return [];
  }

  getAllowedChildren() {
    return CHILD_TYPE_GROUP + CHILD_TYPE_TERM;
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

const HopInversePattern = Object.freeze(new HopInverse());

export { HopInversePattern };
