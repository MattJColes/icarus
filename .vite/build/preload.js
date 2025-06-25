"use strict";
const electron = require("electron");
const electronAPI = {
  invoke: (channel, data) => electron.ipcRenderer.invoke(channel, data),
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  },
  getVersion: () => electron.ipcRenderer.invoke("app:version"),
  getPlatformInfo: () => electron.ipcRenderer.invoke("platform:info"),
  minimize: () => electron.ipcRenderer.invoke("window:minimize"),
  maximize: () => electron.ipcRenderer.invoke("window:maximize"),
  close: () => electron.ipcRenderer.invoke("window:close")
};
electron.contextBridge.exposeInMainWorld("electron", electronAPI);
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
