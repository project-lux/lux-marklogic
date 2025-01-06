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
const forestInfoByVolume = {};
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

        if (!forestInfoByVolume[forestInfo.hostId]) {
          forestInfoByVolume[forestInfo.hostId] = {};
        }
        if (!forestInfoByVolume[forestInfo.hostId][forestInfo.dataDir]) {
          forestInfoByVolume[forestInfo.hostId][forestInfo.dataDir] = [];
        }
        forestInfoByVolume[forestInfo.hostId][forestInfo.dataDir].push(
          forestInfo
        );
      });
  });

forestInfoByVolume;
