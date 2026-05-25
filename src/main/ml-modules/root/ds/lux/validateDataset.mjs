import { handleRequest } from '../../lib/securityLib.mjs';
import { runDatasetValidation } from '../../lib/datasetValidation/datasetValidationLib.mjs';
import { getObjectFromNode } from '../../utils/utils.mjs';

const response = handleRequest(function () {
  return runDatasetValidation({
    format: external.format,
    categories: external.categories,
    unitNames: external.unitNames,
    baseline: getObjectFromNode(external.baseline),
    baselineId: external.baselineId,
    testConfig: getObjectFromNode(external.testConfig),
  });
});

response;
export default response;
