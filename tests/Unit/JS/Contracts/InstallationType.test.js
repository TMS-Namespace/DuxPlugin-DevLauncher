// InstallationType.test.js - Check the one installation-type value domain and labels.
// Rules: Runs in plain node; the value domain must stay exactly native, flatpak, and snap, and unknown values must be refused.
const assert = require("node:assert/strict");
const types = require("../../../Helpers/LoadSource.cjs")("Contracts/InstallationType.js");
assert.deepEqual(Array.from(types.values), ["native", "flatpak", "snap"]);
for (const value of types.values) assert.ok(types.isValid(value) && types.label(value));
assert.equal(types.isValid("unknown"), false);
