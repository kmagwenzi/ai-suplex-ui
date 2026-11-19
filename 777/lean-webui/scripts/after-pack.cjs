"use strict";

/**
 * after-pack.cjs — put the console beside the shell, exactly as built.
 *
 * electron-builder will not copy a node_modules tree through extraResources: it
 * strips it, and the Next standalone server is dead without its traced runtime.
 * So the tree is copied here, after packing, where nothing filters it.
 */

const fs = require("node:fs");
const path = require("node:path");

module.exports = async function afterPack(context) {
  const source = path.join(context.packager.projectDir, "dist-app");
  const target = path.join(context.appOutDir, "resources", "app");

  if (!fs.existsSync(path.join(source, "server.js"))) {
    throw new Error("afterPack: dist-app/server.js is missing — run npm run bundle first");
  }

  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
};
