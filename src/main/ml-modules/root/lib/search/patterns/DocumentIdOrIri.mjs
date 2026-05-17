import op from '/MarkLogic/optic.mjs';
import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class DocumentIdOrIri extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
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

const PATTERN_NAME_DOCUMENT_ID = 'documentId';
const PATTERN_NAME_IRI = 'iri';
const instance = new DocumentIdOrIri();
SearchPatternBase.register(PATTERN_NAME_DOCUMENT_ID, instance);
SearchPatternBase.register(PATTERN_NAME_IRI, instance);

export { PATTERN_NAME_DOCUMENT_ID, PATTERN_NAME_IRI };
