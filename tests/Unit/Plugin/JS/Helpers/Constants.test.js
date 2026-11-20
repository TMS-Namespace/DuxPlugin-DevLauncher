// Constants.test.js - Check defaults shared by settings and manifest.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const fs = require("node:fs");
const path = require("node:path");
const defaults = source("Helpers/Constants.js");
assert.equal(defaults.trigger, "`");
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../../../plugin.json"), "utf8"));
assert.equal(manifest.trigger, defaults.trigger);
assert.equal(manifest.icon, "account_tree");
assert.equal(defaults.searchPaths, false);
assert.deepEqual({ ...defaults.defaultAgeFilter }, { value: 3, unit: "months" });
assert.equal(defaults.refreshMilliseconds, 10000);
