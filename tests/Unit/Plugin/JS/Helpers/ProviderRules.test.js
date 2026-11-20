// ProviderRules.test.js - Installation choices must match the provider's declaration.
// Rules: Runs in plain node; a flatpak choice must be refused when the LocalGit declaration allows only native.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const rules = source("Helpers/ProviderRules.js");
const descriptor = source("Providers/LocalGit/JS/LocalGitDescriptor.js").create();
const properties = source("Providers/LocalGit/JS/LocalGitProperties.js").create(
    source("Providers/LocalGit/JS/LocalGitProperties.js").defaultConfiguration()
);
assert.equal(rules.assertInstallation(properties, descriptor), true);
assert.throws(
    () => rules.assertInstallation({ installationType: "flatpak" }, descriptor),
    (error) => error.field === "installationType"
);

// Aliases use inclusive length bounds and cannot be blank.
const api = source("Providers/VSCode/JS/VSCodeApi.js").create();
const vsCode = source("Providers/VSCode/JS/VSCodeProperties.js");
const base = vsCode.defaultConfiguration();
for (const name of ["", "   ", "Ab", "A".repeat(21)]) {
    const declaration = vsCode.create(Object.assign({}, base, { name }));
    assert.throws(
        () => rules.assertDeclaration(declaration, api),
        (error) => error.field === "name"
    );
}
for (const name of ["Abc", "A".repeat(20)]) {
    const declaration = vsCode.create(Object.assign({}, base, { name }));
    assert.equal(rules.assertDeclaration(declaration, api), true);
}

// An empty executable is refused unless the descriptor marks the installation as user-supplied.
const vsCodeDescriptor = source("Providers/VSCode/JS/VSCodeDescriptor.js").create();
const emptyExecutable = Object.assign({}, vsCodeProperties(), { executable: "" });
function vsCodeProperties() {
    return source("Providers/VSCode/JS/VSCodeProperties.js").create(
        source("Providers/VSCode/JS/VSCodeProperties.js").defaultConfiguration()
    );
}
assert.throws(
    () => rules.assertDeclaration(emptyExecutable, api),
    (error) => error.field === "executable",
    "an empty executable is refused when no descriptor says the user supplies it"
);
assert.throws(
    () => rules.assertDeclaration(emptyExecutable, api, vsCodeDescriptor),
    (error) => error.field === "executable",
    "an installation that is not user-supplied still refuses an empty executable"
);
const userSupplied = {
    installations: [{ type: "native", executable: "", userExecutable: true }],
    launchable: true,
    fields: [],
    dependents: {}
};
assert.equal(
    rules.assertDeclaration(Object.assign({}, emptyExecutable, { installationType: "native" }), api, userSupplied),
    true
);
assert.throws(
    () => rules.assertDeclaration(Object.assign({}, vsCodeProperties(), { executable: "bad;rm" }), api, userSupplied),
    (error) => error.field === "executable",
    "a non-empty executable is still checked against the allowed characters"
);
