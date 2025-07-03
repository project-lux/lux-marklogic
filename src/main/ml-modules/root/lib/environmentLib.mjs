import {
  CODE_VERSION,
  HIGH_STORAGE_WARNING_THRESHOLD,
  LOW_STORAGE_CRITICAL_THRESHOLD,
  LOW_STORAGE_WARNING_THRESHOLD,
  ML_APP_NAME,
  TENANT_NAME,
} from './appConstants.mjs';
import * as utils from '../utils/utils.mjs';
import {
  CAPABILITY_READ,
  CAPABILITY_UPDATE,
  ROLE_NAME_DEPLOYER,
  getAllReaderRoleNames,
  requireUserMayUpdateTenantStatus,
} from './securityLib.mjs';
import { BadRequestError, InternalConfigurationError } from './mlErrorsLib.mjs';
import { User } from './User.mjs';

// Not needed outside this library.
const TENANT_STATUS_URI = 'https://lux.collections.yale.edu/status/tenant';

const ROLE_PROD = 'prod';
const ROLE_NON_PROD = 'nonProd';

const journalSizeThresholdForReserveMb = 10;
const perJournalReserveMb = 4096;
const perVolumeOtherReserveMb = 2048; // logs, for example.
const reportInGb = true; // false = Mb
const MbToGbDivisor = 1024;

// This function purposely does not log using a trace event as trace events can be disabled.
function setTenantStatus(roleName, readOnly) {
  const username = new User().getUsername();
  console.log(
    `User '${username}' is attempting to set the tenant role to '${roleName}' and readOnly to '${readOnly}'.`
  );

  requireUserMayUpdateTenantStatus();

  // Validate parameter values.
  if (roleName !== ROLE_PROD && roleName !== ROLE_NON_PROD) {
    throw new BadRequestError(
      `Invalid roleName: '${roleName}'. Must be either '${ROLE_PROD}' or '${ROLE_NON_PROD}'.`
    );
  }
  if (readOnly !== true && readOnly !== false) {
    throw new BadRequestError(
      `Invalid readOnly: '${readOnly}'. Must be either a boolean.`
    );
  }

  if (fn.docAvailable(TENANT_STATUS_URI)) {
    console.log(
      `The current tenant status role is '${getTenantRoleName()}' and readOnly is '${inReadOnlyMode()}'`
    );
  } else {
    console.log('The tenant status document does not yet exist.');
  }

  const doc = {
    appName: ML_APP_NAME,
    tenantName: TENANT_NAME,
    roleName,
    readOnly,
    lastSetBy: username,
    lastSetOn: fn.currentDateTime(),
  };

  const options = {
    permissions: [
      xdmp.permission(ROLE_NAME_DEPLOYER, CAPABILITY_READ),
      xdmp.permission(ROLE_NAME_DEPLOYER, CAPABILITY_UPDATE),
    ].concat(
      getAllReaderRoleNames().map((roleName) =>
        xdmp.permission(roleName, CAPABILITY_READ)
      )
    ),
    // Do *not* include in collections backed up and restored during a blue/green switch.
    collections: [],
  };

  xdmp.documentInsert(TENANT_STATUS_URI, doc, options);
  console.log('Changes accepted to the tenant status document.');
}

function getTenantStatus() {
  // No need to return the entire tenant status document.
  return {
    roleName: getTenantRoleName(),
    readOnly: inReadOnlyMode(),
    ...getVersionInfo(),
  };
}

function getTenantRoleName() {
  const roleName = getTenantStatusDocObj().roleName;
  if (roleName !== ROLE_PROD && roleName !== ROLE_NON_PROD) {
    throw new InternalConfigurationError(
      `Tenant status is corrupt: roleName must be '${ROLE_PROD}' or '${ROLE_NON_PROD}', but was: '${roleName}'`
    );
  }
  return roleName;
}

function inReadOnlyMode() {
  const isReadOnly = getTenantStatusDocObj().readOnly;
  if (typeof isReadOnly !== 'boolean') {
    throw new InternalConfigurationError(
      `Tenant status is corrupt: the readOnly property must be a boolean, but has type: ${typeof isReadOnly}`
    );
  }
  return isReadOnly;
}

function getTenantStatusDocObj() {
  if (fn.docAvailable(TENANT_STATUS_URI)) {
    return cts.doc(TENANT_STATUS_URI).toObject();
  }
  throw new InternalConfigurationError(
    `Tenant status document does not exist but is required.`
  );
}

