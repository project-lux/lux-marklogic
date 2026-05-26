import { DatasetTestInterface } from './DatasetTestInterface.mjs';

// Test instance registry, populated by each test file's self-registration.
const REGISTRY = {};

const SEVERITY_INFORMATIONAL = 'informational';
const SEVERITY_WARNING = 'warning';
const SEVERITY_CRITICAL = 'critical';

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

  // Default severity is derived from findings. Tests can override this.
  getSeverity(findings = []) {
    if (!Array.isArray(findings) || findings.length === 0) {
      return SEVERITY_INFORMATIONAL;
    }
    if (findings.some((item) => item.severity === SEVERITY_CRITICAL)) {
      return SEVERITY_CRITICAL;
    }
    if (findings.some((item) => item.severity === SEVERITY_WARNING)) {
      return SEVERITY_WARNING;
    }
    return SEVERITY_INFORMATIONAL;
  }
}

export { DatasetTestBase };
