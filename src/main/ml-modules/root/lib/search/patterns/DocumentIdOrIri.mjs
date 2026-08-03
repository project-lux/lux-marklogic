import { CHILD_TYPE_ATOMIC, SearchPatternBase } from './SearchPatternBase.mjs';

class DocumentIdOrIri extends SearchPatternBase {
  apply(scp, searchTerm, logicType, patternOptions) {
    const termValue = searchTerm.getValue();
    return { ctsConstraints: [cts.documentQuery(termValue)] };
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

const PATTERN_NAME_DOCUMENT_ID = 'documentId';
const PATTERN_NAME_IRI = 'iri';
const instance = new DocumentIdOrIri();
SearchPatternBase.register(PATTERN_NAME_DOCUMENT_ID, instance);
SearchPatternBase.register(PATTERN_NAME_IRI, instance);

export { PATTERN_NAME_DOCUMENT_ID, PATTERN_NAME_IRI };