/*
 * Collect the forest information of every database, and organize by node and volume.
 *
 * Presumption: each data directory is on its own volume.
 *
 * This function has an amp to prevent exposing everything the
 * http://marklogic.com/xdmp/privileges/status privilege offers.
 * Call getForestInfoByHostAmp for the amp'd version.
 */
function __getForestInfoByHost() {
  const forestInfoByHost = {};
  xdmp
    .databases()
    .toArray()
    .forEach((databaseId) => {
      xdmp
        .forestStatus(xdmp.databaseForests(databaseId, true))
        .toArray()
        .forEach((forestInfo) => {
          forestInfo = utils.keepProperties(forestInfo, [
            'forestId',
            'forestName',
            'hostId',
            'databaseId',
            'dataDir',
            'journalsSize',
            'largeDataSize',
            'stands',
            'forestReserve',
            'deviceSpace',
          ]);
          // Add up the stand sizes.  Convert the stands object to an array first.
          const standsArr = utils.toArrayFallback(forestInfo.stands);
          forestInfo.forestSize = standsArr.reduce(
            (accumulator, standInfo) => accumulator + standInfo.diskSize,
            0
          );
          delete forestInfo.stands;

          if (!forestInfoByHost[forestInfo.hostId]) {
            forestInfoByHost[forestInfo.hostId] = {};
          }
          if (!forestInfoByHost[forestInfo.hostId][forestInfo.dataDir]) {
            forestInfoByHost[forestInfo.hostId][forestInfo.dataDir] = [];
          }
          forestInfoByHost[forestInfo.hostId][forestInfo.dataDir].push(
            forestInfo
          );
        });
    });
  return forestInfoByHost;
}
const _getForestInfoByHost = import.meta.amp(__getForestInfoByHost);

// By volume, calculate the total known used and reserved for the cluster.
function _calculateTotals(
  forestInfoByHost,
  journalSizeThresholdForReserveMb,
  perJournalReserveMb,
  perVolumeOtherReserveMb
) {
  const hostInfo = {};
  for (const host of Object.keys(forestInfoByHost)) {
    const volumes = forestInfoByHost[host];
    const volumeInfo = {};
    for (const volume of Object.keys(volumes)) {
      const forests = volumes[volume];
      const totals = forests.reduce(
        (runningTotals, currentForest, index, array) => {
          const isLastForest = index === array.length - 1;

          const {
            journalsSize,
            largeDataSize,
            forestReserve: forestReserveSize,
            deviceSpace,
            forestSize,
          } = currentForest;

          let {
            forestsActualMb,
            forestsReserveMb,
            journalsActualMb,
            journalsReserveMb,
            largeDataActualMb,
            totalKnownUsedMb,
            totalReservedMb,
          } = runningTotals;

          forestsActualMb += forestSize;
          forestsReserveMb += forestReserveSize;

          // Adds the diff of the per forest journals reserve and the forest's
          // actual, when the actual falls within a range.  Nothing added to
          // this reserve when the actual is outside the range.  Logic could
          // be more sophisticated / inclusive.
          const additionalJournalsReserveMb =
            journalsSize > journalSizeThresholdForReserveMb &&
            journalsSize < perJournalReserveMb
              ? perJournalReserveMb - journalsSize
              : 0;
          journalsActualMb += journalsSize;
          journalsReserveMb += additionalJournalsReserveMb;

          largeDataActualMb += largeDataSize;

          totalKnownUsedMb += forestSize + journalsSize + largeDataSize;
          totalReservedMb +=
            forestReserveSize +
            additionalJournalsReserveMb +
            (isLastForest ? perVolumeOtherReserveMb : 0);
          const unreservedRemainingMb = deviceSpace - totalReservedMb;

          const totalsMb = {
            forestsActualMb,
            forestsReserveMb,
            journalsActualMb,
            journalsReserveMb,
            largeDataActualMb,
            perVolumeOtherReserveMb,
            totalKnownUsedMb,
            totalReservedMb,
            spaceRemainingMb: deviceSpace,
            unreservedRemainingMb,
            // Approximate as this excludes unknown used storage (e.g., logs)
            // Better to go by unreservedRemainingMb as it does.
            approximateUnreservedRemainingPercent:
              (unreservedRemainingMb / (totalKnownUsedMb + deviceSpace)) * 100,
          };

          if (isLastForest && reportInGb) {
            return {
              forestsActualGb: totalsMb.forestsActualMb / MbToGbDivisor,
              forestsReserveGb: totalsMb.forestsReserveMb / MbToGbDivisor,
              journalsActualGb: totalsMb.journalsActualMb / MbToGbDivisor,
              journalsReserveGb: totalsMb.journalsReserveMb / MbToGbDivisor,
              largeDataActualGb: totalsMb.largeDataActualMb / MbToGbDivisor,
              perVolumeOtherReserveGb: perVolumeOtherReserveMb / MbToGbDivisor,
              totalKnownUsedGb: totalsMb.totalKnownUsedMb / MbToGbDivisor,
              totalReservedGb: totalsMb.totalReservedMb / MbToGbDivisor,
              spaceRemainingGb: totalsMb.spaceRemainingMb / MbToGbDivisor,
              unreservedRemainingGb:
                totalsMb.unreservedRemainingMb / MbToGbDivisor,
              approximateUnreservedRemainingPercent:
                totalsMb.approximateUnreservedRemainingPercent,
              message: _getStorageThresholdMessage(
                totalsMb.approximateUnreservedRemainingPercent
              ),
            };
          } else {
            return totalsMb;
          }
        },
        // Initial Value used for the accumulator of Array.reduce()
        {
          forestsActualMb: 0,
          forestsReserveMb: 0,
          journalsActualMb: 0,
          journalsReserveMb: 0,
          largeDataActualMb: 0,
          totalKnownUsedMb: 0,
          totalReservedMb: 0,
        }
      );
      volumeInfo[volume] = totals;
    }
    hostInfo[xdmp.hostName(host)] = volumeInfo;
  }

  return hostInfo;
}

