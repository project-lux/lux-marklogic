import { SearchPatternInterface } from './SearchPatternInterface.mjs';

const CHILD_TYPE_GROUP = 4;
const CHILD_TYPE_TERM = 2;
const CHILD_TYPE_ATOMIC = 1;
const CHILD_TYPE_NONE = 0;

class SearchPatternBase extends SearchPatternInterface {
  // Convenience method that serves up the pattern name from an instance.
  getPatternName() {
    return this.constructor.getPatternName();
  }

  //#region Methods extensions need not implement.
  isExposedViaSearch() {
    return this.getAllowedChildren() !== CHILD_TYPE_NONE;
  }

  acceptsGroup() {
    return (this.getAllowedChildren() & CHILD_TYPE_GROUP) === CHILD_TYPE_GROUP;
  }

  acceptsTerm() {
    return (this.getAllowedChildren() & CHILD_TYPE_TERM) === CHILD_TYPE_TERM;
  }

  acceptsAtomicValue() {
    return (
      (this.getAllowedChildren() & CHILD_TYPE_ATOMIC) === CHILD_TYPE_ATOMIC
    );
  }

  onlyAcceptsAtomicValue() {
    return this.getAllowedChildren() === CHILD_TYPE_ATOMIC;
  }
  //#endregion
}

export {
  CHILD_TYPE_ATOMIC,
  CHILD_TYPE_GROUP,
  CHILD_TYPE_NONE,
  CHILD_TYPE_TERM,
  SearchPatternBase,
};
