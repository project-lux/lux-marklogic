// TODO: consider adding dedicated getters and setters for remaining, relavant options.
const OPTION_NAME_EAGER_EVALUATION = 'eagerEvaluation';
const OPTION_NAME_EXCLUDE_SELF_IRI = 'excludeSelfIri';
const OPTION_NAME_PREFER_FRAG_JOINS = 'preferFragJoins';
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

  setPreferFragJoins(b) {
    this.prefFragJoins = b;
  }
  getPreferFragJoins(defaultValue = false) {
    return this.prefFragJoins || defaultValue;
  }
};

export {
  OPTION_NAME_EAGER_EVALUATION,
  OPTION_NAME_EXCLUDE_SELF_IRI,
  OPTION_NAME_MAXIMUM_VALUES,
  OPTION_NAME_PREFER_FRAG_JOINS,
  OPTION_NAME_RETURN_VALUES,
  PatternOptions,
};
