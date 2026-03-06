"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  getPathForFile: (file) => electron.webUtils.getPathForFile(file),
  scanPaths: (paths) => electron.ipcRenderer.invoke("scan-paths", paths),
  startConversion: (items) => electron.ipcRenderer.send("start-conversion", items),
  onProgress: (cb) => {
    electron.ipcRenderer.removeAllListeners("progress");
    electron.ipcRenderer.on("progress", (_event, data) => cb(data));
  },
  onComplete: (cb) => {
    electron.ipcRenderer.removeAllListeners("complete");
    electron.ipcRenderer.on("complete", (_event, data) => cb(data));
  },
  onError: (cb) => {
    electron.ipcRenderer.removeAllListeners("error");
    electron.ipcRenderer.on("error", (_event, message) => cb(message));
  }
});
