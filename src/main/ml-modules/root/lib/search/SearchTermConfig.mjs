import * as utils from '../../utils/utils.mjs';
import * as patternConfig from './patterns.mjs';

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

  exposedViaSearch() {
    return (
      this.hasPatternName() &&
      patternConfig.exposedViaSearch(this.getPatternName())
    );
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

  getLabel() {
    return this._getProperty('label');
  }
  hasLabel() {
    return utils.isNonEmptyString(this.getLabel());
  }

  isMyCollectionTerm() {
    return this._getProperty('isMyCollectionTerm', false);
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

  isTransitive() {
    return this._getProperty('transitive', false);
  }

  getVectorColumn() {
    return this._getProperty('vectorColumn');
  }

  getMaxDistance() {
    return this._getProperty('maxDistance');
  }

  getAnnK() {
    return this._getProperty('annKMaxDefault');
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
};

export { SearchTermConfig };
