// SettingsIntegrity.test.js - Check list damage detection before saved data is replaced.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const integrity = source("Helpers/SettingsIntegrity.js");

assert.equal(integrity.damaged("folders", ["/tmp/one", "/tmp/one/sub"]), true);
assert.equal(integrity.damaged("folders", ["/tmp/one", "/tmp/two"]), false);
assert.equal(integrity.damaged("folders", "invalid"), true);
assert.equal(integrity.damaged("providers", [{ id: "one" }, null]), true);
assert.equal(integrity.damaged("providers", [{ id: "one" }]), false);
assert.equal(integrity.damaged("folders", undefined), false);
assert.equal(integrity.damaged("folders", null), true);
assert.equal(integrity.damaged("usage", null), true);
assert.equal(integrity.damaged("usage", { "/tmp/file": { count: 2, recent: 5 } }), false);
assert.equal(integrity.damaged("ageFilter", { value: 3, unit: "months" }), false);
assert.equal(integrity.damaged("ageFilter", { value: 0, unit: "months" }), true);
assert.equal(integrity.damaged("resultsLimit", 50), false);
assert.equal(integrity.damaged("repositoryDepth", 21), true);
assert.equal(integrity.damaged("trigger", "a2"), true);
assert.equal(integrity.damaged("searchPaths", "yes"), true);


// Compare plain data by its JSON form, because the loader evaluates modules in another JS realm.
const same = (actual, expected) => assert.equal(JSON.stringify(actual), JSON.stringify(expected));

// A damaged value is added to the backup under its key, and earlier copies stay in place.
const firstBackup = integrity.withBackup({}, "folders", ["/tmp/one", "/tmp/one/sub"]);
same(firstBackup.folders, [["/tmp/one", "/tmp/one/sub"]]);
const secondBackup = integrity.withBackup(firstBackup, "folders", "invalid");
same(secondBackup.folders, [["/tmp/one", "/tmp/one/sub"], "invalid"]);
same(firstBackup.folders, [["/tmp/one", "/tmp/one/sub"]]);

// A backup container that is not an object is kept under "unreadable" instead of refusing the save.
const corruptContainer = integrity.withBackup("corrupt text", "providers", [{ id: "one" }, null]);
same(corruptContainer.unreadable, ["corrupt text"]);
same(corruptContainer.providers, [[{ id: "one" }, null]]);

// A backup entry under a known key that is not a list is kept under "unreadable" before the new copy is added.
const corruptEntry = integrity.withBackup({ folders: "not a list" }, "folders", ["/tmp/two"]);
same(corruptEntry.unreadable, ["not a list"]);
same(corruptEntry.folders, [["/tmp/two"]]);

// With no earlier backup container there is nothing to keep under "unreadable".
assert.equal(integrity.withBackup(undefined, "folders", ["/tmp/three"]).unreadable, undefined);
