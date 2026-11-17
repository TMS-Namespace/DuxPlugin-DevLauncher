// ConfigurationRules.test.js - Check folder, provider, and editor configuration.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const configuration = source("Helpers/ConfigurationRules.js");
const defaultConfiguration = source("Providers/VSCode/VSCodeProperties.js").defaultConfiguration();
assert.deepEqual(Array.from(configuration.folders(["/tmp/one", "/tmp/two", "/tmp/one"])), ["/tmp/one", "/tmp/two"]);
assert.deepEqual({ ...configuration.folderAddition("/tmp/one/./", ["/tmp/one"]) }, { path: "", error: "This folder is already being scanned: /tmp/one" });
assert.match(configuration.folderAddition("/tmp/one/sub", ["/tmp/one"]).error, /covered by the scanned folder \/tmp\/one/);
assert.match(configuration.folderAddition("/tmp", ["/tmp/one"]).error, /Remove it before adding the parent folder/);
assert.equal(configuration.folderAddition("/tmp/one-more", ["/tmp/one"]).path, "/tmp/one-more");
assert.deepEqual(Array.from(configuration.folders(["/tmp/one", "/tmp/one/sub", "/tmp/one/.", "/tmp/one-more"])), ["/tmp/one", "/tmp/one-more"]);
assert.deepEqual(Array.from(configuration.providers([defaultConfiguration])), [defaultConfiguration]);
assert.equal(configuration.providers([{ type: "vscode", name: "Old IDE" }]).length, 1);

assert.equal(configuration.indexAfterRemoval(1, 0), 0, "a removed row above the editor moves the editor up");
assert.equal(configuration.indexAfterRemoval(1, 2), 1, "a removed row below the editor leaves the editor in place");
assert.equal(configuration.indexAfterRemoval(1, 1), -1, "removing the edited row closes the editor");
assert.equal(configuration.indexAfterRemoval(-1, 0), -1, "an add-IDE editor is never moved by a removal");
