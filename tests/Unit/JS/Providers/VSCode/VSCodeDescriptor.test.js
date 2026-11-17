// VSCodeDescriptor.test.js - Check that the VS Code declaration carries every label and dependency the editor needs.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const descriptor = source("Providers/VSCode/VSCodeDescriptor.js").create();
const field = key => descriptor.fields.find(declared => declared.key === key);

assert.equal(descriptor.typeId, "vscode");
assert.equal(descriptor.name, "VS Code");
for (const key of ["executable", "config", "shared"]) {
    assert.ok(field(key), key + " must be declared");
    assert.ok(field(key).label && field(key).description && field(key).placeholder && field(key).chooserTitle, key + " needs its editor text");
}
assert.equal(field("executable").kind, "executable");
assert.equal(field("config").kind, "directory");
assert.equal(field("shared").kind, "directory");
assert.equal(field("executable").comparison, "basename");
// The rules that used to be built into the editor are now declared here.
assert.deepEqual(Array.from(descriptor.dependents.executable), ["config", "shared"]);
assert.deepEqual(Array.from(descriptor.dependents.config), ["shared"]);
