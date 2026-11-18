// LoadSource.cjs - Load one production QML JavaScript module for Node assertions.
const path = require("node:path");
const { load } = require("../../audit/LoadQmlJs.js");
module.exports = relativePath => {
    const base = relativePath.startsWith("Providers/") ? "../../src" : "../../src/Plugin/JS";
    return load(path.resolve(__dirname, base, relativePath));
};
