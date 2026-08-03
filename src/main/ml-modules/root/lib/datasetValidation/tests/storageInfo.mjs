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
  getDefaultThreshold() {
    return 1.0;
  }

  run(context) {
    const storageInfo = getStorageInfo();

    Object.keys(storageInfo).forEach((host) => {
      Object.keys(storageInfo[host]).forEach((volume) => {
        const info = storageInfo[host][volume];
        if (info.message && info.message.startsWith('CRITICAL')) {
          context.addCriticalFinding(
            `Host '${host}', volume '${volume}': ${info.message}`,
          );
        } else if (info.message && info.message.startsWith('WARNING')) {
          context.addInformationalFinding(
            `Host '${host}', volume '${volume}': ${info.message}`,
          );
        }
      });
    });

    if (!context.hasAnyFindings()) {
      context.addInformationalFinding(
        'All hosts report normal storage levels.',
      );
    }

    // Only critical findings affect go/no-go for this test.
    context.setScoreFromFindings('critical-only');

    return {
      storageInfo: storageInfo,
      findings: context.getFindings(),
    };
  }
}

DatasetTestBase.register(TEST_ID, new StorageInfo());

export { TEST_ID };
