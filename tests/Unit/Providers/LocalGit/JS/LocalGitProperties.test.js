// LocalGitProperties.test.js - Folder scans accept only native installations.
// Rules: Runs in plain node; flatpak, snap, and unknown installation types must be refused for folder scans.
const assert = require("node:assert/strict");
const properties = require("../../../../Helpers/LoadSource.cjs")("Providers/LocalGit/JS/LocalGitProperties.js");
const defaults = properties.defaultConfiguration();
assert.equal(properties.create(defaults).installationType, "native");
for (const installationType of ["flatpak", "snap", "unknown"]) {
    assert.throws(() => properties.create({ ...defaults, installationType }));
}
