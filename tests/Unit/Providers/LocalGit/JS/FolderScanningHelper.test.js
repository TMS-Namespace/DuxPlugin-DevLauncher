// FolderScanningHelper.test.js - Check the find command (time, depth, excluded folders) and the repository roots read from its output.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const source = require("../../../../Helpers/LoadSource.cjs");
const defaults = source("Helpers/Config.js");
const helper = source("Providers/LocalGit/JS/FolderScanningHelper.js");

// The find output is parsed into one record per repository root, listed once, capped at the limit.
const roots = helper.repositoryRoots("/tmp/one/.git\u0000/tmp/one/.git\u0000/tmp/two/.git\u0000", 5);
assert.equal(roots.length, 2);
assert.equal(roots[0].path, "/tmp/one");
assert.equal(roots[0].kind, "repository");
assert.equal(helper.repositoryRoots("/tmp/a/.git\u0000/tmp/b/.git\u0000/tmp/c/.git\u0000", 2).length, 2);

// The command runs under timeout and passes every value as its own argument, never through a shell.
const command = helper.findCommand("/tmp/projects", 4);
assert.equal(command[0], "timeout");
assert.equal(command[1], defaults.repositoryScanTimeout);
assert.equal(command[2], "env");
assert.equal(command[3], "LC_ALL=C");
assert.equal(command[command.indexOf("-maxdepth") + 1], "4");
assert.equal(command[command.indexOf("-mindepth") + 1], "1");
assert.equal(helper.findCommand("/tmp/projects", 99)[command.indexOf("-maxdepth") + 1], String(defaults.defaultRepositoryDepth));
// Dependency and build folders are pruned, so their .git markers are never reported.
for (const folderName of ["node_modules", ".venv", "venv", "dist", "build", "target", ".cache"])
    assert.ok(command.includes(folderName), folderName + " must be excluded from the repository scan");
// Pruning stops the walk, and results are NUL-separated.
assert.ok(command.includes("-print0"));
assert.ok(command.indexOf("-prune") < command.indexOf("-print0"));
assert.equal(command[command.length - 1], "-prune");

// A scan root whose own name is an excluded folder is still searched: the pruning applies only below the root.
// This runs the real find on a temporary tree; the excluded folder inside the root must still be skipped.
const tree = fs.mkdtempSync(path.join(os.tmpdir(), "folder-scan-"));
try {
    const scanRoot = path.join(tree, "build");
    fs.mkdirSync(path.join(scanRoot, "app", ".git"), { recursive: true });
    fs.mkdirSync(path.join(scanRoot, "node_modules", "lib", ".git"), { recursive: true });
    const names = ["Värmland 日本語 😀", "quote'and\"$`", "line\nbreak\t", "back\\slash", " leading trailing "];
    for (const name of names) fs.mkdirSync(path.join(scanRoot, name, ".git"), { recursive: true });
    const rootCommand = helper.findCommand(scanRoot, 4);
    const scan = spawnSync(rootCommand[0], rootCommand.slice(1), { encoding: "utf8" });
    const found = scan.stdout.split("\u0000").filter(Boolean);
    assert.ok(found.includes(path.join(scanRoot, "app", ".git")), "the repository below a scan root named build must be found");
    const records = helper.repositoryRoots(scan.stdout, 20);
    for (const name of names) assert.ok(records.some(record => record.path === path.join(scanRoot, name)));
    assert.ok(!found.some(entry => entry.includes("node_modules")), "excluded folders below the root must stay pruned");
} finally {
    fs.rmSync(tree, { recursive: true, force: true });
}
