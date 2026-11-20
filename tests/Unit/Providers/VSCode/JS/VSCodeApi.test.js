// VSCodeApi.test.js - Check VS Code sources, parsing, arguments, and history order.
// Rules: Runs in plain node; VS Code arguments and Flatpak or snap commands must follow the declared installation type, and history must keep its order.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const { codeId, api, properties, records } = require("../../../../Helpers/ProviderFixture.cjs");
assert.equal(api.validateArguments("1.99.0", "", properties), true);
assert.throws(() =>
    api.validateArguments("1.99.0", "Warning: 'bad-switch' is not in the list of known options", properties)
);
const missingSwitchValue = source("Providers/VSCode/JS/VSCodeProperties.js").create({
    installationType: "native",
    id: codeId,
    name: "Code",
    config: "~/.config/Code",
    executable: "code",
    extraArguments: ["--profile"]
});
assert.throws(() => api.validateArguments("1.99.0", "", missingSwitchValue));
assert.ok(api.sources(properties).length >= 2);
assert.deepEqual(Array.from(api.launchArgs("/tmp/project", properties, "/home/test")), [
    "code",
    "--reuse-window",
    "--profile",
    "Work",
    "/tmp/project"
]);
assert.equal(records.length, 3);
assert.equal(records[1].path, "vscode-remote://host/project");
assert.equal(records[2].kind, "file");
// Each entry's date is the previous entry's date less its own step: (1.13 ^ order_index) hours, capped at ten days.
const hour = 60 * 60 * 1000;
const cap = 240 * hour;
const steps = (count) => Array.from({ length: count }, (value, index) => Math.min(Math.pow(1.13, index) * hour, cap));
const plainRecords = JSON.parse(JSON.stringify(records));
let expectedDate = 1700000000000;
const expectedDates = steps(3).map((step) => (expectedDate = Math.round(expectedDate - step)));
assert.deepEqual(
    plainRecords.map((record) => record.openedAt),
    expectedDates
);
assert.deepEqual(
    plainRecords.map((record) => record.recent),
    expectedDates
);
// Far down the list each step is capped at ten days, and every entry stays strictly older than the one before it.
const deepRecords = api.parseHistory(
    {
        history: {
            entries: Array.from({ length: 120 }, (value, index) => ({ folderUri: "file:///tmp/item" + index }))
        },
        modifiedAt: 1700000000000
    },
    properties
);
const deepDates = JSON.parse(JSON.stringify(deepRecords)).map((record) => record.openedAt);
assert.ok(
    deepDates.every((date, index) => index === 0 || date < deepDates[index - 1]),
    "every entry is older than the one before"
);
assert.equal(deepDates[119], Math.round(1700000000000 - steps(120).reduce((total, step) => total + step, 0)));
// Without a history file time, the stored order must still rank the most recent entry first.
const undatedRecords = api.parseHistory(
    { history: { entries: [{ folderUri: "file:///tmp/newest" }, { folderUri: "file:///tmp/older" }] }, modifiedAt: 0 },
    properties
);
assert.equal(undatedRecords.length, 2);
assert.ok(
    undatedRecords[0].recent > undatedRecords[1].recent,
    "undated history keeps the IDE's most-recent-first order"
);
assert.ok(undatedRecords[1].recent > 0, "undated history stays positive so it ranks above nothing");
const defaultConfiguration = source("Providers/VSCode/JS/VSCodeProperties.js").defaultConfiguration();
assert.equal(defaultConfiguration.name, "VS Code");
assert.equal(defaultConfiguration.config, "~/.config/Code");
assert.equal(defaultConfiguration.shared, "~/.vscode-shared");
const defaultApi = api;
const defaultProperties = source("Providers/VSCode/JS/VSCodeProperties.js").create(defaultConfiguration);
assert.equal(defaultProperties.settings.configDirectory, "~/.config/Code");
assert.equal(defaultProperties.settings.sharedStorageDirectory, "~/.vscode-shared");
assert.throws(() =>
    source("Providers/VSCode/JS/VSCodeProperties.js").create({
        installationType: "native",
        name: "Bad",
        config: "relative",
        executable: "code"
    })
);
assert.equal(defaultApi.sources(defaultProperties)[0].path, "~/.vscode-shared/sharedStorage/state.vscdb");

