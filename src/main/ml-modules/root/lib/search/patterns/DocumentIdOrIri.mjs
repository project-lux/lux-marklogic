import op from '/MarkLogic/optic.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class DocumentIdOrIri extends SearchPatternBase {
  apply(
    searchCriteriaProcessor,
    searchTerm,
    logicType,
    patternOptions,
    requestOptions,
  ) {
    const termValue = searchTerm.getValue();
    const uriCol = searchTerm.getParentUriColumn();

    return logicType === 'and'
      ? {
          constraints: [op.eq(op.col(uriCol), termValue)],
        }
      : {
          // Copilot convinced me that always using constraints would be wrong when !AND.
          // Worth testing if we'd like to always go against the URI column.
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
