import op from '/MarkLogic/optic.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class DocumentIdOrIri extends SearchPatternBase {
  apply(searchCriteriaProcessor, searchTerm, logicType, patternOptions) {
    const termValue = searchTerm.getValue();
    const uriCol = searchTerm.getParentUriColumn();

    return logicType === 'and'
      ? {
          constraints: [op.eq(op.col(uriCol), termValue)],
        }
      : {
          // ctsContraints proven to be required for OR, at least given engine's
          // implementation at the time.
          ctsConstraints: [cts.documentQuery(termValue)],
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

const DocumentIdOrIriPattern = Object.freeze(new DocumentIdOrIri());

export { DocumentIdOrIriPattern };
