// NeoVimApi.test.js - Check history normalization, terminal-command launches, and the terminal and NeoVim checks.
// Rules: Runs in plain node; the terminal command is split into words, every path stays one argument, and the program runs after the terminal.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = require("../../../../Helpers/LoadSource.cjs");
const { encodeShada } = require("../../../../Helpers/ShadaFixture.cjs");
const api = source("Providers/NeoVim/JS/NeoVimApi.js").create();
const propertiesModule = source("Providers/NeoVim/JS/NeoVimProperties.js");
const properties = propertiesModule.create(
    Object.assign(propertiesModule.defaultConfiguration(), { executable: "ghostty -e" })
);
const plain = (value) => JSON.parse(JSON.stringify(value));

// Encode a ShaDa file in memory and return its bytes as a plain array, the form the reader passes on.
function shadaBytes(items) {
    return Array.from(encodeShada(items));
}

// The real NeoVim fixture yields its marked paths, with the folder kind taken from the folder list.
const realBytes = Array.from(fs.readFileSync(path.join(__dirname, "..", "fixtures", "nvim-real.shada")));
const records = plain(api.parseHistory({ bytes: realBytes, directories: ["/srv/dl-fixture/project"] }, properties));
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
        { bytes: shadaBytes([{ type: 10, timestamp: 1700000000, data: { f: "/srv/a.md" } }]), directories: [] },
        properties
    )
);
assert.equal(timed[0].openedAt, 1700000000000);
assert.equal(timed[0].kind, "file");

// Marked paths alone are listed for the folder check, newest first.
assert.deepEqual(
    plain(
        api.markedPaths({
            bytes: shadaBytes([
                { type: 10, timestamp: 5, data: { f: "/srv/old" } },
                { type: 10, timestamp: 9, data: { f: "/srv/new" } }
            ])
        })
    ),
    ["/srv/new", "/srv/old"]
);

// Native launch: the terminal command's words come first, then nvim, the extra arguments, and the path, each as its own argument.
const withArguments = Object.assign({}, properties, { extraArguments: ["--clean"] });
assert.deepEqual(plain(api.launchArgs("/srv/x", withArguments, "/home/test")), [
    "ghostty",
    "-e",
    "nvim",
    "--clean",
    "/srv/x"
]);
// A path with spaces stays one argument, and a terminal written with a home folder is expanded.
const homeTerminal = Object.assign({}, properties, { executable: "~/bin/term --title x -e" });
assert.deepEqual(plain(api.launchArgs("/srv/a folder/file.md", homeTerminal, "/home/test")), [
    "/home/test/bin/term",
    "--title",
    "x",
    "-e",
    "nvim",
    "/srv/a folder/file.md"
]);
// The user's terminal decides the switch, so any terminal the user enters works, not only the ones the plugin knows.
const otherTerminal = Object.assign({}, properties, { executable: "/opt/term/run --" });
assert.deepEqual(plain(api.launchArgs("/srv/x", otherTerminal, "/home/test")), [
    "/opt/term/run",
    "--",
    "nvim",
    "/srv/x"
]);
assert.throws(
    () => api.launchArgs("", properties, "/home/test"),
    (error) => error.code === "providerConfig"
);

// An empty terminal command, the default before the user fills it in, is refused by the validator's first call and by the launch.
const unfilled = Object.assign({}, properties, { executable: "" });
assert.throws(
    () => api.validationArgs(unfilled, "/home/test"),
    (error) => error.field === "executable" && error.userMessage.includes("ghostty -e")
);
assert.throws(
    () => api.launchArgs("/srv/x", unfilled, "/home/test"),
    (error) => error.field === "executable"
);

// Flatpak and Snap launch their NeoVim through their launcher, after the same terminal command.
const flatpak = Object.assign({}, properties, { installationType: "flatpak", extraArguments: ["--clean"] });
assert.deepEqual(plain(api.launchArgs("/srv/x", flatpak, "/home/test")), [
    "ghostty",
    "-e",
    "flatpak",
    "run",
    "io.neovim.nvim",
    "--clean",
    "/srv/x"
]);
const snap = Object.assign({}, properties, { installationType: "snap", extraArguments: [] });
assert.deepEqual(plain(api.launchArgs("/srv/x", snap, "/home/test")), [
    "ghostty",
    "-e",
    "snap",
    "run",
    "nvim",
    "/srv/x"
]);

// The validator resolves the terminal program from the first word; the probe checks NeoVim itself, not the terminal.
assert.deepEqual(plain(api.validationArgs(properties, "/home/test")), ["ghostty"]);
assert.deepEqual(plain(api.validationProbe(properties, "/usr/bin/ghostty")), ["nvim", "--version"]);
assert.deepEqual(plain(api.validationProbe(flatpak, "/usr/bin/ghostty")), [
    "flatpak",
    "info",
    "--show-ref",
    "io.neovim.nvim"
]);
assert.deepEqual(plain(api.validationProbe(snap, "/usr/bin/ghostty")), ["snap", "list", "nvim"]);
assert.equal(api.validateExecutable("NVIM v0.12.6\nBuild type: RelWithDebInfo", properties), true);
assert.throws(
    () => api.validateExecutable("VIM - Vi IMproved 9.1", properties),
    (error) => error.field === "executable"
);
assert.equal(api.validateExecutable("app/io.neovim.nvim/x86_64/stable\n", flatpak), true);
assert.throws(
    () => api.validateExecutable("app/org.example.Other/x86_64/stable", flatpak),
    (error) => error.field === "executable"
);
assert.equal(api.validateExecutable("Name  Version  Rev\nnvim   0.12.6   1\n", snap), true);
assert.throws(
    () => api.validateExecutable("Name Version Rev\nother 1.0 1", snap),
    (error) => error.field === "executable"
);
assert.equal(api.validateArguments("", "", Object.assign({}, properties, { extraArguments: ["--clean"] })), true);
assert.throws(() => api.validateArguments("", "", Object.assign({}, properties, { extraArguments: [""] })));
assert.throws(
    () => api.validateHistory([], properties),
    (error) => error.field === "config"
);
assert.equal(api.validateHistory([{ path: "/srv/x" }], properties), true);

// Only the state folder and the optional history file are checked as paths; the terminal is checked through its program.
const paths = plain(api.validationPaths(properties, "/home/test", "/home/test/.config"));
assert.deepEqual(
    paths.map((target) => [target.label, target.kind, target.optional]),
    [
        ["NeoVim state folder", "directory", false],
        ["NeoVim ShaDa history file", "file", true]
    ]
);
assert.equal(paths[1].path, "/home/test/.local/state/nvim/shada/main.shada");

// Damaged history is reported to the reader instead of returning partial records.
assert.throws(
    () =>
        api.parseHistory(
            { bytes: shadaBytes([{ type: 10, timestamp: 1, data: { f: "/srv/x" } }]).slice(0, 5), directories: [] },
            properties
        ),
    (error) => error.code === "parse"
);
console.log("NeoVimApi tests passed");

// The validator resolves only the terminal program, so the validation command is that one word, and the shared failure helper is defined once.
assert.deepEqual(plain(api.validationArgs(properties, "/home/test")), ["ghostty"]);
const commandsModule = source("Providers/NeoVim/JS/NeoVimCommands.js");
assert.throws(
    () => commandsModule.fail("message", "details", "field"),
    (error) => error.field === "field"
);
assert.equal(typeof api.fail, "undefined", "the API uses the shared failure helper from NeoVimCommands");
console.log("NeoVimApi duplicate-helper tests passed");
