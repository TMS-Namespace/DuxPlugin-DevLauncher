// ProvidersManager.qml - Register integrations, create facades, and isolate provider load failures.
// Rules: Registers the integrations and builds their facades; a configuration that fails to load is recorded and never stops the others.
// Providers are reached only through their exported entry points (Integration folders); no provider internals are imported here.
pragma Singleton

import "../../../Providers/LocalGit/JS/Integration/LocalGitProvider.js" as LocalGitProviderModule
import "../../../Providers/LocalGit/QML/Integration"
import "../../../Providers/NeoVim/JS/Integration/NeoVimProvider.js" as NeoVimProviderModule
import "../../../Providers/NeoVim/QML/Integration"
import "../../../Providers/Rider/JS/Integration/RiderProvider.js" as RiderProviderModule
import "../../../Providers/Rider/QML/Integration"
import "../../../Providers/VSCode/JS/Integration/VSCodeProvider.js" as VSCodeProviderModule
import "../../../Providers/VSCode/QML/Integration"
import "../../../Providers/Zed/JS/Integration/ZedProvider.js" as ZedProviderModule
import "../../../Providers/Zed/QML/Integration"
import "../../JS/Contracts/PluginError.js" as PluginError
import "../../JS/Helpers/ProviderRules.js" as ProviderRules
import "../Contracts"
import QtQml

// The singleton registry: it lists every integration, builds the facade for each saved installation, and records the ones that fail.
QtObject {
    id: root

    // The facades of the installations that loaded, keyed by installation identifier.
    property var handlers: ({
    })
    // One error record for each installation that failed in the last reload.
    property var loadErrors: []
    // The one place where each provider is listed. Adding a provider adds one entry point and one line here.
    readonly property VSCodeProvider vsCodeEntry: VSCodeProvider {
    }
    // The entry point of the Zed integration, the only part of it the host uses.

    readonly property ZedProvider zedEntry: ZedProvider {
    }
    // The entry point of the Rider integration, the only part of it the host uses.

    readonly property RiderProvider riderEntry: RiderProvider {
    }
    // The entry point of the Local Git integration, the only part of it the host uses.

    readonly property LocalGitProvider localGitEntry: LocalGitProvider {
    }
    // The entry point of the NeoVim integration, the only part of it the host uses.

    readonly property NeoVimProvider neoVimEntry: NeoVimProvider {
    }
    // The registry: one description per integration, built from its API, declaration and reader.

    readonly property var sources: [describe(VSCodeProviderModule.create(), ProviderType.VSCode, vsCodeEntry.readerType), describe(ZedProviderModule.create(), ProviderType.Zed, zedEntry.readerType), describe(RiderProviderModule.create(), ProviderType.Rider, riderEntry.readerType), describe(LocalGitProviderModule.create(), ProviderType.LocalGit, localGitEntry.readerType), describe(NeoVimProviderModule.create(), ProviderType.NeoVim, neoVimEntry.readerType)]
    // The template that creates one ProviderHandler facade.
    property Component handlerType
    // The template that creates the declared properties of one installation.
    property Component propertiesType
    // The template that creates one load error record.
    property Component errorType

    // Build one registry entry from a provider's entry point: its identifier, name, declaration, and reader component.
    function describe(provider, type, readerType) {
        return {
            "type": type,
            "id": provider.typeId(),
            "name": provider.name(),
            "launchable": provider.descriptor().launchable === true,
            "scansFolders": provider.descriptor().scansFolders === true,
            "descriptor": provider.descriptor(),
            "provider": provider,
            "readerType": readerType
        };
    }

    // Return the facade for a configured installation, or null if it did not load.
    function handlerFor(providerId) {
        return handlers[providerId] || null;
    }

    // The IDEs seeded into a new settings list: every launchable provider whose descriptor declares defaultEnabled.
    // Providers that do not declare it are added by the user, so no count is capped here.
    function defaultConfigurations() {
        return sources.filter(function(source) {
            return source.launchable && source.descriptor.defaultEnabled === true;
        }).map(function(source) {
            return source.provider.defaultConfiguration();
        });
    }

    // Return the declaration the plugin may read for one IDE type. Unknown types get an empty declaration.
    function descriptorFor(typeId) {
        const source = sources.find(function(option) {
            return option.id === typeId;
        });
        return source ? source.descriptor : {
            "fields": [],
            "dependents": {
            }
        };
    }

    // Return the default installation values for one IDE type, so edits can tell which values still hold defaults.
    function defaultsFor(typeId) {
        const source = sources.find(function(option) {
            return option.id === typeId;
        });
        return source ? source.provider.defaultConfiguration() : {
        };
    }

    // The identifier of the first default IDE, used when no default is saved yet. Empty when none is available.
    function defaultProviderId() {
        const defaults = defaultConfigurations();
        return defaults.length ? defaults[0].id : "";
    }

    // The source that turns a saved scan folder into repository records. Empty when no source scans folders.
    function folderTypeId() {
        const source = sources.find(function(option) {
            return option.scansFolders;
        });
        return source ? source.id : "";
    }

    // The first launchable IDE type, used when a user adds a new IDE. Empty when no source can launch.
    function defaultTypeId() {
        const source = sources.find(function(option) {
            return option.launchable;
        });
        return source ? source.id : "";
    }

    // Check one configuration's declaration against its provider API and return the parts needed to build facades.
    function declaredFor(configuration) {
        const source = sources.find(function(option) {
            return option.id === configuration.type;
        });
        if (!source)
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This IDE type is unavailable.", configuration.type, "type");

        const declared = source.provider.createProperties(configuration);
        const api = source.provider.createApi();
        ProviderRules.assertDeclaration(declared, api);
        ProviderRules.assertInstallation(declared, source.descriptor);
        return {
            "source": source,
            "declared": declared,
            "api": api
        };
    }

    // Build one facade without starting its reader. Only declared paths and launch data are read through it.
    function facadeFor(configuration) {
        const parts = declaredFor(configuration);
        const properties = propertiesType.createObject(null);
        for (const key of Object.keys(parts.declared)) properties[key] = parts.declared[key]
        const handler = handlerType.createObject(null, {
            "type": parts.source.type,
            "properties": properties,
            "api": parts.api,
            "readerType": parts.source.readerType,
            "launchable": parts.source.launchable,
            "iconPath": typeof configuration.iconPath === "string" ? configuration.iconPath : ""
        });
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
        for (const previousError of loadErrors) previousError.destroy()
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

    // Builds each facade as a ProviderHandler object.
    handlerType: Component {
        ProviderHandler {
        }

    }

    // Builds one ProviderProperties object for the declared data.
    propertiesType: Component {
        ProviderProperties {
        }

    }

    // Builds one ProviderLoadError record for an installation that failed to load.
    errorType: Component {
        ProviderLoadError {
        }

    }

}
