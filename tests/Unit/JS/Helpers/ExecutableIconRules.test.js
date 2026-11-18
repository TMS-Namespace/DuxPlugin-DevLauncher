// ExecutableIconRules.test.js - Preserve Unicode and whitespace in configured executable icon matches.
// Rules: Runs in plain node; Unicode, trailing-space, and newline executable paths must still match their configured icon.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const rules = source("Helpers/ExecutableIconRules.js");
for (const executable of ["/tmp/Värmland 日本語/code", "/tmp/program ", "/tmp/line\nbreak/code"]) {
    const entries = [{ execString: '"' + executable + '" --reuse-window', icon: "configured-icon" }];
    assert.equal(rules.iconName(executable, entries), "configured-icon");
    assert.equal(rules.commandProgram(entries[0].execString), executable);
}

// Snap desktop entries resolve their own icon instead of the shared snap launcher icon.
assert.equal(rules.desktopIconName("code_code", [{ id: "other", icon: "wrong" }, { id: "code_code.desktop", icon: "/snap/code/current/meta/gui/vscode.png" }]), "/snap/code/current/meta/gui/vscode.png");
assert.equal(rules.desktopIconName("zed_zed", [{ id: "zed_zed", icon: "dev.zed.Zed" }]), "dev.zed.Zed");
assert.equal(rules.desktopIconName("missing", []), "");
