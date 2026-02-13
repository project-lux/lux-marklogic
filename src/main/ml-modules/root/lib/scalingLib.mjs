import {
  requireUserMayScaleEnvironment,
  validateAndTrimHost,
} from './securityLib.mjs';

function scaleOut(dynamicHost) {
  requireUserMayScaleEnvironment(dynamicHost);

  dynamicHost = validateAndTrimHost(dynamicHost);

  // TODO: continue
}

export { scaleOut, validateAndTrimHost as validateHostSecurity };