// Determine and format storage info message.
function _getStorageThresholdMessage(unreservedPercentRemaining) {
  unreservedPercentRemaining =
    Math.round(unreservedPercentRemaining * 100) / 100;
  let msg =
    'OK: There is %remaining space left, which is considered within normal limits.';
  const args = { remaining: `${unreservedPercentRemaining}%` };
  if (unreservedPercentRemaining < LOW_STORAGE_CRITICAL_THRESHOLD) {
    msg =
      'CRITICAL: Only %remaining space left, which is less than the critical low threshold of %threshold. Increase the volume size.';
    args.threshold = `${LOW_STORAGE_CRITICAL_THRESHOLD}%`;
  } else if (unreservedPercentRemaining < LOW_STORAGE_WARNING_THRESHOLD) {
    msg =
      'WARNING: Only %remaining space left, which is less than the warning low threshold of %threshold. Consider increasing the volume size.';
    args.threshold = `${LOW_STORAGE_WARNING_THRESHOLD}%`;
  } else if (unreservedPercentRemaining > HIGH_STORAGE_WARNING_THRESHOLD) {
    msg =
      'WARNING: There is %remaining space left, which is more than the warning high threshold of %threshold. Consider reducing the volume size.';
    args.threshold = `${HIGH_STORAGE_WARNING_THRESHOLD}%`;
  }
  return utils.formatString(msg, args);
}

/*
 * This function is used to calculate the required size of each volume in
 * a cluster.  It accounts for the space forests are presently using on disk,
 * reserved space for forests (e.g., merge), large data, journals, and anything
 * else one wishes to reserve space for on the volumes, such as logs.
 */
function getStorageInfo() {
  return _calculateTotals(
    _getForestInfoByHost(),
    journalSizeThresholdForReserveMb,
    perJournalReserveMb,
    perVolumeOtherReserveMb
  );
}

function _getDataConversionDate() {
  try {
    return fn
      .head(
        cts.search(
          cts.jsonPropertyScopeQuery('conversion-date', cts.trueQuery())
        )
      )
      .xpath('/admin/conversion-date')
      .toString();
  } catch (e) {
    return 'error';
  }
}

function getVersionInfo() {
  return {
    codeVersion: CODE_VERSION,
    dataVersion: _getDataConversionDate(),
    mlVersion: xdmp.version(),
    databaseName: xdmp.databaseName(xdmp.database()),
  };
}

export {
  getStorageInfo,
  getTenantStatus,
  getTenantRoleName,
  getVersionInfo, // subset of getTenantInfo
  inReadOnlyMode,
  setTenantStatus,
};
