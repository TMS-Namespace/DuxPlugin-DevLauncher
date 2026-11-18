// LocalGitProperties.test.js - Check that one scanned folder is declared as a normalized absolute local path.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const properties = source("Providers/LocalGit/LocalGitProperties.js");
const id = "9f8e7d6c-5b4a-4c3b-8a2d-1e0f9a8b7c6d";

const declared = properties.create({ id: id, name: "Folder 9f8e7d", folder: "/tmp/projects/../projects", depth: 2 });
assert.equal(declared.settings.folder, "/tmp/projects");
assert.equal(declared.executable, "find");
assert.deepEqual(Array.from(declared.extraArguments), []);
assert.equal(declared.providerId, id);

// A folder must be an absolute local path; a relative or empty folder is refused as a configuration error.
assert.throws(() => properties.create({ id: id, folder: "relative/path" }), error => error.code === "providerConfig");
assert.throws(() => properties.create({ id: id, folder: "" }), error => error.code === "providerConfig");

// The contributor placeholder is itself a valid declaration.
assert.equal(properties.create(properties.defaultConfiguration()).settings.folder, "/");
