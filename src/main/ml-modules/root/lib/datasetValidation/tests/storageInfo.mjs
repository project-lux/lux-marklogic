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
    const issues = [];
    let hasCritical = false;

    Object.keys(storageInfo).forEach((host) => {
      Object.keys(storageInfo[host]).forEach((volume) => {
        const info = storageInfo[host][volume];
        if (info.message && info.message.startsWith('CRITICAL')) {
          hasCritical = true;
          issues.push({ host, volume, message: info.message });
        } else if (info.message && info.message.startsWith('WARNING')) {
          issues.push({ host, volume, message: info.message });
        }
      });
    });

    const score = hasCritical ? 0 : issues.length === 0 ? 1.0 : 0.5;

    const message =
      issues.length === 0
        ? 'All hosts report normal storage levels.'
        : `${issues.length} host/volume(s) report storage concerns.`;

    return {
      score: score,
      pass: score >= context.threshold,
      message: message,
      result: {
        storageInfo: storageInfo,
        issues: issues,
      },
    };
  }
}

DatasetTestBase.register(TEST_ID, new StorageInfo());

export { TEST_ID };
