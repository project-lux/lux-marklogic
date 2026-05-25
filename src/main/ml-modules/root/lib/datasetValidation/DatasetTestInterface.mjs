import { NotImplementedError } from '../errorClasses.mjs';

class DatasetTestInterface {
  getId() {
    throw new NotImplementedError(
      `${this.constructor.name}.getId must be implemented.`,
    );
  }

  getName() {
    throw new NotImplementedError(
      `${this.constructor.name}.getName must be implemented.`,
    );
  }

  getCategory() {
    throw new NotImplementedError(
      `${this.constructor.name}.getCategory must be implemented.`,
    );
  }

  getSeverity() {
    throw new NotImplementedError(
      `${this.constructor.name}.getSeverity must be implemented.`,
    );
  }

  getDefaultThreshold() {
    throw new NotImplementedError(
      `${this.constructor.name}.getDefaultThreshold must be implemented.`,
    );
  }

  run(context) {
    throw new NotImplementedError(
      `${this.constructor.name}.run must be implemented.`,
    );
  }
}

export { DatasetTestInterface };
