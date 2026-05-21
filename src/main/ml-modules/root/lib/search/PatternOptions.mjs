const OPTION_NAME_EAGER_EVALUATION = 'eagerEvaluation';
const OPTION_NAME_EXCLUDE_SELF_IRI = 'excludeSelfIri';
const OPTION_NAME_PREFER_FRAG_JOINS = 'preferFragJoins'; // More of a request option.
const OPTION_NAME_MAXIMUM_VALUES = 'maximumValues';
const OPTION_NAME_RETURN_VALUES = 'returnValues';

const PatternOptions = class {
  constructor(prefFragJoins = false) {
    this.options = {};
    this.prefFragJoins = prefFragJoins;
  }

  set(name, value) {
    this.options[name] = value;
  }

  get(name, defaultValue = null) {
    if (this.options.hasOwnProperty(name)) {
      return this.options[name];
    }
    return defaultValue;
  }

  setEagerEvaluation(b) {
    this.set(OPTION_NAME_EAGER_EVALUATION, b);
  }
  getEagerEvaluation(defaultValue = null) {
    return this.get(OPTION_NAME_EAGER_EVALUATION, defaultValue);
  }

  setExcludeSelfIri(b) {
    this.set(OPTION_NAME_EXCLUDE_SELF_IRI, b);
  }
  getExcludeSelfIri(defaultValue = null) {
    return this.get(OPTION_NAME_EXCLUDE_SELF_IRI, defaultValue);
  }

  setPreferFragJoins(b) {
    this.set(OPTION_NAME_PREFER_FRAG_JOINS, b);
  }
  getPreferFragJoins(defaultValue = false) {
    return this.get(OPTION_NAME_PREFER_FRAG_JOINS, defaultValue);
  }

  setMaximumValues(value) {
    this.set(OPTION_NAME_MAXIMUM_VALUES, value);
  }
  getMaximumValues(defaultValue = null) {
    return this.get(OPTION_NAME_MAXIMUM_VALUES, defaultValue);
  }

  setReturnValues(b) {
    this.set(OPTION_NAME_RETURN_VALUES, b);
  }
  getReturnValues(defaultValue = null) {
    return this.get(OPTION_NAME_RETURN_VALUES, defaultValue);
  }
};

export { PatternOptions };
