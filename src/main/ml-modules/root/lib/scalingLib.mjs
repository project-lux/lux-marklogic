import { mayScaleEnvironment, validateAndTrimHost } from './securityLib.mjs';
import { User } from './User.mjs';
import { ML_ADMIN_PORT } from './appConstants.mjs';
import { ScaleEnvironmentError } from './errorClasses.mjs';

// Non-amp'd function that all scale out requests are to go through.
function scaleOut(dynamicHost) {
  const user = new User();
  console.log(
    `User '${user.getUsername()}' is attempting add dynamic host '${dynamicHost}'.`,
  );

  if (!mayScaleEnvironment()) {
    throw new ScaleEnvironmentError(
      `User '${user.getUsername()}' is not authorized to scale the environment.`,
    );
  }

  const result = _scaleOutAsAdmin(user, dynamicHost);
  if (result) {
    console.log(
      `User '${user.getUsername()}' successfully added dynamic host '${dynamicHost}'.`,
    );
  }
  return result;
}

// Keep private.
function __scaleOutAsAdmin(user, dynamicHost) {
  const admin = require('/MarkLogic/admin.xqy');

  let token = null;
  try {
    // Remove trace of any previous dynamic host.
    const oldDynamicHosts = xdmp.getDynamicHosts().toArray();
    if (oldDynamicHosts.length > 0) {
      xdmp.removeDynamicHosts(oldDynamicHosts);
    }

    dynamicHost = validateAndTrimHost(dynamicHost);
    token = admin.issueDynamicHostToken(
      'Default', // associated build property: allowDynamicHosts
      xdmp.hostName(),
      ML_ADMIN_PORT, // associated build property: enableApiTokenAuthentication
      xs.dayTimeDuration('PT5M'),
      `Token for ${dynamicHost} to be added by ${user.getUsername()}`,
    );

    // Presumes and requires dynamic host is uninitialized (http).
    // Also presumes the same admin port as current host.
    const url = `http://${dynamicHost}:${ML_ADMIN_PORT}/admin/v1/init`;
    const response = fn.head(
      xdmp.httpPost(url, {
        data: xdmp.quote({ 'dynamic-host-token': token }),
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    // Verify this host believes it was successful
    if (xdmp.getDynamicHosts().toArray().length === 0) {
      let details = ` URL attempted: ${url}.`;
      if (response) {
        details = ` Response code: ${response.code}, response message: ${response.message}`;
      }
      throwErrorDueToFailedScaleOutAttempt(
        `the dynamic hosts list is empty after attempting to add '${dynamicHost}'.${details}`,
      );
    }

    return true;
  } finally {
    if (token) {
      admin.revokeDynamicHostToken(token);
    }
  }
}
// Only scaleOut should call this.
const _scaleOutAsAdmin = import.meta.amp(__scaleOutAsAdmin);

function throwErrorDueToFailedScaleOutAttempt(msg) {
  // We monitor for the message's prefix.
  const fullMessage = `Unable to add dynamic host: ${msg}`;
  console.error(fullMessage);
  throw new ScaleEnvironmentError(fullMessage);
}

export { scaleOut };
