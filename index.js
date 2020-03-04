const jsonLatestVersionApp = require("./resources/latest.json");
const axios = require("axios");
const pfs = require("pfs");

const setupFeedURL = async url => {
  // http://206.189.37.133/self-update/latest.json
  return await axios
    .get(`${url}/latest.json`)
    .then(result => result.data)
    .catch(error => error.message);
};

function compareIsNewDate(oldVer, newVer) {
  oldVer = new Date(oldVer);
  newVer = new Date(newVer);
  if (newVer - oldVer > 0) {
    return true;
  }
  return false;
}

function compareIsNewerVersion(oldVer, newVer) {
  const oldParts = oldVer.split(".");
  const newParts = newVer.split(".");
  for (var i = 0; i < newParts.length; i++) {
    const a = parseInt(newParts[i]) || 0;
    const b = parseInt(oldParts[i]) || 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return false;
}

async function doCheckUpdate() {
  const appUrl = "http://206.189.37.133/self-update";
  const jsonLatestVersionServer = await setupFeedURL(appUrl);
  const isNewVersion = isNewVersionAvalible(
    jsonLatestVersionApp,
    jsonLatestVersionServer
  );
  if (isNewVersion) {
    const fullAppName = generateFullAppName(jsonLatestVersionServer);
    const downloadLink = `${appUrl}/${fullAppName}`;
    const tempPath = getTempPath();
    const isDownloadFinish = await doDownloadFileFromServer(
      fullAppName,
      downloadLink,
      tempPath
    );
    console.log(isDownloadFinish);
  }
}
function getTempPath() {
  return `./temp`;
}
async function doDownloadFileFromServer(fullAppName, downloadLink, tempPath) {
  return new Promise(async (resolve, reject) => {
    await axios({
      url: downloadLink,
      method: "GET",
      responseType: "stream"
    })
      .then(result => {
        const readStream = pfs.createWriteStream(`${tempPath}/${fullAppName}`);
        result.data.pipe(readStream);
        result.data.on("close", () => {
          resolve(true);
        });
      })
      .catch(error => reject(false));
  });
}
function generateFullAppName(jsonServer) {
  const { appName, version } = jsonServer;
  return `${appName}-x64-${version}.exe`;
}

function isNewVersionAvalible(jsonApp, jsonServer) {
  if (
    compareIsNewerVersion(jsonApp.version, jsonServer.version) &&
    compareIsNewDate(jsonApp.releaseDate, jsonServer.releaseDate)
  ) {
    return true;
  }
  return false;
}

doCheckUpdate();
