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

assert.equal(paths.resourceType("/run/user/1000/gvfs/smb-share:server=host,share=team/project"), "share");
const mounts = paths.shareMounts(
    "1 0 0:1 / / rw - ext4 /dev/root rw\n2 1 0:2 / /mnt/team\\040share rw - cifs //host/team rw\n3 2 0:3 / /mnt/team\\040share/local rw - ext4 /dev/disk rw"
);
assert.equal(paths.resourceType("/mnt/team share/project", mounts), "share");
assert.equal(paths.resourceType("/mnt/team share/local/item", mounts), "local");
assert.equal(paths.resourceType("/mnt/team share2/project", mounts), "local");
assert.equal(
    paths.resourcePath({ scheme: "file", authority: "host", path: "/share/project" }),
    "file://host/share/project"
);
assert.equal(paths.resourceType("vscode-remote://ssh-remote+host/project"), "remote");
assert.equal(
    paths.resourcePath({ scheme: "vscode-remote", authority: "ssh-remote+host", path: "/hello #world" }),
    "vscode-remote://ssh-remote+host/hello%20%23world"
);
