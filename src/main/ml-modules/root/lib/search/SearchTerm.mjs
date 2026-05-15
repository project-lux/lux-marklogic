import * as utils from '../../utils/utils.mjs';
import { SearchTermConfig } from './SearchTermConfig.mjs';
import {
  ANN_DISTANCE_DEFAULT,
  ANN_DISTANCE_MAX,
  ANN_K_DEFAULT,
  ANN_K_MAX,
  DEFAULT_VECTOR_COLUMN,
} from '../appConstants.mjs';

// Offers traditional getters and settings, as well as the builder pattern's adds.
const SearchTerm = class {
  constructor() {
    this.usable = true;
    this.id = null;
    this.name = null;
    this.scopeName = null;
    this.searchTermConfig = null;
    this.value = null;
    this.props = {};
    this.childInfo = {};
    this.modifiedCriteria = null;
    this.criteria = null;
    this.columns = {};
    this.parentColumns = {};
    this.topLevel = true;
  }

  addId(id) {
    this.setId(id);
    return this;
  }
  setId(id) {
    this.id = id;
  }
  getId() {
    return this.id;
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

  // Likely set via setProperty
  getComparisonOperator() {
    return this.props.comp;
  }
  hasComparisonOperator() {
    return utils.isNonEmptyString(this.props.comp);
  }

  addTimespanMode(timespanMode) {
    this.setTimespanMode(timespanMode);
    return this;
  }
  setTimespanMode(timespanMode) {
    const normalizedMode =
      typeof timespanMode === 'string' ? timespanMode.trim().toLowerCase() : '';
    this.props.timespanMode = ['begin', 'end', 'full'].includes(normalizedMode)
      ? normalizedMode
      : 'full';
  }
  getTimespanMode() {
    return this.props.timespanMode;
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
    switch (name) {
      // A subset of props have maximums enforced by their setters.
      case 'annK':
        this.setAnnK(value);
        break;
      case 'maxDistance':
        this.setVectorDistance(value);
        break;
      case 'timespanMode':
        this.setTimespanMode(value);
        break;
      default:
        this.props[name] = value;
        break;
    }
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

  //#region Current search term's Optic columns.
  getIriColumn() {
    return this.id + '_iri';
  }
  getUriColumn() {
    return this.id + '_uri';
  }
  getFragmentColumn() {
    return this.id + '_frag';
  }
  //#endregion

  //#region Parent search term's Optic columns.
  addParentColumns({ iriCol, uriCol, fragCol, dataTypeCol } = {}) {
    if (utils.isDefined(iriCol)) this.setParentIriColumn(iriCol);
    if (utils.isDefined(uriCol)) this.setParentUriColumn(uriCol);
    if (utils.isDefined(fragCol)) this.setParentFragmentColumn(fragCol);
    if (utils.isDefined(dataTypeCol)) this.setParentDataTypeColumn(dataTypeCol);
    return this;
  }

  addParentColumn(name, value) {
    this.setParentColumn(name, value);
    return this;
  }
  setParentColumn(name, value) {
    this.parentColumns[name] = value;
  }
  getParentColumn(name) {
    return this.parentColumns[name];
  }
  getParentColumns() {
    return this.parentColumns;
  }
  getParentColumnNames() {
    return Object.keys(this.getParentColumns());
  }

  addParentUriColumn(uriColumn) {
    this.setParentUriColumn(uriColumn);
    return this;
  }
  setParentUriColumn(uriColumn) {
    this.setParentColumn('uri', uriColumn);
  }
  getParentUriColumn() {
    return this.getParentColumn('uri');
  }

  addParentIriColumn(iriColumn) {
    this.setParentIriColumn(iriColumn);
    return this;
  }
  setParentIriColumn(iriColumn) {
    this.setParentColumn('iri', iriColumn);
  }
  getParentIriColumn() {
    return this.getParentColumn('iri');
  }

  addParentFragmentColumn(fragmentColumn) {
    this.setParentFragmentColumn(fragmentColumn);
    return this;
  }
  setParentFragmentColumn(fragmentColumn) {
    this.setParentColumn('fragment', fragmentColumn);
  }
  getParentFragmentColumn() {
    return this.getParentColumn('fragment');
  }

  addParentDataTypeColumn(dataTypeColumn) {
    this.setParentDataTypeColumn(dataTypeColumn);
    return this;
  }
  setParentDataTypeColumn(dataTypeColumn) {
    this.setParentColumn('dataType', dataTypeColumn);
  }
  getParentDataTypeColumn() {
    return this.getParentColumn('dataType');
  }
  //#endregion

  // Each search term instance may come with its own search options.  Such search options
  // are finalized when applying the search term's pattern.
  setSearchOptions(options) {
    this.setProperty('options', options);
  }
  getSearchOptions() {
    return this.props.options;
  }

  addAnnK(annK) {
    this.setAnnK(annK);
    return this;
  }
  setAnnK(annK) {
    const requestedK = annK ?? this.searchTermConfig?.getAnnK();
    this.props.annK = Math.min(requestedK ?? ANN_K_DEFAULT, ANN_K_MAX);
  }
  getAnnK() {
    if (this.props.annK == null) {
      this.setAnnK();
    }
    return this.props.annK;
  }

  addVectorDistance(distance) {
    this.setVectorDistance(distance);
    return this;
  }
  setVectorDistance(distance) {
    const requestedDistance =
      distance ?? this.searchTermConfig?.getMaxDistance();
    this.props.vectorDistance = Math.min(
      requestedDistance ?? ANN_DISTANCE_DEFAULT,
      ANN_DISTANCE_MAX,
    );
  }
  getVectorDistance() {
    if (this.props.vectorDistance == null) {
      this.setVectorDistance();
    }
    return this.props.vectorDistance;
  }

  addVectorColumn(vectorColumn) {
    this.setVectorColumn(vectorColumn);
    return this;
  }
  setVectorColumn(vectorColumn) {
    this.setProperty('vectorColumn', vectorColumn);
  }
  getVectorColumn() {
    return (
      this.props.vectorColumn ??
      this.searchTermConfig?.getVectorColumn?.() ??
      DEFAULT_VECTOR_COLUMN
    );
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
  hasValue() {
    return utils.isDefined(this.value);
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

  addCriteria(criteria) {
    this.setCriteria(criteria);
    return this;
  }
  setCriteria(criteria) {
    this.criteria = criteria;
  }
  getCriteria() {
    return this.criteria;
  }
  hasCriteria() {
    return this.criteria != null;
  }

  addTopLevel(topLevel) {
    this.setTopLevel(topLevel);
    return this;
  }
  setTopLevel(topLevel) {
    this.topLevel = topLevel;
  }
  isTopLevel() {
    return this.topLevel === true;
  }
};

export { SearchTerm };
