// PathRules.test.js - Check local URI normalization and parent folders.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const paths = source("Helpers/PathRules.js");
assert.equal(paths.expand("~/work", "/home/test", ""), "/home/test/work");
assert.equal(paths.localPath("file:///tmp/hello%20world/../project"), "/tmp/project");
assert.equal(paths.localPath("vscode-remote://server/path"), "");
assert.equal(paths.localPath("relative"), "");
assert.equal(paths.parentDirectory("/tmp/example.js"), "/tmp");
assert.equal(paths.parentDirectory("/example.js"), "/");
