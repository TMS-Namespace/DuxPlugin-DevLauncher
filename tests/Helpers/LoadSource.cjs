// LoadSource.cjs - Load one production QML JavaScript module for Node assertions.
const path = require("node:path");
const { load } = require("../../audit/LoadQmlJs.js");
module.exports = relativePath => load(path.resolve(__dirname, "../../src/JS", relativePath));
