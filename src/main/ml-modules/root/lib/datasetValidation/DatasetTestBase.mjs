import { DatasetTestInterface } from './DatasetTestInterface.mjs';

// Test instance registry, populated by each test file's self-registration.
const REGISTRY = {};

class DatasetTestBase extends DatasetTestInterface {
  static register(id, instance) {
    REGISTRY[id] = Object.freeze(instance);
  }

  static get(id) {
    return REGISTRY[id];
  }

  static has(id) {
    return id in REGISTRY;
  }

  static getAll() {
    return Object.values(REGISTRY);
  }

  static getAllIds() {
    return Object.keys(REGISTRY);
  }
}

export { DatasetTestBase };
