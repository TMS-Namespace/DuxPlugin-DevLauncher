// VSCodeApi.test.js - Check VS Code sources, parsing, arguments, and history order.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const { codeId, api, properties, records } = require("../../../../Helpers/ProviderFixture.cjs");
assert.equal(api.validateArguments("1.99.0", "", properties), true);
assert.throws(() => api.validateArguments("1.99.0", "Warning: 'bad-switch' is not in the list of known options", properties));
const missingSwitchValue = source("Providers/VSCode/VSCodeProperties.js").create({ id: codeId, name: "Code", config: "~/.config/Code", executable: "code", extraArguments: ["--profile"] });
assert.throws(() => api.validateArguments("1.99.0", "", missingSwitchValue));
assert.ok(api.sources(properties).length >= 2);
assert.deepEqual(Array.from(api.launchArgs("/tmp/project", properties, "/home/test")), ["code", "--reuse-window", "--profile", "Work", "/tmp/project"]);
assert.equal(records.length, 2);
assert.equal(records[1].kind, "file");
assert.equal(records[1].openedAt, 100);
// Without a history file time, the stored order must still rank the most recent entry first.
const undatedRecords = api.parseHistory({ history: { entries: [{ folderUri: "file:///tmp/newest" }, { folderUri: "file:///tmp/older" }] }, modifiedAt: 0 }, properties);
assert.equal(undatedRecords.length, 2);
assert.ok(undatedRecords[0].recent > undatedRecords[1].recent, "undated history keeps the IDE's most-recent-first order");
assert.ok(undatedRecords[1].recent > 0, "undated history stays positive so it ranks above nothing");
const defaultConfiguration = source("Providers/VSCode/VSCodeProperties.js").defaultConfiguration();
assert.equal(defaultConfiguration.name, "VS Code");
assert.equal(defaultConfiguration.config, "~/.config/Code");
assert.equal(defaultConfiguration.shared, "~/.vscode-shared");
const defaultApi = api;
const defaultProperties = source("Providers/VSCode/VSCodeProperties.js").create(defaultConfiguration);
assert.equal(defaultProperties.settings.configDirectory, "~/.config/Code");
assert.equal(defaultProperties.settings.sharedStorageDirectory, "~/.vscode-shared");
assert.throws(() => source("Providers/VSCode/VSCodeProperties.js").create({ name: "Bad", config: "relative", executable: "code" }));
assert.equal(defaultApi.sources(defaultProperties)[0].path, "~/.vscode-shared/sharedStorage/state.vscdb");
