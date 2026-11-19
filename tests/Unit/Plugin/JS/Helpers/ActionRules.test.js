// ActionRules.test.js - Check per-result actions and details.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const { codeId, codiumId, configured } = require("../../../../Helpers/ProviderFixture.cjs");
const rules = source("Helpers/LauncherRules.js");
// A project that VS Code reported and a repository scan also found: one cache entry with both sources, ordered by date.
const cacheEntry = {
    path: "/tmp/project",
    name: "project",
    kind: "repository",
    date: 100,
    count: 0,
    lastIde: "",
    modifiedAt: 0,
    statAt: 0,
    datedAt: Date.now(),
    launchedAt: 0,
    scannedAt: Date.now(),
    sources: [
        { id: codeId, name: "Code", openedAt: 100 },
        { id: codiumId, name: "VSCodium", openedAt: 50 }
    ]
};
const entries = rules.items([cacheEntry], "project @VSCodium", {
    limit: 10,
    providers: configured,
    defaultProvider: codeId,
    cutoff: 0,
    searchPaths: false,
    now: Date.now()
});
const actionRules = source("Helpers/ActionRules.js");
assert.deepEqual(
    Array.from(actionRules.actions(entries[0], configured), (action) => action.operation),
    ["provider", "provider", "system", "location", "copy", "details"]
);
assert.equal(actionRules.actions(entries[0], configured)[1].provider, codiumId);
assert.deepEqual(
    Array.from(
        actionRules.actions(entries[0], configured).filter((action) => action.operation === "provider"),
        (action) => action.text
    ),
    ["Open with Code", "Open with VSCodium"]
);
const folderAction = actionRules.actions(entries[0], configured).find((action) => action.operation === "location");
assert.equal(folderAction.text, "Open folder");
assert.equal(folderAction.path, "/tmp/project");
for (const kind of ["file", "workspace"]) {
    const location = actionRules
        .actions({ path: "/tmp/file", kind }, [])
        .find((action) => action.operation === "location");
    assert.equal(location.text, "Open containing folder");
    assert.equal(location.path, "/tmp");
}
assert.equal(
    actionRules.actions({ path: "/tmp/project", kind: "folder" }, []).find((action) => action.operation === "location")
        .path,
    "/tmp/project"
);
assert.match(
    actionRules.details(entries[0], 1700000000000),
    /Path: \/tmp\/project\nSource: Code, VSCodium\nModified: 2023-11-14T22:13:20.000Z/
);
assert.match(
    actionRules.details(entries[0], 1700000000000),
    /Provider history date \(approx\.\): 1970-01-01T00:00:00.100Z/
);
assert.match(actionRules.details(entries[0], Infinity), /Modified: Unavailable/);

// Remote actions name only the IDE installations that actually reported the item.
const remote = { path: "vscode-remote://ssh-remote+host/work/file", kind: "file", sourceProviders: [codeId] };
const remoteActions = actionRules.actions(remote, configured);
assert.deepEqual(
    Array.from(remoteActions, (action) => action.operation),
    ["provider", "copy", "details"]
);
assert.equal(remoteActions[0].provider, codeId);
remote.sourceProviders = [codeId, codiumId];
assert.equal(actionRules.actions(remote, configured).filter((action) => action.operation === "provider").length, 2);
