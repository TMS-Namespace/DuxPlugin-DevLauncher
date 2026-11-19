// ProviderRules.js - Check complete declarations and required provider overrides.
.pragma library
.import "../Contracts/PluginError.js" as PluginError
.import "../Contracts/ProviderApi.js" as Base
.import "ArgumentRules.js" as ArgumentRules
.import "../Contracts/InstallationType.js" as InstallationType
.import "ProviderIdentity.js" as ProviderIdentity
.import "Config.js" as Config
// Rules: Pure declaration checks: throws PluginError for unknown fields, bad settings or missing overrides; no QML types or logging.
var PropertyNames = Object.freeze([
    "providerType",
    "providerId",
    "installationType",
    "name",
    "executable",
    "extraArguments",
    "settings"
]);
var RequiredMethods = Object.freeze([
    "sources",
    "parseHistory",
    "launchArgs",
    "validationArgs",
    "validationPaths",
    "validateExecutable",
    "validateArguments",
    "validateHistory"
]);

// A provider can only create configurations for installation types it declares.
function assertInstallation(declared, descriptor) {
    if (
        !(descriptor.installations || []).some(function (entry) {
            return entry.type === declared.installationType;
        })
    )
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "This installation type is not supported by this provider.",
            declared.installationType,
            "installationType"
        );
    return true;
}

// Refuse unknown fields, invalid settings, and inherited abstract methods.
function assertDeclaration(declared, api) {
    for (const key of Object.keys(declared)) {
        if (PropertyNames.indexOf(key) < 0)
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "An IDE provider is misconfigured.",
                "Unknown property " + key
            );
    }
    ArgumentRules.validate(declared.extraArguments);
    if (!InstallationType.isValid(declared.installationType))
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "Choose a supported installation type.",
            String(declared.installationType),
            "installationType"
        );
    if (!ProviderIdentity.valid(declared.providerId))
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "Remove and add this IDE again to assign its internal identifier.",
            declared.name
        );
    if (
        typeof declared.name !== "string" ||
        declared.name.length < Config.minIdeAliasLength ||
        declared.name.length > Config.maxIdeAliasLength ||
        !/^[A-Za-z][A-Za-z0-9 _-]*$/.test(declared.name)
    )
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "Enter an IDE alias of 3 to 20 characters, starting with a letter and using letters, numbers, spaces, underscores, or hyphens.",
            declared.providerId,
            "name"
        );
    if (typeof declared.executable !== "string" || !/^[A-Za-z0-9_.\/~+][A-Za-z0-9_.\/~+ -]*$/.test(declared.executable))
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "Choose a valid IDE executable.",
            declared.providerId,
            "executable"
        );
    if (
        typeof declared.providerType !== "string" ||
        !/^[a-z][a-z0-9_-]*$/.test(declared.providerType) ||
        !declared.settings ||
        typeof declared.settings !== "object" ||
        Array.isArray(declared.settings)
    )
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "Check this IDE's provider settings.",
            declared.providerId,
            "type"
        );
    for (const method of RequiredMethods) {
        if (typeof api[method] !== "function" || api[method] === Base.ProviderApi.prototype[method])
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "An IDE provider is misconfigured.",
                "Missing " + method
            );
    }
    return true;
}
