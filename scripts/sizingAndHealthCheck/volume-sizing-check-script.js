const DEFAULT_JOURNAL_RESERVE = 2000;

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
        .forestStatus(xdmp.databaseForests(databaseId, false))
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

// Given forestInfoByHost and an expected journal reserve size, calculate the total storage used by each volume on each host
function calculateTotals(forestInfoByHost, journalReserve) {
  const hostInfo = {};
  for (const host of Object.keys(forestInfoByHost)) {
    const volumes = forestInfoByHost[host];
    const volumeInfo = {};
    for (const volume of Object.keys(volumes)) {
      const forests = volumes[volume];
      const totals = forests.reduce(
        (totals, current, index, array) => {
          const {
            journalsSize,
            largeDataSize,
            forestReserve: forestReserveSize,
            deviceSpace,
            forestSize,
          } = current;
          let {
            numberOfQualifiedJournals,
            journal,
            largeData,
            forest,
            forestReserve,
            overall,
          } = totals;
          let journalSizeAddition = 0;
          if (journalsSize > 10) {
            numberOfQualifiedJournals += 1;
            journalSizeAddition = journalReserve;
          }
          journal += journalSizeAddition;
          largeData += largeDataSize;
          forest += forestSize;
          forestReserve += forestReserveSize;
          overall =
            overall +
            journalSizeAddition +
            largeDataSize +
            forestSize +
            forestReserveSize;

          return {
            numberOfQualifiedJournals,
            journal,
            largeData,
            forest,
            forestReserve,
            overall,
            deviceSpace,
            percentUsed:
              index === array.length - 1
                ? (overall / deviceSpace) * 100
                : undefined,
          };
        },
        // Initial Value used for the accumulator of Array.reduce()
        {
          numberOfQualifiedJournals: 0,
          journal: 0,
          largeData: 0,
          forest: 0,
          forestReserve: 0,
          overall: 0,
        }
      );
      volumeInfo[volume] = totals;
    }
    hostInfo[host] = volumeInfo;
  }

  return hostInfo;
}

const forestInfoByHost = getForestInfoByHost();
calculateTotals(forestInfoByHost, DEFAULT_JOURNAL_RESERVE);
