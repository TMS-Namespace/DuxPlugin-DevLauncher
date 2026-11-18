// ProviderRules.test.js - Installation choices must match the provider's declaration.
// Rules: Runs in plain node; a flatpak choice must be refused when the LocalGit declaration allows only native.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const rules = source("Helpers/ProviderRules.js");
const descriptor = source("Providers/LocalGit/JS/LocalGitDescriptor.js").create();
const properties = source("Providers/LocalGit/JS/LocalGitProperties.js").create(source("Providers/LocalGit/JS/LocalGitProperties.js").defaultConfiguration());
assert.equal(rules.assertInstallation(properties, descriptor), true);
assert.throws(() => rules.assertInstallation({ installationType: "flatpak" }, descriptor), error => error.field === "installationType");
