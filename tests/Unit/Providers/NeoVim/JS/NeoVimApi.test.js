// NeoVimApi.test.js - Check history normalization, terminal launch arguments, and validation for NeoVim.
// Rules: Runs in plain node; launch arguments must put the terminal's own switches before NeoVim, and every path stays one argument.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = require("../../../../Helpers/LoadSource.cjs");
const { encodeShada } = require("../../../../Helpers/ShadaFixture.cjs");
const api = source("Providers/NeoVim/JS/NeoVimApi.js").create();
const propertiesModule = source("Providers/NeoVim/JS/NeoVimProperties.js");
const properties = propertiesModule.create(propertiesModule.defaultConfiguration());
const plain = (value) => JSON.parse(JSON.stringify(value));

// Encode a ShaDa file in memory and return it as base64, the text the reader receives.
function shadaText(items) {
    return encodeShada(items).toString("base64");
}

// The real NeoVim fixture yields its marked paths, with the folder kind taken from the folder list.
const realText = fs.readFileSync(path.join(__dirname, "..", "fixtures", "nvim-real.shada")).toString("base64");
const records = plain(api.parseHistory({ text: realText, directories: ["/srv/dl-fixture/project"] }, properties));
assert.equal(records.length, 3);
assert.deepEqual(records.map((record) => [record.path, record.kind]).sort(), [
    ["/srv/dl-fixture/project", "folder"],
    ["/srv/dl-fixture/project/main.lua", "file"],
    ["/srv/dl-fixture/project/notes.md", "file"]
]);
assert.ok(
    records.every(
        (record) =>
            record.provider === properties.providerId &&
            record.providerName === "NeoVim" &&
            record.openedAt === record.recent &&
            record.openedAt > 1700000000000
    )
);

// Timestamps come from ShaDa in seconds and are reported in milliseconds, like the other providers.
const timed = plain(
    api.parseHistory(
        { text: shadaText([{ type: 10, timestamp: 1700000000, data: { f: "/srv/a.md" } }]), directories: [] },
        properties
    )
);
assert.equal(timed[0].openedAt, 1700000000000);
assert.equal(timed[0].kind, "file");

// Marked paths alone are listed for the folder check, newest first.
assert.deepEqual(
    plain(
        api.markedPaths({
            text: shadaText([
                { type: 10, timestamp: 5, data: { f: "/srv/old" } },
                { type: 10, timestamp: 9, data: { f: "/srv/new" } }
            ])
        })
    ),
    ["/srv/new", "/srv/old"]
);

// Launch arguments: the terminal's switches come before NeoVim, and the extra arguments and path stay separate.
properties.settings.terminal = "/usr/bin/gnome-terminal";
properties.executable = "/usr/bin/nvim";
properties.extraArguments = ["--clean"];
assert.deepEqual(plain(api.launchArgs("/srv/dl-fixture/project/main.lua", properties, "/home/test")), [
    "/usr/bin/gnome-terminal",
    "--",
    "/usr/bin/nvim",
    "--clean",
    "/srv/dl-fixture/project/main.lua"
]);
properties.settings.terminal = "/opt/bin/kitty";
properties.extraArguments = [];
assert.deepEqual(plain(api.launchArgs("/srv/a folder/file.md", properties, "/home/test")), [
    "/opt/bin/kitty",
    "/usr/bin/nvim",
    "/srv/a folder/file.md"
]);
properties.settings.terminal = "/usr/bin/wezterm";
assert.deepEqual(plain(api.launchArgs("/srv/x", properties, "/home/test")), [
    "/usr/bin/wezterm",
    "start",
    "--",
    "/usr/bin/nvim",
    "/srv/x"
]);
properties.settings.terminal = "/usr/bin/unknown-terminal";
assert.throws(
    () => api.launchArgs("/srv/x", properties, "/home/test"),
    (error) => error.field === "terminal"
);
properties.settings.terminal = "/usr/bin/gnome-terminal";
assert.throws(
    () => api.launchArgs("", properties, "/home/test"),
    (error) => error.code === "providerConfig"
);

// Validation: the executable must name NeoVim, the probe prints its version, and the history must not be empty.
assert.deepEqual(plain(api.validationArgs(properties, "/home/test")), ["/usr/bin/nvim", "--version"]);
assert.equal(api.validateExecutable("NVIM v0.12.6\nBuild type: RelWithDebInfo", properties), true);
assert.throws(
    () => api.validateExecutable("VIM - Vi IMproved 9.1", properties),
    (error) => error.field === "executable"
);
assert.equal(api.validateArguments("", "", Object.assign({}, properties, { extraArguments: ["--clean"] })), true);
assert.throws(() => api.validateArguments("", "", Object.assign({}, properties, { extraArguments: [""] })));
assert.throws(
    () => api.validateHistory([], properties),
    (error) => error.field === "config"
);
assert.equal(api.validateHistory([{ path: "/srv/x" }], properties), true);

// The state folder and terminal are required, while the history file is optional.
const paths = plain(api.validationPaths(properties, "/home/test", "/home/test/.config"));
assert.deepEqual(
    paths.map((target) => [target.label, target.kind, target.optional]),
    [
        ["NeoVim state folder", "directory", false],
        ["NeoVim ShaDa history file", "file", true],
        ["Terminal emulator", "file", false]
    ]
);
assert.equal(paths[1].path, "/home/test/.local/state/nvim/shada/main.shada");

// Damaged history is reported to the reader instead of returning partial records.
assert.throws(
    () => api.parseHistory({ text: "abc", directories: [] }, properties),
    (error) => error.code === "parse"
);
// Flatpak runs NeoVim through flatpak, with its application ID before NeoVim's own arguments.
const flatpakProperties = Object.assign({}, properties, {
    installationType: "flatpak",
    executable: "/usr/bin/flatpak",
    extraArguments: ["--clean"]
});
assert.deepEqual(plain(api.launchArgs("/srv/x", flatpakProperties, "/home/test")), [
    "/usr/bin/gnome-terminal",
    "--",
    "/usr/bin/flatpak",
    "run",
    "io.neovim.nvim",
    "--clean",
    "/srv/x"
]);
assert.deepEqual(plain(api.validationArgs(flatpakProperties, "/home/test")), [
    "/usr/bin/flatpak",
    "info",
    "--show-ref",
    "io.neovim.nvim"
]);
assert.equal(api.validateExecutable("app/io.neovim.nvim/x86_64/stable\n", flatpakProperties), true);
assert.throws(
    () => api.validateExecutable("app/org.example.Other/x86_64/stable", flatpakProperties),
    (error) => error.field === "executable"
);

// Snap runs the classic nvim snap through snap run, and its list output names the package.
const snapProperties = Object.assign({}, properties, {
    installationType: "snap",
    executable: "/usr/bin/snap",
    extraArguments: []
});
assert.deepEqual(plain(api.launchArgs("/srv/x", snapProperties, "/home/test")), [
    "/usr/bin/gnome-terminal",
    "--",
    "/usr/bin/snap",
    "run",
    "nvim",
    "/srv/x"
]);
assert.deepEqual(plain(api.validationArgs(snapProperties, "/home/test")), ["/usr/bin/snap", "list", "nvim"]);
assert.equal(api.validateExecutable("Name  Version  Rev\nnvim   0.12.6   1\n", snapProperties), true);
assert.throws(
    () => api.validateExecutable("Name Version Rev\nother 1.0 1", snapProperties),
    (error) => error.field === "executable"
);

console.log("NeoVimApi tests passed");
