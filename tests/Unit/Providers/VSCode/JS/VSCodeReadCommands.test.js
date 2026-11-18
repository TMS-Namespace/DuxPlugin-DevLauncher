// VSCodeReadCommands.test.js - Check the bounded history read commands for VS Code storage.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const vsCodeCommands = source("Providers/VSCode/JS/VSCodeReadCommands.js");
assert.deepEqual(Array.from(vsCodeCommands.modifiedTime("/tmp/history")), ["timeout", "4s", "stat", "-c", "%Y", "/tmp/history"]);
// The JSON history read is capped: head fetches one byte past the limit so an oversize file can be refused.
const jsonCommand = vsCodeCommands.json("/tmp/storage.json");
assert.deepEqual(Array.from(jsonCommand.slice(0, 4)), ["timeout", "4s", "head", "-c"]);
assert.equal(jsonCommand[4], String(source("Providers/VSCode/JS/VSCodeConstants.js").MAX_HISTORY_BYTES + 1));
assert.equal(jsonCommand[5], "/tmp/storage.json");

// History JSON and timestamp commands use separate arguments, preserving special names under any parent locale.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "history-paths-"));
try {
    const filename = path.join(root, "日本語 Värmland ' \"$`\\\n\t ");
    fs.writeFileSync(filename, '{"entries":[]}');
    for (const locale of ["C", "sv_SE.UTF-8"]) {
        const options = { encoding: "utf8", env: { ...process.env, LC_ALL: locale } };
        const read = Array.from(vsCodeCommands.json(filename));
        const contents = spawnSync(read[0], read.slice(1), options);
        assert.equal(contents.status, 0);
        assert.equal(contents.stdout, '{"entries":[]}');
        const stat = Array.from(vsCodeCommands.modifiedTime(filename));
        const modified = spawnSync(stat[0], stat.slice(1), options);
        assert.equal(modified.status, 0);
        assert.equal(Number(modified.stdout), Math.floor(fs.statSync(filename).mtimeMs / 1000));
    }
} finally { fs.rmSync(root, { recursive: true, force: true }); }
