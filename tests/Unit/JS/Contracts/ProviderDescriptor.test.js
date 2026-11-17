// ProviderDescriptor.test.js - Check that a provider's declaration is accepted only when every field the plugin reads is present and well-formed.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const descriptors = source("Contracts/ProviderDescriptor.js");
const vsCode = source("Providers/VSCode/VSCodeDescriptor.js").create();

// The VS Code declaration is accepted as it is.
assert.equal(descriptors.validate(vsCode).typeId, "vscode");

// Each rule the plugin depends on is checked: a bad declaration is refused with a provider-misconfiguration error.
const refused = function(broken) {
    assert.throws(() => descriptors.validate(broken), error => error.code === "providerConfig" && error.userMessage === "An IDE provider is misconfigured.");
};
const withField = function(overrides) {
    return Object.assign({}, vsCode, { fields: [Object.assign({}, vsCode.fields[0], overrides)] });
};
refused(null);
refused(Object.assign({}, vsCode, { typeId: "" }));
refused(Object.assign({}, vsCode, { name: 42 }));
refused(Object.assign({}, vsCode, { fields: "not a list" }));
refused(withField({ kind: "file" }));
refused(withField({ comparison: "fuzzy" }));
refused(withField({ label: undefined }));
refused(Object.assign({}, vsCode, { dependents: { executable: "config" } }));
refused(Object.assign({}, vsCode, { dependents: { executable: [1] } }));
