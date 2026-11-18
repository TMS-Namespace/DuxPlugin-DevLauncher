// ConfigurationRules.test.js - Check folder, provider, and editor configuration.
// Rules: Runs in plain node; folder entries need an ID and type, covered or duplicate folders are refused, and out-of-range depths fall back to 3.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const configuration = source("Helpers/ConfigurationRules.js");
const defaultConfiguration = source("Providers/VSCode/JS/VSCodeProperties.js").defaultConfiguration();
// A saved folder is an entry with its own identifier and source type; the folder path alone is not enough.
const folderId = "7b65f5c6-7284-47cf-9ce2-9a4a71a16571";
// Builds a saved LocalGit folder entry for the given path, using the given identifier or the default test identifier.
const entry = function(folder, id) { return { id: id || folderId, type: "localgit", folder: folder }; };
const ids = ["6a54e4b5-6173-46bf-8bd1-8f3960905460", "7b65f5c6-7284-47cf-9ce2-9a4a71a16571", "8c76a6d7-8395-48d0-8df3-ab5b82b27682"];
assert.deepEqual(Array.from(configuration.folderEntries([entry("/tmp/one", ids[0]), entry("/tmp/two", ids[1]), entry("/tmp/one", ids[2])]), e => e.folder), ["/tmp/one", "/tmp/two"]);
// Strings from the old folder format are dropped, so the saved list is reported and replaced rather than read as folders.
assert.equal(configuration.folderEntries(["/tmp/one"]).length, 0);
// Entries without a valid identifier or a source type are dropped.
assert.equal(configuration.folderEntries([{ installationType: "native", id: "not-a-guid", type: "localgit", folder: "/tmp/x" }]).length, 0);
assert.equal(configuration.folderEntries([{ id: ids[0], folder: "/tmp/x" }]).length, 0);
assert.deepEqual({ ...configuration.folderAddition("/tmp/one/./", [entry("/tmp/one")]) }, { path: "", error: "This folder is already being scanned: /tmp/one" });
assert.match(configuration.folderAddition("/tmp/one/sub", [entry("/tmp/one")]).error, /covered by the scanned folder \/tmp\/one/);
assert.match(configuration.folderAddition("/tmp", [entry("/tmp/one")]).error, /Remove it before adding the parent folder/);
assert.equal(configuration.folderAddition("/tmp/one-more", [entry("/tmp/one")]).path, "/tmp/one-more");
// The alias of a scanned folder is generated from its own identifier.
assert.equal(configuration.folderName(entry("/tmp/one", ids[1])), "Folder 7b65f5");
assert.deepEqual(Array.from(configuration.providers([defaultConfiguration])), [defaultConfiguration]);
assert.equal(configuration.providers([{ installationType: "native", type: "vscode", name: "Old IDE" }]).length, 1);

assert.equal(configuration.indexAfterRemoval(1, 0), 0, "a removed row above the editor moves the editor up");
assert.equal(configuration.indexAfterRemoval(1, 2), 1, "a removed row below the editor leaves the editor in place");
assert.equal(configuration.indexAfterRemoval(1, 1), -1, "removing the edited row closes the editor");
assert.equal(configuration.indexAfterRemoval(-1, 0), -1, "an add-IDE editor is never moved by a removal");
// The repository depth is kept in its range, and the scan bundle carries the depth it was given.
const depthRules = source("Helpers/ConfigurationRules.js");
assert.equal(configuration.repositoryDepth(0), 3);
assert.equal(configuration.repositoryDepth(21), 3);
assert.equal(configuration.repositoryDepth(20), 20);
assert.equal(configuration.scan([], [], 12).depth, 12);

