// LauncherRules.test.js - Check that the launcher filters ordered entries, applies the age cutoff and limit, and presents them.
// Rules: Runs in plain node; items keep their cached order and honor the age cutoff and limit, and the host transformer check runs only when the host source exists.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const { codeId, codiumId, configured } = require("../../../Helpers/ProviderFixture.cjs");
const rules = source("Helpers/LauncherRules.js");
const day = 86400000;
const now = Date.UTC(2026, 10, 17, 12);

// A cache entry as the cache builds it: a date, a count, and the sources that reported it.
function entry(path, date, count, sources, lastIde) {
    return { path: path, name: path.split("/").pop(), kind: "file", date: date, count: count || 0, sources: sources || [], lastIde: lastIde || "", modifiedAt: 0, statAt: 0, datedAt: now, launchedAt: 0, scannedAt: now };
}
// Each entry's date is the date its sources give, as the cache computes it, so the subtitle and the order agree.
const codeSource = { id: codeId, name: "Code", openedAt: now };
const codiumSource = { id: codiumId, name: "VSCodium", openedAt: now - 2 * day };
const entries = [
    entry("/tmp/project-folder/report.txt", now, 0, [codeSource]),
    entry("/tmp/project/notes.md", now - day, 2, [codiumSource], codiumId),
    entry("/tmp/old/archive.zip", now - 400 * day, 9, [{ id: codeId, name: "Code", openedAt: now - 400 * day }])
];

// The entries come in as ordered; the launcher keeps that order and presents them with their chosen IDE and age.
const found = rules.items(entries, "", { limit: 10, providers: configured, defaultProvider: codeId, cutoff: now - 3 * 30 * day, searchPaths: false, now: now });
assert.deepEqual(Array.from(found, item => item.path), ["/tmp/project-folder/report.txt", "/tmp/project/notes.md"]);
assert.equal(found[0].provider, codeId);
assert.equal(found[1].provider, codiumId, "the IDE that launched the item last opens it");
assert.equal(found[1].sourceProvider, codiumId);
assert.deepEqual(Array.from(found[1].sources), ["VSCodium"]);
assert.equal(found[0].comment, "/tmp/project-folder/report.txt");
assert.equal(found[0].ageLabel, "just now");

// A search matches the name, or the whole path when path search is on.
assert.equal(rules.items(entries, "report", { limit: 10, providers: configured, defaultProvider: codeId, cutoff: 0, searchPaths: false, now: now }).length, 1);
assert.equal(rules.items(entries, "project-folder", { limit: 10, providers: configured, defaultProvider: codeId, cutoff: 0, searchPaths: false, now: now }).length, 0);
assert.equal(rules.items(entries, "project-folder", { limit: 10, providers: configured, defaultProvider: codeId, cutoff: 0, searchPaths: true, now: now }).length, 1);

// An @IDE override selects that IDE, and an unknown override shows nothing.
assert.equal(rules.items(entries, "notes @Code", { limit: 10, providers: configured, defaultProvider: codiumId, cutoff: 0, searchPaths: false, now: now })[0].provider, codeId);
assert.equal(rules.items(entries, "@Unknown", { limit: 10, providers: configured, defaultProvider: codeId, cutoff: 0, searchPaths: false, now: now }).length, 0);

// Items older than the cutoff are hidden, and the limit keeps only the first matches in order.
assert.equal(rules.items(entries, "archive", { limit: 10, providers: configured, defaultProvider: codeId, cutoff: now - 3 * 30 * day, searchPaths: false, now: now }).length, 0);
assert.deepEqual(Array.from(rules.items(entries, "", { limit: 1, providers: configured, defaultProvider: codeId, cutoff: 0, searchPaths: false, now: now }), item => item.path), ["/tmp/project-folder/report.txt"]);

// With no launchable IDE, the default is the system opener, and the launch is recorded with the IDE that opened it.
assert.equal(rules.items(entries, "notes", { limit: 10, providers: [], defaultProvider: "", cutoff: 0, searchPaths: false, now: now })[0].provider, "");
const usage = rules.recordLaunch({}, "/tmp/project", codeId, now, 10);
assert.equal(usage["/tmp/project"].count, 1);
assert.equal(usage["/tmp/project"].ide, codeId);

// Cached ranking and filtering must use the same date as the subtitle, even before a source-date refresh is due.
const changedSource = entry("/tmp/changed", now - day, 0, [{ id: codeId, name: "Code", openedAt: now - 5 * day }]);
const unchangedSource = entry("/tmp/unchanged", now - 2 * day, 0, [{ id: codeId, name: "Code", openedAt: now - 2 * day }]);
const stableDates = rules.items([changedSource, unchangedSource], "", { limit: 10, providers: configured, defaultProvider: codeId, cutoff: 0, searchPaths: false, now: now });
assert.deepEqual(Array.from(stableDates, item => item.ageLabel), ["1d ago", "2d ago"]);

// A deduplicated path retains every reporting IDE, excluding folder sources and unavailable IDEs.
const sharedEntry = entry("/tmp/shared.js", now, 0, [codeSource, { id: "folder", name: "Folder", openedAt: now }, codiumSource, { id: "unavailable", name: "Unavailable", openedAt: now }]);
const sharedItem = rules.items([sharedEntry], "shared", { limit: 10, providers: configured, defaultProvider: codeId, cutoff: 0, searchPaths: false, now })[0];
assert.deepEqual(Array.from(sharedItem.sourceProviders), [codeId, codiumId]);

// Dux's actual plugin transformer preserves the supplied primary action and executes the same item.
assert.equal(found[0].primaryAction.name, "Launch");
assert.equal(found[0].primaryAction.action, "execute");
const hostTransformer = require("node:path").join(process.env.DMS_SOURCE_ROOT || "/usr/share/quickshell/dms", "Modals/DLauncherV2/ItemTransformers.js");
if (require("node:fs").existsSync(hostTransformer)) {
    const transform = require("../../../../audit/LoadQmlJs.js").load(hostTransformer);
    const transformed = transform.transformPluginItem(found[0], "devLauncher", "Select");
    assert.equal(transformed.primaryAction.name, "Launch");
    assert.equal(transformed.primaryAction.action, "execute");
    assert.equal(transformed.data.path, found[0].path);
}
