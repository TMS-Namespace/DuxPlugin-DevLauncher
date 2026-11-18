// ExecutableIconRules.test.js - Preserve Unicode and whitespace in configured executable icon matches.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const rules = source("Helpers/ExecutableIconRules.js");
for (const executable of ["/tmp/Värmland 日本語/code", "/tmp/program ", "/tmp/line\nbreak/code"]) {
    const entries = [{ execString: '"' + executable + '" --reuse-window', icon: "configured-icon" }];
    assert.equal(rules.iconName(executable, entries), "configured-icon");
    assert.equal(rules.commandProgram(entries[0].execString), executable);
}
