import * as utils from '../utils/utils.mjs';
import { SearchTermConfig } from './SearchTermConfig.mjs';

// Offers traditional getters and settings, as well as the builder pattern's adds.
const SearchTerm = class {
  constructor(obj = null) {
    /*
     * Adding a property herein?  Also represent in this class' stringify method for reconstitution purposes.
     */
    const reconstitute = obj != null;

    this.usable = reconstitute ? obj.usable : true;
    this.name = reconstitute ? obj.name : null;
    this.scopeName = reconstitute ? obj.scopeName : null;
    this.searchTermConfig =
      reconstitute && obj.searchTermConfig
        ? new SearchTermConfig(obj.searchTermConfig.searchTermConfigObj)
        : null;
    this.value = reconstitute ? obj.value : null;
    this.props = reconstitute ? obj.props : {};
    this.mustReturnCtsQuery = reconstitute ? obj.props : false;
    this.parentSearchTerm = reconstitute
      ? new SearchTerm(obj.parentSearchTerm)
      : null;
    this.childInfo = reconstitute ? obj.childInfo : {};
    this.modifiedCriteria = reconstitute ? obj.modifiedCriteria : null;
  }

  // Likely set via setProperty
  getComparisonOperator() {
    return this.props.comp;
  }
  hasComparisonOperator() {
    return utils.isNonEmptyString(this.props.comp);
  }

  addMustReturnCtsQuery(mustReturnCtsQuery) {
    this.setMustReturnCtsQuery(mustReturnCtsQuery);
    return this;
  }
  setMustReturnCtsQuery(mustReturnCtsQuery) {
    this.mustReturnCtsQuery = mustReturnCtsQuery;
  }
  getMustReturnCtsQuery() {
    return this.mustReturnCtsQuery;
  }

  addName(name) {
    this.setName(name);
    return this;
  }
  setName(name) {
    this.name = name;
  }
  getName() {
    return this.name;
  }
  hasName() {
    return utils.isNonEmptyString(this.name);
  }

  addParentSearchTerm(parentSearchTerm) {
    this.setParentSearchTerm(parentSearchTerm);
    return this;
  }
  setParentSearchTerm(parentSearchTerm) {
    //this.parentSearchTerm = SearchTerm.createDeepCopy(parentSearchTerm);
    this.parentSearchTerm = parentSearchTerm;
  }
  getParentSearchTerm() {
    return this.parentSearchTerm;
  }
  hasParentSearchTerm() {
    return this.getParentSearchTerm() != null;
  }

  addChildInfo(childInfo) {
    this.childInfo = childInfo;
    return this;
  }
  getChildPatternName() {
    return this.childInfo ? this.childInfo.patternName : null;
  }
  getChildValueType() {
    return this.childInfo ? this.childInfo.valueType : null;
  }
  getChildWillReturnCtsQuery() {
    return this.childInfo ? this.childInfo.willReturnCtsQuery : null;
  }

  addScopeName(scopeName) {
    this.setScopeName(scopeName);
    return this;
  }
  setScopeName(scopeName) {
    this.scopeName = scopeName;
  }
  getScopeName() {
    return this.scopeName;
  }

  addSearchTermConfig(searchTermConfig) {
    this.setSearchTermConfig(searchTermConfig);
    return this;
  }
  setSearchTermConfig(searchTermConfig) {
    this.searchTermConfig = searchTermConfig;
  }
  getSearchTermConfig() {
    return this.searchTermConfig;
  }

  // The search criteria processor passes on the value of search term properties here,
  // after dropping the property name's leading underscore.  Some properties have their
  // own getters and setters, to be more explicity and convenient.
  addProperty(name, value) {
    this.setProperty(name, value);
    return this;
  }
  setProperty(name, value) {
    this.props[name] = value;
  }
  getProperty(name) {
    return this.props[name];
  }
  getProperties() {
    return this.props;
  }
  getPropertyNames() {
    return Object.keys(this.getProperties());
  }

  // Each search term instance may come with its own search options.  Such search options
  // are finalized when applying the search term's pattern.
  setSearchOptions(options) {
    this.setProperty('options', options);
  }
  getSearchOptions() {
    return this.props.options;
  }

  setUsable(usable) {
    this.usable = usable;
  }
  isUsable() {
    return this.usable === true;
  }

  addCompleteMatch(completeMatch) {
    this.setCompleteMatch(completeMatch);
    return this;
  }
  setCompleteMatch(completeMatch) {
    this.props.complete = completeMatch;
  }
  isCompleteMatch() {
    return this.props.complete === true;
  }

  addTokenized(tokenized) {
    this.setTokenized(tokenized);
    return this;
  }
  setTokenized(tokenized) {
    this.props.tokenized = tokenized;
  }
  isTokenized() {
    return this.props.tokenized === true;
  }

  addValue(value) {
    this.setValue(value);
    return this;
  }
  setValue(value) {
    this.value = value;
  }
  getValue() {
    return this.value;
  }

  addValueType(type) {
    this.setValueType(type);
    return this;
  }
  setValueType(type) {
    this.props.valueType = type;
  }
  getValueType() {
    return this.props.valueType;
  }
  hasValueType() {
    return !isNaN(this.props.valueType);
  }

  addWeight(weight) {
    this.setWeight(weight);
    return this;
  }
  setWeight(weight) {
    this.props.weight = weight;
  }
  getWeight() {
    return this.props.weight;
  }
  hasNumericWeight() {
    return !isNaN(this.props.weight);
  }

  addModifiedCriteria(criteria) {
    this.setModifiedCriteria(criteria);
    return this;
  }
  setModifiedCriteria(criteria) {
    this.modifiedCriteria = criteria;
  }
  getModifiedCriteria() {
    return this.modifiedCriteria;
  }
  hasModifiedCriteria() {
    return this.getModifiedCriteria() != null;
  }

  stringify() {
    return JSON.stringify({
      usable: this.usable,
      name: this.name,
      scopeName: this.scopeName,
      searchTermConfig: this.searchTermConfig,
      value: this.value,
      props: this.props,
      mustReturnCtsQuery: this.mustReturnCtsQuery,
      parentSearchTerm: this.parentSearchTerm,
      childInfo: this.childInfo,
      modifiedCriteria: this.modifiedCriteria,
    });
  }
};

export { SearchTerm };
