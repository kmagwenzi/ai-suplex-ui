"use strict";

/**
 * preload.js — the smallest possible bridge.
 *
 * The console runs with nodeIntegration off and contextIsolation on. This exposes
 * exactly one capability the web page cannot have: a native folder chooser. It
 * returns a path and nothing else; the console's API still validates the vault
 * and stores the setting.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("suplexDesktop", {
  pickVault: () => ipcRenderer.invoke("suplex:pick-vault"),
});
