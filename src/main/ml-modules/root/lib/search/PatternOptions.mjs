// TODO: consider adding dedicated getters and setters for remaining, relavant options.
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

export { PatternOptions };
