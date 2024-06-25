// Just name-value pairs
const SearchPatternOptions = class {
  constructor() {
    this.options = {};
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
};

export { SearchPatternOptions };
