// SettingsMigration.test.js - Check conversion of folders and provider entries saved in older formats.
// Rules: Runs in plain node; migrated folders and providers gain IDs and types, and keys other than those two pass through untouched.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const migration = source("Storage/SettingsMigration.js");
const configuration = source("Helpers/ConfigurationRules.js");
const existingId = "7b65f5c6-7284-47cf-9ce2-9a4a71a16571";

// A folder saved as a plain path becomes an entry with its own unique identifier and the source type; converted entries are kept.
const folders = migration.folders(
    ["/home/u/code", { id: existingId, type: "localgit", folder: "/home/u/work" }, "/home/u/notes"],
    "localgit"
);
assert.equal(folders.length, 3);
assert.equal(folders[0].folder, "/home/u/code");
assert.equal(folders[0].type, "localgit");
assert.equal(configuration.folderEntries(folders).length, 3, "migrated entries are valid folder entries");
assert.notEqual(folders[0].id, folders[2].id, "each migrated folder gets its own identifier");
assert.notEqual(folders[0].id, existingId);
assert.deepEqual(Array.from(folders.slice(1, 2)), [{ id: existingId, type: "localgit", folder: "/home/u/work" }]);

// An entry saved without an installation type takes its provider type's default; an entry that has one is unchanged.
const defaults = { zed: "flatpak", vscode: "native" };
const providers = migration.installations(
    "providers",
    [
        { id: existingId, type: "zed", name: "Zed" },
        { id: existingId, type: "vscode", installationType: "snap" },
        { id: existingId, type: "unknown", name: "Other" }
    ],
    function (typeId) {
        return defaults[typeId];
    }
);
assert.equal(providers[0].installationType, "flatpak");
assert.equal(providers[1].installationType, "snap");
assert.equal(providers[2].installationType, undefined, "an unknown type is left for validation to report");

// Keys other than providers and folders are returned untouched.
const usage = { "/tmp/a": { count: 1 } };
assert.equal(
    migration.installations("usage", usage, function () {
        return "native";
    }),
    usage
);
