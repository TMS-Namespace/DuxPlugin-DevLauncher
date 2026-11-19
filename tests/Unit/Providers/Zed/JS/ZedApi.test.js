// ZedApi.test.js - Check history normalization and native/Flatpak launch arguments.
// Rules: Runs in plain node; launch and validation arguments must follow the declared installation type, not the executable's name.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const api = source("Providers/Zed/JS/ZedApi.js").create();
const propertiesModule = source("Providers/Zed/JS/ZedProperties.js");
const properties = propertiesModule.create(propertiesModule.defaultConfiguration());
const records = api.parseHistory(
    {
        rows: [
            { path: "/tmp/日本語", kind: "folder", timestamp: "2026-11-17 10:00:00" },
            { path: "/tmp/file.js", kind: "file", timestamp: "2026-11-17 10:00:00" },
            { path: "ssh://remote/file", kind: "file" }
        ]
    },
    properties
);
assert.equal(records.length, 3);
assert.equal(records[2].path, "ssh://remote/file");
assert.equal(records[0].openedAt, Date.parse("2026-11-17T10:00:00Z"));
assert.deepEqual(Array.from(api.launchArgs("/tmp/日本語", properties, "/home/test")), [
    "/usr/bin/flatpak",
    "run",
    "dev.zed.Zed",
    "/tmp/日本語"
]);
assert.deepEqual(Array.from(api.validationArgs(properties, "/home/test")), [
    "/usr/bin/flatpak",
    "info",
    "--show-ref",
    "dev.zed.Zed"
]);
assert.equal(api.validateExecutable("app/dev.zed.Zed/x86_64/stable\n", properties), true);
assert.throws(() => api.validateExecutable("app/other/x86_64/stable", properties));
properties.executable = "/usr/bin/zed";
properties.installationType = "native";
properties.extraArguments = ["--new"];
assert.deepEqual(Array.from(api.launchArgs("/tmp/file.js", properties, "/home/test")), [
    "/usr/bin/zed",
    "--new",
    "/tmp/file.js"
]);
assert.equal(api.validateExecutable("Zed 1.28.1", properties), true);
assert.throws(() => api.validateHistory([], properties));

const repeated = api.parseHistory(
    {
        rows: [
            { path: "/tmp/item", kind: "folder", timestamp: "2026-11-17 10:00:00" },
            { path: "/tmp/item", kind: "file", timestamp: "2026-10-17 10:00:00" }
        ]
    },
    properties
);
assert.equal(repeated.length, 1);
assert.equal(repeated[0].kind, "file");
assert.equal(repeated[0].openedAt, Date.parse("2026-11-17T10:00:00Z"));

// The declared installation type, not the executable's name, determines the launch command.
properties.installationType = "flatpak";
properties.executable = "/opt/custom-flatpak";
assert.deepEqual(Array.from(api.launchArgs("/tmp/project", properties, "/home/test")), [
    "/opt/custom-flatpak",
    "run",
    "dev.zed.Zed",
    "--new",
    "/tmp/project"
]);
const snap = propertiesModule.create({
    id: properties.providerId,
    name: "Zed",
    installationType: "snap",
    executable: "/usr/bin/snap",
    config: "/tmp/data",
    extraArguments: ["--new"]
});
assert.deepEqual(Array.from(api.launchArgs("/tmp/my project", snap, "/home/test")), [
    "/usr/bin/snap",
    "run",
    "zed",
    "--new",
    "/tmp/my project"
]);
assert.deepEqual(Array.from(api.validationArgs(snap, "/home/test")), ["/usr/bin/snap", "list", "zed"]);
assert.equal(api.validateExecutable("Name Version Rev Tracking\nzed 1.0 5 stable\n", snap), true);
assert.throws(() => api.validateExecutable("Name Version\nother 1.0", snap));
assert.equal(
    source("Providers/Zed/JS/ZedDescriptor.js")
        .create()
        .installations.find((option) => option.type === "snap").config,
    "~/.local/share/zed"
);

// Remote workspace paths retain their connection identity and can be opened without probing the host.
const remoteRecords = api.parseHistory(
    {
        rows: [
            {
                path: "/work/project",
                kind: "folder",
                remoteId: 7,
                connection: { kind: "ssh", host: "server", user: "dev", port: 2222 }
            },
            { path: "/work/other", kind: "file", remoteId: 8 }
        ]
    },
    properties
);
assert.equal(remoteRecords[0].path, "ssh://dev@server:2222/work/project");
assert.equal(remoteRecords.length, 1, "unlaunchable remote entries must not be reported");

assert.throws(
    () => api.launchArgs("zed-remote://connection-8/work/other", properties, "/home/test"),
    /remote connection/
);

assert.equal(api.parseHistory({ rows: [{ path: "other-scheme://host/file", kind: "file" }] }, properties).length, 0);

const badEndpoint = api.parseHistory(
    { rows: [{ path: "/work", remoteId: 3, connection: { kind: "ssh", host: "host name", port: 22 } }] },
    properties
);
assert.equal(badEndpoint.length, 0);
const ipv6 = api.parseHistory(
    { rows: [{ path: "/work", remoteId: 3, connection: { kind: "ssh", host: "2001:db8::1", port: 22 } }] },
    properties
);
assert.equal(ipv6[0].path, "ssh://[2001:db8::1]:22/work");
