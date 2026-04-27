import { mayScaleEnvironment, validateAndTrimHost } from './securityLib.mjs';
import { User } from './User.mjs';
import { ML_ADMIN_PORT, SCALE_OUT_TIMEOUT } from './appConstants.mjs';
import { ScaleEnvironmentError } from './errorClasses.mjs';
import { getExceptionObjectElseMessage } from '../utils/utils.mjs';

// Non-amp'd function that all scale out requests are to go through.
function scaleOut(dynamicHost) {
  const user = new User();
  console.log(
    `User '${user.getUsername()}' is attempting to add dynamic host '${dynamicHost}'`,
  );

  if (!mayScaleEnvironment()) {
    throw new ScaleEnvironmentError(
      `User '${user.getUsername()}' is not authorized to scale the environment`,
    );
  }

  const result = _scaleOutAsAdmin(user, dynamicHost);
  if (result) {
    console.log(
      `User '${user.getUsername()}' successfully added dynamic host '${dynamicHost}'`,
    );
  }
  return result;
}

function removeDynamicHosts(user, offlineOnly = false) {
  if (!mayScaleEnvironment()) {
    throw new ScaleEnvironmentError(
      `User '${user.getUsername()}' is not authorized to scale the environment`,
    );
  }

  const dynamicHosts = xdmp.getDynamicHosts().toArray();
  const dynamicHostsToRemove = offlineOnly ? [] : dynamicHosts;
  if (offlineOnly) {
    dynamicHosts.forEach((hostId) => {
      const hostStatus = fn.head(xdmp.hostStatus(hostId));
      if (
        hostStatus.error &&
        hostStatus.error.toString().startsWith('XDMP-HOSTOFFLINE')
      ) {
        dynamicHostsToRemove.push(hostId);
      }
    });
  }
  const hostCount = dynamicHostsToRemove.length;
  if (hostCount > 0) {
    xdmp.removeDynamicHosts(dynamicHostsToRemove);
    return `Removed ${hostCount} ${offlineOnly ? 'offline ' : ''}dynamic host(s)`;
  }
  return 'No dynamic hosts to remove.';
}

// Keep private.
function __scaleOutAsAdmin(user, dynamicHost) {
  const admin = require('/MarkLogic/admin.xqy');

  let token = null;
  let errorMsg = null;
  try {
    xdmp.setRequestTimeLimit(SCALE_OUT_TIMEOUT);

    removeDynamicHosts(user, false);

    // Verify the local host has the required configuration.
    const groupId = xdmp.group();
    const config = admin.getConfiguration();
    if (
      !admin.groupGetAllowDynamicHosts(config, groupId) ||
      !admin.appserverGetAPITokenAuthentication(
        config,
        admin.appserverGetId(config, groupId, 'Admin'),
      )
    ) {
      errorMsg = `the local host is not configured to allow dynamic hosts; check deployment configuration`;
      return false;
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
      let details = ` URL attempted: ${url}`;
      if (response) {
        details = ` Response code: ${response.code}, response message: ${response.message}`;
      }
      errorMsg = `the dynamic hosts list is empty after attempting to add '${dynamicHost}'.${details}`;
      return false;
    }

    return true;
  } catch (e) {
    errorMsg = getExceptionObjectElseMessage(e);
  } finally {
    if (token) {
      admin.revokeDynamicHostToken(token);
    }

    if (errorMsg) {
      // We monitor for the message's prefix.
      const fullMessage = `Unable to add dynamic host: ${errorMsg}`;
      console.error(fullMessage);
      throw new ScaleEnvironmentError(fullMessage);
    }
  }
}
// Only scaleOut should call this.
const _scaleOutAsAdmin = import.meta.amp(__scaleOutAsAdmin);

export { scaleOut, removeDynamicHosts };
