import { DatasetTestBase } from '../DatasetTestBase.mjs';
import { getStorageInfo } from '../../environmentLib.mjs';

const TEST_ID = 'storage-info';

class StorageInfo extends DatasetTestBase {
  getId() {
    return TEST_ID;
  }
  getName() {
    return 'Storage Info';
  }
  getCategory() {
    return 'infrastructure';
  }
  getSeverity() {
    return 'critical';
  }
  getDefaultThreshold() {
    return 1.0;
  }

  run(context) {
    const storageInfo = getStorageInfo();
    const criticalIssues = [];
    const warnings = [];

    Object.keys(storageInfo).forEach((host) => {
      Object.keys(storageInfo[host]).forEach((volume) => {
        const info = storageInfo[host][volume];
        if (info.message && info.message.startsWith('CRITICAL')) {
          criticalIssues.push({ host, volume, message: info.message });
        } else if (info.message && info.message.startsWith('WARNING')) {
          warnings.push({ host, volume, message: info.message });
        }
      });
    });

    // Only CRITICAL issues affect the score. Warnings are reported but do not fail the test.
    const score = criticalIssues.length > 0 ? 0 : 1.0;

    const message =
      criticalIssues.length === 0 && warnings.length === 0
        ? 'All hosts report normal storage levels.'
        : criticalIssues.length > 0
          ? `${criticalIssues.length} critical storage issue(s) found.`
          : `${warnings.length} warning(s) found.`;

    return {
      score: score,
      pass: score >= context.threshold,
      message: message,
      result: {
        storageInfo: storageInfo,
        criticalIssues: criticalIssues,
        warnings: warnings,
      },
    };
  }
}

DatasetTestBase.register(TEST_ID, new StorageInfo());

export { TEST_ID };
