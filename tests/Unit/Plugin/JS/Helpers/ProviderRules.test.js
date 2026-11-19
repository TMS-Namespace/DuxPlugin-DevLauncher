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
