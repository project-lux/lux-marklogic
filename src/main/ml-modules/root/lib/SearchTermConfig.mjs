import * as utils from '../utils/utils.mjs';
import * as patternConfig from './searchPatternsLib.mjs';

const SearchTermConfig = class {
  constructor(searchTermConfigObj) {
    // Ideally, this should be a deep copy yet that proved confusing the first go around.
    this.searchTermConfigObj = searchTermConfigObj;
  }

  _getProperty(propName, defaultValue = null) {
    return this.searchTermConfigObj
      ? this.searchTermConfigObj[propName]
      : defaultValue;
  }

  acceptsGroupAsChild() {
    return (
      this.hasPatternName() && patternConfig.acceptsGroup(this.getPatternName())
    );
  }
  acceptsTermAsChild() {
    return (
      this.hasPatternName() && patternConfig.acceptsTerm(this.getPatternName())
    );
  }
  acceptsIdTermAsChild() {
    // Do not also require acceptsTermAsChild given how the search criteria processor accommodates ID child terms.
    return this.hasIdIndexReferences();
  }
  onlyAcceptsIdTermAsChild() {
    return (
      this.acceptsIdTermAsChild() &&
      (!this.hasPatternName() ||
        patternConfig.onlyAcceptsAtomicValue(this.getPatternName()))
    );
  }
  acceptsAtomicValue() {
    return (
      this.hasPatternName() &&
      patternConfig.acceptsAtomicValue(this.getPatternName())
    );
  }

  hasHelpText() {
    return this.getHelpText() != null;
  }
  getHelpText() {
    return this._getProperty('helpText');
  }

  getIdIndexReferences() {
    return this._getProperty('idIndexReferences');
  }
  hasIdIndexReferences() {
    return utils.isNonEmptyArray(this.getIdIndexReferences());
  }

  getIndexReferences() {
    return this._getProperty('indexReferences');
  }
  hasIndexReferences() {
    return utils.isNonEmptyArray(this.getIndexReferences());
  }

  getIndexReferences() {
    return this._getProperty('indexReferences');
  }

  getLabel() {
    return this._getProperty('label');
  }
  hasLabel() {
    return utils.isNonEmptyString(this.getLabel());
  }

  getOptionsReference() {
    return this._getProperty('optionsReference');
  }

  getPatternName() {
    return this._getProperty('patternName');
  }
  hasPatternName() {
    return utils.isNonEmptyString(this.getPatternName());
  }

  getPredicates() {
    return this._getProperty('predicates');
  }

  getPropertyNames() {
    return this._getProperty('propertyNames');
  }

  getScalarType() {
    return this._getProperty('scalarType');
  }

  getTargetScopeName() {
    const targetScopeName = this._getProperty('targetScope');
    return targetScopeName && typeof targetScopeName == 'string'
      ? targetScopeName.trim().toLowerCase()
      : null;
  }
  hasTargetScopeName() {
    return utils.isNonEmptyString(this.getTargetScopeName());
  }

  isForceExactMatch() {
    return this._getProperty('forceExactMatch', false);
  }

  stringify() {
    return JSON.stringify(this.searchTermConfigObj);
  }
};

export { SearchTermConfig };
