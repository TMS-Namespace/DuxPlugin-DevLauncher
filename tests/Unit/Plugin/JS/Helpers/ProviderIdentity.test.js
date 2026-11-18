// ProviderIdentity.test.js - Check stable provider identifiers.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const providerIdentity = source("Helpers/ProviderIdentity.js");
const defaultConfiguration = source("Providers/VSCode/JS/VSCodeProperties.js").defaultConfiguration();
assert.equal(providerIdentity.valid(defaultConfiguration.id), true);
const newProviderId = providerIdentity.create([defaultConfiguration.id]);
assert.equal(providerIdentity.valid(newProviderId), true);
assert.notEqual(newProviderId, defaultConfiguration.id);
