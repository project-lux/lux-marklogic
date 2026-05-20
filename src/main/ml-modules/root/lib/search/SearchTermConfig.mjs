import * as utils from '../../utils/utils.mjs';
import { SearchPatternBase } from './patterns/loadPatterns.mjs';

const SearchTermConfig = class {
  constructor(rawConfig) {
    // Ideally, this should be a deep copy yet that proved confusing the first go around.
    this.rawConfig = rawConfig;
  }

  _getProperty(propName, defaultValue = null) {
    return this.rawConfig ? this.rawConfig[propName] : defaultValue;
  }

  _getPattern() {
    return SearchPatternBase.get(this.getPatternName());
  }

  exposedViaSearch() {
    // Unlike the methods below, this is called on every search term — including
    // ones configured to 'relatedList', which has no registered pattern class.
    // Those terms pass hasPatternName() but _getPattern() returns undefined.
    const pattern = this._getPattern();
    return pattern != null && pattern.isExposedViaSearch();
  }

  acceptsGroupAsChild() {
    return this.hasPatternName() && this._getPattern().acceptsGroup();
  }
  acceptsTermAsChild() {
    return this.hasPatternName() && this._getPattern().acceptsTerm();
  }
  acceptsIdTermAsChild() {
    // Do not also require acceptsTermAsChild given how the search criteria processor accommodates ID child terms.
    return this.hasIdIndexReferences();
  }
  acceptsAtomicValue() {
    return this.hasPatternName() && this._getPattern().acceptsAtomicValue();
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

  isGeospatialRegion() {
    return this._getProperty('region', false);
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
