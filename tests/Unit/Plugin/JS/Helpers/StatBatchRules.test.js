// StatBatchRules.test.js - Check batching, the stat command, parsing, and missing paths.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const batches = source("Helpers/StatBatchRules.js");
const config = source("Helpers/Constants.js");

assert.deepEqual(
    Array.from(batches.batches(["/a", "/b", "/c"], 2), (group) => group.length),
    [2, 1]
);
assert.deepEqual(Array.from(batches.batches([], 2)), []);

// The command names every path after "--", so no path can be read as an option.
const command = batches.command(["/tmp/x", "-rf"]);
assert.equal(command[0], "timeout");
assert.equal(command[1], config.statBatchTimeout);
assert.equal(command[2], "stat");
assert.equal(command[command.indexOf("--") + 1], "/tmp/x");
assert.equal(command[command.length - 1], "-rf");

// NUL-delimited fields preserve path characters; malformed timestamps are skipped.
const parsed = batches.parse("1700000000\0/tmp/x\0abc\0/tmp/y\u00001600000000\0/tmp/z\0");
assert.deepEqual(Object.keys(parsed).sort(), ["/tmp/x", "/tmp/z"]);
assert.equal(parsed["/tmp/x"], 1700000000000);

// Only explicit absence confirms a missing path, including in a batch with a permission failure.
const diagnostics =
    "stat: cannot statx '/tmp/gone': No such file or directory\nstat: cannot statx '/tmp/private': Permission denied\n";
assert.deepEqual(Array.from(batches.missingPaths(["/tmp/x", "/tmp/gone", "/tmp/private"], parsed, diagnostics, 1)), [
    "/tmp/gone"
]);
for (const status of [0, 124, 127, 137])
    assert.equal(batches.missingPaths(["/tmp/gone"], {}, diagnostics, status).length, 0);
assert.equal(batches.missingPaths(["/tmp/private"], {}, "stat: failed to read metadata\n", 1).length, 0);
assert.deepEqual(
    Array.from(
        batches.missingPaths(["/dev/null/file"], {}, "stat: cannot stat '/dev/null/file': Not a directory\n", 1)
    ),
    ["/dev/null/file"]
);

// Exercise GNU stat itself: C-locale diagnostics split non-ASCII names into quoted octal byte groups.
const { spawnSync } = require("node:child_process");
const unicodePaths = ["/tmp/dev-launcher-missing-02：30：01Z.sql", "/tmp/dev-launcher-missing-share$/Värmland.tsv"];
const unicodeCommand = batches.command(unicodePaths);
const answer = spawnSync(unicodeCommand[0], Array.from(unicodeCommand.slice(1)), { encoding: "utf8" });
assert.equal(answer.status, 1);
assert.deepEqual(Array.from(batches.missingPaths(unicodePaths, {}, answer.stderr, answer.status)), unicodePaths);
assert.deepEqual(
    Array.from(
        batches.missingPaths(
            unicodePaths,
            {},
            answer.stderr.replaceAll("No such file or directory", "Permission denied"),
            1
        )
    ),
    []
);
assert.equal(batches.diagnosticPath("$'\\377'"), "");

// Real filesystem checks preserve every legal Unicode/control character under differing parent locales.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const tree = fs.mkdtempSync(path.join(os.tmpdir(), "stat-paths-"));
try {
    const names = [
        "Värmland 日本語 العربية 😀",
        "quote'and\"both$`",
        "tab\there",
        "line\nbreak\r",
        "back\\slash",
        " leading and trailing ",
        "-dash",
        "e\u0301"
    ];
    const existing = names.map((name) => path.join(tree, name));
    for (const filename of existing) fs.writeFileSync(filename, "fixture");
    const absent = existing.map((filename) => filename + "-absent");
    // DateRefresher.qml runs this command with LC_ALL=C, so its diagnostics are English and can be matched.
    for (const locale of ["C"]) {
        const command = batches.command(existing.concat(absent));
        const result = spawnSync(command[0], Array.from(command.slice(1)), {
            encoding: "utf8",
            env: { ...process.env, LC_ALL: locale }
        });
        assert.equal(result.status, 1);
        const dates = batches.parse(result.stdout);
        assert.deepEqual(Object.keys(dates), existing);
        for (const filename of existing)
            assert.equal(dates[filename], Math.floor(fs.statSync(filename).mtimeMs / 1000) * 1000);
        assert.deepEqual(
            Array.from(batches.missingPaths(existing.concat(absent), dates, result.stderr, result.status)),
            absent
        );
    }
} finally {
    fs.rmSync(tree, { recursive: true, force: true });
}
