// ProviderBase.test.js - Check that the abstract entry point refuses inherited methods and the VS Code entry point implements all of them.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const base = source("Contracts/ProviderBase.js");
const abstract = base.create();

// Every method of the abstract entry point refuses to run until a provider overrides it.
for (const method of ["typeId", "name", "descriptor", "defaultConfiguration", "createApi"]) {
    assert.throws(
        () => abstract[method](),
        (error) => error.code === "providerConfig" && error.details === "Missing " + method
    );
}
assert.throws(
    () => abstract.createProperties({}),
    (error) => error.details === "Missing createProperties"
);

// The VS Code entry point overrides every method and reports the VS Code identity.
const vsCode = source("Providers/VSCode/JS/Integration/VSCodeProvider.js").create();
assert.equal(typeof vsCode.createProperties, "function", "the VS Code entry point must implement the abstract methods");
assert.equal(vsCode.typeId(), "vscode");
assert.equal(vsCode.name(), "VS Code");
assert.equal(vsCode.descriptor().typeId, "vscode");
assert.equal(vsCode.defaultConfiguration().type, "vscode");
assert.equal(vsCode.createProperties(vsCode.defaultConfiguration()).providerId, vsCode.defaultConfiguration().id);
assert.equal(typeof vsCode.createApi().parseHistory, "function");
