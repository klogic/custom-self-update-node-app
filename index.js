const jsonLatestVersionApp = require("./resources/latest.json");
const axios = require("axios");
const pfs = require("pfs");
const cp = require("child_process");
const path = require("path");

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
        const fullPath = `${tempPath}/${fullAppName}`;
        const readStream = pfs.createWriteStream(fullPath);
        result.data.pipe(readStream);
        result.data.on("close", () => {
          resolve(fullPath);
        });
      })
      .catch(error => reject(null));
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

function doInstall(downloadedFile) {
  const execute = cp.spawn(downloadedFile, [
    "/verysilent",
    "/nocloseapplications"
  ]);
  execute.stdout.on("data", data => {
    console.log(`stdout: ${data}`);
  });
  execute.on("error", error => {
    console.log(`error: ${error}`);
  });
  execute.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });
}

function doUpdateJsonFile(jsonServer) {
  pfs.unlinkSync("./resources/latest.json");
  pfs.writeFile(
    "./resources/latest.json",
    JSON.stringify(jsonServer),
    { flag: "wx" },
    err => {
      if (err) {
        console.log("An error occured while writing JSON Object to File.");
        return console.log(err);
      }

      console.log("JSON file has been saved.");
    }
  );
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
    const downloadedFile = await doDownloadFileFromServer(
      fullAppName,
      downloadLink,
      tempPath
    );
    // const downloadedFile = path.join(__dirname, "/temp/test-app-x64-1.0.1.exe");
    if (downloadedFile) {
      doInstall(downloadedFile);
      doUpdateJsonFile(jsonLatestVersionServer);
    }
  } else {
    console.log(
      `this version ${jsonLatestVersionApp.version} is latest version`
    );
  }
}
doCheckUpdate();
