import { NotImplementedError } from '../../errorClasses.mjs';

class SearchPatternInterface {
  apply(scp, searchTerm, logicType, patternOptions) {
    throw new NotImplementedError(
      `${this.constructor.name}.apply must be implemented.`,
    );
  }

  // Names of required runtime properties (without leading underscore),
  // e.g. ['comp', 'annK', 'vectorDistance'].
  getRequiredRuntimeSearchTermProperties() {
    throw new NotImplementedError(
      `${this.constructor.name}.getRequiredRuntimeSearchTermProperties must be implemented.`,
    );
  }

  getAllowedChildren() {
    throw new NotImplementedError(
      `${this.constructor.name}.getAllowedChildren must be implemented.`,
    );
  }

  isConvertIdChildToIri() {
    throw new NotImplementedError(
      `${this.constructor.name}.isConvertIdChildToIri must be implemented.`,
    );
  }

  getAllowedSearchOptionsName() {
    throw new NotImplementedError(
      `${this.constructor.name}.getAllowedSearchOptionsName must be implemented.`,
    );
  }

  getDefaultSearchOptionsName() {
    throw new NotImplementedError(
      `${this.constructor.name}.getDefaultSearchOptionsName must be implemented.`,
    );
  }

  //#region Types of children allowed by the pattern; impl'd by base class.
  acceptsGroup() {
    throw new NotImplementedError(
      `${this.constructor.name}.acceptsGroup must be implemented.`,
    );
  }

  acceptsTerm() {
    throw new NotImplementedError(
      `${this.constructor.name}.acceptsTerm must be implemented.`,
    );
  }

  acceptsAtomicValue() {
    throw new NotImplementedError(
      `${this.constructor.name}.acceptsAtomicValue must be implemented.`,
    );
  }

  onlyAcceptsAtomicValue() {
    throw new NotImplementedError(
      `${this.constructor.name}.onlyAcceptsAtomicValue must be implemented.`,
    );
  }
  //#endregion
}

export { SearchPatternInterface };
