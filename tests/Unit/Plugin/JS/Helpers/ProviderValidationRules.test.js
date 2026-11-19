// ProviderValidationRules.test.js - Check duplicate IDE paths and declared resources.
// Rules: Runs in plain node; duplicate executables and paths must be reported, and executables starting with "-" must be refused.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const { codeId, api, properties } = require("../../../../Helpers/ProviderFixture.cjs");
const providerRules = source("Helpers/ProviderRules.js");
const validationRules = source("Helpers/ProviderValidationRules.js");
const codeResources = {
    installationType: "native",
    type: "vscode",
    executable: "/usr/bin/code",
    paths: [
        { label: "IDE data folder", path: "/tmp/Code", unique: true },
        { label: "IDE history file", path: "/tmp/Code/state.vscdb", unique: false }
    ]
};
assert.equal(
    validationRules.duplicate(
        { installationType: "native", type: "vscode", executable: "code", paths: [] },
        codeResources
    ),
    "IDE executable path"
);
assert.equal(
    validationRules.duplicate(
        { installationType: "native", type: "vscode", executable: "/opt/another/code", paths: [] },
        codeResources
    ),
    ""
);
assert.equal(
    validationRules.duplicate(
        { installationType: "native", type: "vscode", executable: "/usr/bin/../bin/code", paths: [] },
        codeResources
    ),
    "IDE executable path"
);
assert.equal(
    validationRules.duplicate(
        {
            installationType: "native",
            type: "vscode",
            executable: "/opt/code-insiders",
            paths: [{ label: "IDE data folder", path: "/tmp/Code/.", unique: true }]
        },
        codeResources
    ),
    "IDE data folder"
);
assert.equal(
    validationRules.duplicate(
        {
            installationType: "native",
            type: "vscode",
            executable: "/opt/code-insiders",
            paths: [{ label: "IDE data folder", path: "/tmp/Code2", unique: true }]
        },
        codeResources
    ),
    ""
);
assert.equal(validationRules.duplicate({ type: "other", executable: "/usr/bin/code", paths: [] }, codeResources), "");
assert.equal(api.validationPaths(properties, "/home/test", "")[0].path, "/home/test/.config/Code");
assert.equal(validationRules.targets(api.validationPaths(properties, "/home/test", "")).length >= 4, true);
assert.equal(api.validationPaths(properties, "/home/test", "")[1].optional, true);
const customShared = source("Providers/VSCode/JS/VSCodeProperties.js").create({
    installationType: "native",
    id: codeId,
    name: "Code",
    config: "~/.config/Code",
    shared: "/tmp/custom-shared",
    executable: "code"
});
assert.equal(api.validationPaths(customShared, "/home/test", "")[1].optional, false);
assert.throws(() =>
    validationRules.targets([{ label: "Data", path: "relative", kind: "directory", optional: false, unique: true }])
);
assert.throws(() => providerRules.assertDeclaration(Object.assign({}, properties, { extraArguments: [42] }), api));
assert.equal(validationRules.duplicateField("IDE executable path", []), "executable");
assert.equal(
    validationRules.duplicateField("IDE data folder", api.validationPaths(properties, "/home/test", "")),
    "config"
);
assert.equal(
    validationRules.duplicateField("Shared history folder", api.validationPaths(customShared, "/home/test", "")),
    "shared"
);
assert.equal(validationRules.duplicateField("Unknown resource", []), "");

// An executable name must not start with "-", because it would be read as an option of the probe command (which).
assert.doesNotThrow(() =>
    providerRules.assertDeclaration(Object.assign({}, properties, { executable: "/usr/bin/code" }), api)
);
assert.doesNotThrow(() =>
    providerRules.assertDeclaration(Object.assign({}, properties, { executable: "~/bin/code" }), api)
);
assert.doesNotThrow(() =>
    providerRules.assertDeclaration(Object.assign({}, properties, { executable: "code-insiders" }), api)
);
for (const executable of ["-x", "--version", "-", "- code"])
    assert.throws(
        () => providerRules.assertDeclaration(Object.assign({}, properties, { executable: executable }), api),
        (error) => error.code === "providerConfig",
        executable
    );
