// ActionRules.test.js - Check per-result actions and details.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const { codeId, codiumId, records, configured } = require("../../../Helpers/ProviderFixture.cjs");
const rules = source("Helpers/LauncherRules.js");
const merged = rules.merge(records.concat([{ path: "/tmp/project", kind: "repository", provider: "", recent: 0 }]), {});
const entries = rules.items(merged, "project @VSCodium", 10, configured, codeId);
const actionRules = source("Helpers/ActionRules.js");
assert.deepEqual(Array.from(actionRules.actions(entries[0], configured), action => action.operation), ["provider", "provider", "system", "location", "copy", "details"]);
assert.equal(actionRules.actions(entries[0], configured)[1].provider, codiumId);
assert.deepEqual(Array.from(actionRules.actions(entries[0], configured).filter(action => action.operation === "provider"), action => action.text), ["Open with Code", "Open with VSCodium"]);
const folderAction = actionRules.actions(entries[0], configured).find(action => action.operation === "location");
assert.equal(folderAction.text, "Open folder");
assert.equal(folderAction.path, "/tmp/project");
for (const kind of ["file", "workspace"]) {
    const location = actionRules.actions({ path: "/tmp/file", kind }, []).find(action => action.operation === "location");
    assert.equal(location.text, "Open containing folder");
    assert.equal(location.path, "/tmp");
}
assert.equal(actionRules.actions({ path: "/tmp/project", kind: "folder" }, []).find(action => action.operation === "location").path, "/tmp/project");
assert.match(actionRules.details(entries[0], 1700000000000), /Path: \/tmp\/project\nSource: Code, Git repository scan\nModified: 2023-11-14T22:13:20.000Z/);
assert.match(actionRules.details(entries[0], 1700000000000), /Provider history date \(approx\.\): 1970-01-01T00:00:00.100Z/);
assert.match(actionRules.details(entries[0], Infinity), /Modified: Unavailable/);
