// CheckProviders.js - Verify every registered provider implements the common contract.
// Rules: Audit only; it loads provider modules without starting the app, and any contract mismatch throws an assertion error.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("./LoadQmlJs.js");

// Load every provider folder and check its API, properties, entry point, and descriptor against the common contract, throwing on the first mismatch.
function check(root = path.resolve(__dirname, "../src")) {
    const shared = path.join(root, "Plugin/JS");
    const cache = new Map();
    const apiBase = load(path.join(shared, "Contracts/ProviderApi.js"), cache);
    const propertiesBase = load(path.join(shared, "Contracts/ProviderProperties.js"), cache);
    assert.ok(apiBase.create() instanceof apiBase.ProviderApi);
    assert.ok(propertiesBase.create() instanceof propertiesBase.ProviderProperties);
    const rules = load(path.join(shared, "Helpers/ProviderRules.js"), cache);
    const baseModule = load(path.join(shared, "Contracts/ProviderBase.js"), cache);
    const descriptors = load(path.join(shared, "Contracts/ProviderDescriptor.js"), cache);
    const providerRoot = path.join(root, "Providers");
    const providers = fs.readdirSync(providerRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    assert.ok(providers.length > 0, "At least one provider declaration is required");
    for (const provider of providers) {
        const directory = path.join(providerRoot, provider.name, "JS");
        const api = load(path.join(directory, provider.name + "Api.js"), cache);
        const declaration = load(path.join(directory, provider.name + "Properties.js"), cache);
        const instance = api.create();
        assert.equal(
            typeof declaration.defaultConfiguration,
            "function",
            provider.name + " must supply default configuration"
        );
        const declared = declaration.create(declaration.defaultConfiguration());
        // The plugin reaches the provider only through its entry point, which must extend the abstract base class.
        const entryPoint = load(path.join(directory, "Integration", provider.name + "Provider.js"), cache).create();
        assert.ok(
            entryPoint instanceof baseModule.ProviderBase,
            provider.name + " entry point must extend ProviderBase"
        );
        assert.ok(
            entryPoint.typeId().length > 0 && entryPoint.name().length > 0,
            provider.name + " entry point must declare an identifier and name"
        );
        assert.equal(
            descriptors.validate(entryPoint.descriptor()).typeId,
            entryPoint.typeId(),
            provider.name + " descriptor must match its identifier"
        );
        assert.ok(
            entryPoint.createApi() instanceof apiBase.ProviderApi,
            provider.name + " entry point must create its API"
        );
        assert.ok(instance instanceof apiBase.ProviderApi);
        assert.ok(declared instanceof propertiesBase.ProviderProperties);
        for (const [method, arity] of [
            ["sources", 1],
            ["parseHistory", 2],
            ["launchArgs", 3],
            ["validationArgs", 2],
            ["validationPaths", 3],
            ["validateExecutable", 2],
            ["validateArguments", 3],
            ["validateHistory", 2]
        ]) {
            assert.ok(Object.hasOwn(Object.getPrototypeOf(instance), method));
            assert.equal(instance[method].length, arity);
        }
        assert.equal(rules.assertDeclaration(declared, instance), true);
        assert.equal(rules.assertInstallation(declared, entryPoint.descriptor()), true);
        assert.throws(() => rules.assertDeclaration(Object.assign({}, declared, { unknownField: true }), instance));
    }
}

if (require.main === module) check();
module.exports = { check };
