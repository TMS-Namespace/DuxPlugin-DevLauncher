// ProvidersManager.qml - Register integrations, create facades, and isolate provider load failures.
// Providers are reached only through their exported entry points (Integration folders); no provider internals are imported here.
import "../../JS/Contracts/PluginError.js" as PluginError
import "../../JS/Helpers/ProviderRules.js" as ProviderRules
import "../../JS/Providers/VSCode/Integration/VSCodeProvider.js" as VSCodeProviderModule
import "../Contracts"
import "../Providers/VSCode/Integration"
import QtQml
pragma Singleton

QtObject {
    id: root

    property var handlers: ({
    })
    property var loadErrors: []
    // The one place where each provider is listed. Adding a provider adds one entry point and one line here.
    readonly property VSCodeProvider vsCodeEntry: VSCodeProvider {}
    readonly property var sources: [describe(VSCodeProviderModule.create(), ProviderType.VSCode, vsCodeEntry.readerType)]
    property Component handlerType

    handlerType: Component {
        ProviderHandler {
        }

    }

    property Component propertiesType

    propertiesType: Component {
        ProviderProperties {
        }

    }

    property Component errorType

    errorType: Component {
        ProviderLoadError {
        }

    }

    // Build one registry entry from a provider's entry point: its identifier, name, declaration, and reader component.
    function describe(provider, type, readerType) {
        return {
            "type": type,
            "id": provider.typeId(),
            "name": provider.name(),
            "descriptor": provider.descriptor(),
            "provider": provider,
            "readerType": readerType
        };
    }

    // Return the facade for a configured installation, or null if it did not load.
    function handlerFor(providerId) {
        return handlers[providerId] || null;
    }

    // Keep installed provider defaults in the provider registry.
    function defaultConfigurations() {
        return sources.map(function(source) { return source.provider.defaultConfiguration(); });
    }

    // Return the declaration the plugin may read for one IDE type. Unknown types get an empty declaration.
    function descriptorFor(typeId) {
        const source = sources.find(function(option) { return option.id === typeId; });
        return source ? source.descriptor : { fields: [], dependents: {} };
    }

    // Return the default installation values for one IDE type, so edits can tell which values still hold defaults.
    function defaultsFor(typeId) {
        const source = sources.find(function(option) { return option.id === typeId; });
        return source ? source.provider.defaultConfiguration() : {};
    }

    function defaultProviderId() {
        const defaults = defaultConfigurations();
        return defaults.length ? defaults[0].id : "";
    }

    // Check one configuration's declaration against its provider API and return the parts needed to build facades.
    function declaredFor(configuration) {
        const source = sources.find(function(option) { return option.id === configuration.type; });
        if (!source)
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This IDE type is unavailable.", configuration.type, "type");
        const declared = source.provider.createProperties(configuration);
        const api = source.provider.createApi();
        ProviderRules.assertDeclaration(declared, api);
        return { source: source, declared: declared, api: api };
    }

    // Build one facade without starting its reader. Only declared paths and launch data are read through it.
    function facadeFor(configuration) {
        const parts = declaredFor(configuration);
        const properties = propertiesType.createObject(null);
        for (const key of Object.keys(parts.declared)) properties[key] = parts.declared[key];
        const handler = handlerType.createObject(null, { "type": parts.source.type, "properties": properties, "api": parts.api, "readerType": parts.source.readerType });
        if (!handler) {
            properties.destroy();
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This IDE provider could not be loaded.", configuration.type);
        }
        return handler;
    }

    // Read the folders and files one configuration declares through its facade. No reader starts, so duplicate checks stay cheap.
    function validationPaths(configuration) {
        const handler = facadeFor(configuration);
        try {
            return handler.validationPaths();
        } finally {
            handler.properties.destroy();
            handler.destroy();
        }
    }

    // Build a temporary facade with its reader for a draft, without changing active providers. The caller releases it.
    function candidate(configuration) {
        const handler = facadeFor(configuration);
        if (!handler.createReader()) {
            handler.properties.destroy();
            handler.destroy();
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This IDE provider could not be loaded.", configuration.type);
        }
        return handler;
    }

    // Validate and instantiate each installation without blocking the remaining providers.
    function reload(configurations) {
        for (const previousError of loadErrors) previousError.destroy();
        for (const previousId in handlers) {
            handlers[previousId].properties.destroy();
            handlers[previousId].destroy();
        }
        const started = {
        };
        const failed = [];
        for (const configuration of configurations) {
            const source = sources.find(function(providerSource) {
                return providerSource.id === configuration.type;
            });
            try {
                const handler = candidate(configuration);
                // Two saved entries with the same identifier would fight over one facade, so the second one is refused.
                if (started[handler.properties.providerId]) {
                    handler.properties.destroy();
                    handler.destroy();
                    throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This IDE is listed more than once. Remove the duplicate entry.", configuration.id);
                }
                started[handler.properties.providerId] = handler;
            } catch (caughtError) {
                const error = PluginError.from(caughtError);
                Logger.error("provider", error.details || error.userMessage);
                failed.push(errorType.createObject(null, {
                    "providerId": configuration.id || "",
                    "name": configuration.name || (source ? source.name : "") || "IDE",
                    "userMessage": error.userMessage,
                    "details": error.details
                }));
            }
        }
        handlers = started;
        loadErrors = failed;
    }

}
