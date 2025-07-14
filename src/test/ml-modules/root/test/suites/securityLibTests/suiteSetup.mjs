import { FOO_FILENAME, FOO_URI } from '/test/unitTestConstants.mjs';
import { setTenantStatus } from '/lib/environmentLib.mjs';
import { loadTestFile } from '/test/unitTestUtils.mjs';

const zeroArityFun = () => {
  declareUpdate();
  setTenantStatus(false, false);
};
xdmp.invokeFunction(zeroArityFun);

// Does not require declareUpdate();
loadTestFile(FOO_URI, FOO_FILENAME);
