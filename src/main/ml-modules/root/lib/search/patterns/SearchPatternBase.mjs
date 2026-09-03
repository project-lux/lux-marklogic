import { InvalidSearchRequestError } from '/lib/errorClasses.mjs';
import { SearchPatternInterface } from '/lib/search/patterns/SearchPatternInterface.mjs';

const CHILD_TYPE_GROUP = 4;
const CHILD_TYPE_TERM = 2;
const CHILD_TYPE_ATOMIC = 1;

// Pattern instance registry, populated by each pattern file's self-registration.
const REGISTRY = {};

class SearchPatternBase extends SearchPatternInterface {
  // Registers a frozen singleton pattern instance under the given name.
  static register(name, instance) {
    REGISTRY[name] = Object.freeze(instance);
  }

  // Returns the pattern instance for the given name, or undefined if not registered.
  static get(name) {
    return REGISTRY[name];
  }

  // Returns true if a pattern is registered under the given name.
  static has(name) {
    return name in REGISTRY;
  }

  //#region Methods extensions need not implement.
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

  contributesRelevanceScore() {
    return false;
  }

  // Valid operators for cts.fieldRangeQuery, shared by IndexedRange and DateRange.
  static RANGE_OPERATORS = Object.freeze(['<', '<=', '>', '>=', '=', '!=']);

  requireRangeOperator(termName, operator) {
    if (!SearchPatternBase.RANGE_OPERATORS.includes(operator)) {
      throw new InvalidSearchRequestError(
        `Unsupported comparison operator '${operator}' for the '${termName}' search term. Allowed: ${SearchPatternBase.RANGE_OPERATORS.join(', ')}.`,
      );
    }
  }
  //#endregion
}

export {
  CHILD_TYPE_ATOMIC,
  CHILD_TYPE_GROUP,
  CHILD_TYPE_TERM,
  SearchPatternBase,
};
