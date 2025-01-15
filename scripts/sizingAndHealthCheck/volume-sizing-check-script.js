/*
 * This script may be used to calculate the required size of each volume in
 * a cluster.  It accounts for the space forests are presently using on disk,
 * reserved space for forests (e.g., merge), large data, journals, and anything
 * else one wishes to reserve space for on the volumes, such as logs.
 */
const journalSizeThresholdForReserveMb = 10;
const perJournalReserveMb = 4000;
const perVolumeOtherReserveMb = 2000; // logs, for example.
const reportInGb = true; // false = Mb
const MbToGbDivisor = 1024;

function keepProperties(obj, names) {
  const trimmedObj = {};
  names.forEach((name) => {
    trimmedObj[name] = obj[name];
  });
  return trimmedObj;
}

function objectToArray(obj) {
  const arr = [];
  for (let i = 0; i < obj.length; i++) {
    arr.push(obj[i]);
  }
  return arr;
}

// Collect the forest information of every database, and organize by node and volume.
// Presumption: each data directory is on its own volume.
function getForestInfoByHost() {
  const forestInfoByHost = {};
  xdmp
    .databases()
    .toArray()
    .forEach((databaseId) => {
      xdmp
        .forestStatus(xdmp.databaseForests(databaseId, true))
        .toArray()
        .forEach((forestInfo) => {
          forestInfo = keepProperties(forestInfo, [
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
          standsArr = objectToArray(forestInfo.stands);
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

// By volume, calculate the total known used and reserved for the cluster.
function calculateTotals(
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

          const additionalJournalsReserveMb =
            journalsSize > journalSizeThresholdForReserveMb
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
              totalKnownUsedGb: totalsMb.totalKnownUsedMb / MbToGbDivisor,
              totalReservedGb: totalsMb.totalReservedMb / MbToGbDivisor,
              spaceRemainingGb: totalsMb.spaceRemainingMb / MbToGbDivisor,
              unreservedRemainingGb:
                totalsMb.unreservedRemainingMb / MbToGbDivisor,
              // Approximate as this excludes unknown used storage (e.g., logs)
              // Better to go by unreservedRemainingMb as it does.
              approximateUnreservedRemainingPercent:
                totalsMb.approximateUnreservedRemainingPercent,
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

const forestInfoByHost = getForestInfoByHost();
calculateTotals(
  forestInfoByHost,
  journalSizeThresholdForReserveMb,
  perJournalReserveMb,
  perVolumeOtherReserveMb
);
