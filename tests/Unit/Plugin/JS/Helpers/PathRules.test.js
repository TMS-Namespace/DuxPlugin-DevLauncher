// PathRules.test.js - Check local URI normalization and parent folders.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const paths = source("Helpers/PathRules.js");
assert.equal(paths.expand("~/work", "/home/test", ""), "/home/test/work");
assert.equal(paths.localPath("file:///tmp/hello%20world/../project"), "/tmp/project");
assert.equal(paths.localPath("vscode-remote://server/path"), "");
assert.equal(paths.localPath("relative"), "");
assert.equal(paths.parentDirectory("/tmp/example.js"), "/tmp");
assert.equal(paths.parentDirectory("/example.js"), "/");

// Preserve meaningful spaces and controls; URI decoding occurs once, without Unicode normalization.
for (const name of ["Värmland 日本語 العربية 😀", "quotes'\"#$%", "line\nname\t", " trailing ", "e\u0301"]) {
    const filename = "/tmp/" + name;
    assert.equal(paths.localPath(filename), filename);
    assert.equal(paths.localPath("file://" + encodeURI(filename).replaceAll("#", "%23")), filename);
    assert.equal(paths.expand(filename, "/home/user", ""), filename);
}
assert.equal(paths.localPath("/tmp/invalid\0path"), "");
assert.equal(paths.localPath("file:///tmp/invalid%00path"), "");
