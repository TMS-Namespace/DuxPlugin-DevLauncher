// LauncherRules.test.js - Check deduplication, searching, ranking, and display limits.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const { codeId, codiumId, api, properties, records, configured } = require("../../../Helpers/ProviderFixture.cjs");
const rules = source("Helpers/LauncherRules.js");
assert.equal(configured.length, 2);
assert.deepEqual(Array.from(configured[0].extraArguments), ["--reuse-window"]);
const merged = rules.merge(records.concat([{ path: "/tmp/project", kind: "repository", provider: "", recent: 0 }]), {});
assert.equal(merged.length, 2);
assert.equal(merged.find(record => record.path === "/tmp/project").kind, "repository");
assert.deepEqual(Array.from(merged.find(record => record.path === "/tmp/project").sources), ["Code", "Git repository scan"]);
const entries = rules.items(merged, "project @VSCodium", 10, configured, codeId);
assert.equal(entries.length, 1);
assert.equal(entries[0].provider, codiumId);
assert.equal(entries[0].sourceProvider, codeId);
assert.equal(source("Helpers/ConfigurationRules.js").defaultProvider(codeId, configured), codeId);
assert.equal(source("Helpers/ConfigurationRules.js").defaultProvider("Code", configured), "");
assert.equal(rules.items(merged, "project", 10, configured.map(provider => ({ ...provider, name: provider.name + " Renamed" })), codeId)[0].provider, codeId);
assert.equal(entries[0].openedAt, 100);
assert.equal(entries[0].comment.includes("Open with"), false);
assert.equal(entries[0].comment, "/tmp/project");
assert.equal(rules.items(merged, "@Unknown", 10, configured, codeId).length, 0);
assert.equal(rules.items(merged, "project", 10, [], "")[0].provider, "");
assert.equal(rules.items(merged, "project @VSCode", 10, [{ id: codeId, name: "VS Code" }], "")[0].provider, codeId);
assert.equal(rules.items([{ path: "/tmp/solo", kind: "repository", provider: "", recent: 0 }], "solo", 10, [{ name: "VS Code" }], "")[0].provider, "");
const nestedItem = [{ path: "/tmp/project-folder/report.txt", kind: "file", provider: "", recent: 1 }];
assert.equal(rules.items(nestedItem, "project-folder", 10, [], "").length, 0);
assert.equal(rules.items(nestedItem, "project-folder", 10, [], "", null, true).length, 1);
assert.equal(rules.items(nestedItem, "report", 10, [], "").length, 1);
assert.equal(rules.items(nestedItem, "project report", 10, [], "", null, true).length, 0);
assert.equal(rules.recordLaunch({}, "/tmp/project", 200, 10)["/tmp/project"].count, 1);
const ranked = rules.merge([
    { path: "/tmp/older", kind: "folder", provider: "Code", recent: 10 },
    { path: "/tmp/newer", kind: "folder", provider: "Code", recent: 20 },
    { path: "/tmp/tied", kind: "folder", provider: "Code", recent: 20 }
], { "/tmp/tied": { count: 3, recent: 20 }, "/tmp/older": { count: 100, recent: 10 } });
assert.deepEqual(Array.from(ranked, record => record.path), ["/tmp/tied", "/tmp/newer", "/tmp/older"]);
const eligiblePage = rules.items(ranked, "", 1, configured, codeId, function(record) { return record.path !== "/tmp/tied"; });
assert.deepEqual(Array.from(eligiblePage, item => item.path), ["/tmp/newer"]);
const displayedOrder = rules.rank(rules.merge([
    { path: "/tmp/database-first", kind: "file", provider: codeId, recent: 1000, openedAt: 1000 },
    { path: "/tmp/actually-newer", kind: "file", provider: codeId, recent: 900, openedAt: 900 }
], {}).map(function(record) { return Object.assign({}, record, { modifiedAt: record.path.endsWith("database-first") ? 100 : 800 }); }), 1200);
assert.deepEqual(Array.from(displayedOrder, record => record.path), ["/tmp/actually-newer", "/tmp/database-first"]);
assert.deepEqual(Array.from(rules.items(displayedOrder, "", 10, configured, ""), item => item.recent), [800, 100]);
const launchedOrder = rules.rank(rules.merge([
    { path: "/tmp/history", kind: "file", recent: 500, openedAt: 500 },
    { path: "/tmp/launched", kind: "file", recent: 100, openedAt: 100 }
], { "/tmp/launched": { count: 1, recent: 700 } }).map(function(record) { return Object.assign({}, record, { modifiedAt: 50 }); }), 1200);
assert.equal(launchedOrder[0].path, "/tmp/launched");
const tiedOrder = rules.rank([{ path: "/tmp/low-count", recent: 10, openedAt: 10, modifiedAt: 10, count: 1 }, { path: "/tmp/high-count", recent: 10, openedAt: 10, modifiedAt: 10, count: 3 }], 1200);
assert.equal(tiedOrder[0].path, "/tmp/high-count");
const overlappingHistory = rules.merge([
    { path: "/tmp/shared.js", kind: "file", provider: codeId, providerName: "Code", recent: 10, openedAt: 10 },
    { path: "/tmp/shared.js", kind: "file", provider: codiumId, providerName: "VSCodium", recent: 20, openedAt: 20 }
], {});
assert.equal(overlappingHistory[0].openedAt, 20);
assert.equal(overlappingHistory[0].provider, codiumId);
const pluginLimits = source("Helpers/Config.js");
const resultRules = source("Helpers/ResultRules.js");
const historyEntries = Array.from({ length: 77 }, function(value, index) {
    return { folderUri: "file:///tmp/folder-" + index };
}).concat(Array.from({ length: 48 }, function(value, index) {
    return { fileUri: "file:///tmp/file-" + index + ".js" };
}));
const historyShape = api.parseHistory({ history: { entries: historyEntries }, modifiedAt: 1000 }, properties);
const allHistory = rules.merge(historyShape, {});
const visibleHistory = rules.items(allHistory, "", resultRules.limit(undefined), configured, "Code");
assert.equal(visibleHistory.length, pluginLimits.defaultResultsLimit);
assert.equal(visibleHistory.filter(item => item.kind === "file").length, 23);
const lateFile = rules.items(allHistory, "file-47", resultRules.limit(undefined), configured, "Code");
assert.equal(lateFile.length, 1);
assert.equal(lateFile[0].path, "/tmp/file-47.js");
assert.equal(rules.items(allHistory, "file", 25, configured, "Code").length, 25);