// Real file-URL encoding preserves Unicode and legal punctuation through parsing and launch arguments.
const { pathToFileURL } = require("node:url");
for (const filename of [
    "/tmp/Värmland 日本語 العربية 😀",
    "/tmp/quote'\"#$%",
    "/tmp/line\nname\t ",
    "/tmp/back\\slash",
    "/tmp/e\u0301"
]) {
    const parsed = api.parseHistory(
        { history: { entries: [{ fileUri: pathToFileURL(filename).href }] }, modifiedAt: 100 },
        properties
    );
    assert.equal(parsed[0].path, filename);
    assert.equal(api.launchArgs(filename, properties, "/home/test").at(-1), filename);
}

// Flatpak commands use the application ID and preserve additional arguments as separate values.
const vscodeProperties = source("Providers/VSCode/JS/VSCodeProperties.js");
const flatpak = vscodeProperties.create({
    id: codeId,
    name: "Flatpak",
    installationType: "flatpak",
    executable: "/usr/bin/flatpak",
    config: "/tmp/data",
    shared: "",
    extraArguments: ["--reuse-window"]
});
assert.deepEqual(Array.from(api.launchArgs("/tmp/project", flatpak, "/home/test")), [
    "/usr/bin/flatpak",
    "run",
    "com.visualstudio.code",
    "--reuse-window",
    "/tmp/project"
]);
assert.deepEqual(Array.from(api.validationArgs(flatpak, "/home/test")), [
    "/usr/bin/flatpak",
    "info",
    "--show-ref",
    "com.visualstudio.code"
]);
assert.equal(api.validateExecutable("app/com.visualstudio.code/x86_64/stable", flatpak), true);
assert.throws(() => api.validateExecutable("app/dev.zed.Zed/x86_64/stable", flatpak));
const snap = vscodeProperties.create({
    id: codeId,
    name: "Snap",
    installationType: "snap",
    executable: "/usr/bin/snap",
    config: "/tmp/data",
    shared: "",
    extraArguments: ["--reuse-window"]
});
assert.deepEqual(Array.from(api.launchArgs("/tmp/my project", snap, "/home/test")), [
    "/usr/bin/snap",
    "run",
    "code",
    "--reuse-window",
    "/tmp/my project"
]);
assert.deepEqual(Array.from(api.validationArgs(snap, "/home/test")), ["/usr/bin/snap", "list", "code"]);
assert.equal(api.validateExecutable("Name  Version  Rev  Tracking\ncode  1.99  123  latest/stable\n", snap), true);
assert.throws(() => api.validateExecutable("Name  Version\nother  1.0", snap));
assert.equal(
    source("Providers/VSCode/JS/VSCodeDescriptor.js")
        .create()
        .installations.find((option) => option.type === "snap").config,
    "~/.config/Code"
);

const flatpakDefaults = vscodeProperties.create({
    id: codeId,
    name: "Flatpak",
    installationType: "flatpak",
    executable: "/usr/bin/flatpak",
    config: "~/.var/app/com.visualstudio.code/config/Code",
    shared: "~/.var/app/com.visualstudio.code/.vscode-shared",
    extraArguments: []
});
assert.equal(
    api
        .validationPaths(flatpakDefaults, "/home/test", "")
        .find((target) => target.field === "shared" && target.kind === "directory").optional,
    true
);

// VS Code remote URIs are reported and launched with the IDE's URI switches.
const remoteUri = "vscode-remote://ssh-remote+server/work/my%20file.js";
const remoteRecords = api.parseHistory(
    {
        history: {
            entries: [
                { fileUri: remoteUri },
                { folderUri: { scheme: "vscode-remote", authority: "ssh-remote+server", path: "/work/project" } }
            ]
        },
        modifiedAt: 100
    },
    properties
);
assert.equal(remoteRecords[0].path, remoteUri);
assert.equal(remoteRecords[1].path, "vscode-remote://ssh-remote+server/work/project");
assert.deepEqual(Array.from(api.launchArgs(remoteUri, properties, "/home/test", "file")).slice(-2), [
    "--file-uri",
    remoteUri
]);
assert.deepEqual(Array.from(api.launchArgs(remoteRecords[1].path, properties, "/home/test", "folder")).slice(-2), [
    "--folder-uri",
    remoteRecords[1].path
]);

assert.deepEqual(
    Array.from(
        api.launchArgs(
            "vscode-remote://ssh-remote+server/work/test.code-workspace",
            properties,
            "/home/test",
            "workspace"
        )
    ).slice(-2),
    ["--file-uri", "vscode-remote://ssh-remote+server/work/test.code-workspace"]
);
