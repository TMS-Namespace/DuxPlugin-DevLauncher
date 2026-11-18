// ProviderDescriptor.test.js - Check that a provider's declaration is accepted only when every field the plugin reads is present and well-formed.
// Rules: Runs in plain node; a missing or malformed declaration field must be refused with a providerConfig error.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const descriptors = source("Contracts/ProviderDescriptor.js");
const vsCode = source("Providers/VSCode/VSCodeDescriptor.js").create();

// The VS Code declaration is accepted as it is.
assert.equal(descriptors.validate(vsCode).typeId, "vscode");

// Each rule the plugin depends on is checked: a bad declaration is refused with a provider-misconfiguration error.
// Asserts that the given broken declaration is refused with a providerConfig error and the standard user message.
const refused = function(broken) {
    assert.throws(() => descriptors.validate(broken), error => error.code === "providerConfig" && error.userMessage === "An IDE provider is misconfigured.");
};
// Returns a copy of the VS Code declaration whose first field has the given overrides applied.
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

// Every declaration says whether the provider can open items; a missing or non-boolean value is refused.
refused(Object.assign({}, vsCode, { launchable: undefined }));
refused(Object.assign({}, vsCode, { launchable: "yes" }));
assert.equal(descriptors.validate(Object.assign({}, vsCode, { launchable: false })).launchable, false);

// Provider-supplied desktop icons are optional and must be strings.
refused(Object.assign({}, vsCode, { iconName: 1 }));
assert.equal(descriptors.validate(Object.assign({}, vsCode, { iconName: "dev.zed.Zed" })).iconName, "dev.zed.Zed");

// Installation declarations must be nonempty, unique, valid, and complete.
refused(Object.assign({}, vsCode, { installations: [] }));
refused(Object.assign({}, vsCode, { installations: [{ type: "unknown", executable: "x" }] }));
refused(Object.assign({}, vsCode, { installations: [{ type: "native", executable: "x" }, { type: "native", executable: "y" }] }));
refused(Object.assign({}, vsCode, { installations: [{ type: "native", executable: "" }] }));

// Provider-specific package choices can omit Flatpak, as a Native/Snap-only provider would.
const nativeAndSnap = Object.assign({}, vsCode, { installations: [
    { type: "native", executable: "/opt/ide/bin/ide" },
    { type: "snap", executable: "/usr/bin/snap", desktopId: "ide_ide" }
] });
assert.equal(descriptors.validate(nativeAndSnap).installations.length, 2);
refused(Object.assign({}, nativeAndSnap, { installations: [{ type: "snap", executable: "/usr/bin/snap", desktopId: 9 }] }));
