import { handleRequest } from '/lib/securityLib.mjs';
import { validateDataset } from '/lib/datasetValidation/datasetValidationLib.mjs';
import { getObjectFromNode } from '/utils/utils.mjs';

const response = handleRequest(function () {
  return validateDataset({
    unitNames: external.unitNames,
    categories: external.categories,
    testConfig: getObjectFromNode(external.testConfig),
    baseline: getObjectFromNode(external.baseline),
    baselineId: external.baselineId,
    format: external.format,
  });
});

response;
export default response;
