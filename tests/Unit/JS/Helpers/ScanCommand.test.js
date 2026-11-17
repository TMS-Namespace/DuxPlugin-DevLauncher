// ScanCommand.test.js - Check the repository find command: bounded time, depth, and excluded dependency folders.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const defaults = source("Helpers/Config.js");
const commands = source("Helpers/ScanCommand.js");

const command = commands.repositories("/tmp/projects", 4);
// The command runs under timeout and passes every value as its own argument, never through a shell.
assert.equal(command[0], "timeout");
assert.equal(command[1], defaults.repositoryScanTimeout);
assert.equal(command[2], "find");
assert.equal(command[3], "/tmp/projects");
assert.equal(command[command.indexOf("-maxdepth") + 1], "4");
// Dependency and build folders are pruned so they are never walked for .git markers.
for (const folderName of ["node_modules", ".venv", "venv", "dist", "build", "target", ".cache"])
    assert.ok(command.includes(folderName), folderName + " must be excluded from the repository scan");
// Pruned folders stop the walk; .git markers are printed NUL-separated and not descended into.
assert.ok(command.indexOf("-prune") < command.indexOf("-print0"));
assert.equal(command[command.length - 1], "-prune");
// An out-of-range depth falls back to the default instead of widening the walk.
assert.equal(commands.repositories("/tmp/projects", 99)[command.indexOf("-maxdepth") + 1], String(defaults.defaultRepositoryDepth));
