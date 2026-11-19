// RiderProperties.js - Validate and declare one Rider installation.
.pragma library
.import "../../../Plugin/JS/Contracts/ProviderProperties.js" as Base
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/ArgumentRules.js" as ArgumentRules
.import "RiderConstants.js" as Constants
.import "RiderDescriptor.js" as Descriptor
// Rules: Checks one Rider installation and throws PluginError for an unsupported type or invalid folder; no I/O, QML types or logging.
// One Rider installation as checked plain data: its launcher type and its configuration folder.
var RiderProperties = class RiderProperties extends Base.ProviderProperties {
    // Check the Rider installation type and configuration folder, and throw a PluginError when either is invalid.
    constructor(configuration) {
        const values = configuration || {};
        // The installation type is always present: the storage layer fills it in for older saved entries.
        const installationType = values.installationType;
        if (
            !Descriptor.create().installations.some(function (choice) {
                return choice.type === installationType;
            })
        )
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "This installation type is not supported by Rider.",
                String(installationType),
                "installationType"
            );
        const directory = values.config || "";
        if (!/^(\/|~\/|\$XDG_CONFIG_HOME\/)[^\u0000]*$/.test(directory))
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "Choose a valid Rider configuration folder.",
                directory,
                "config"
            );
        super({
            providerType: Constants.PROVIDER_TYPE,
            providerId: values.id || "",
            installationType: installationType,
            name: values.name || "",
            executable: values.executable || "",
            extraArguments: ArgumentRules.validate(values.extraArguments || []),
            settings: { configDirectory: directory }
        });
    }
};
// Build the checked declaration.
function create(configuration) {
    return new RiderProperties(configuration);
}
// Supply conventional defaults without choosing an installed Rider version.
function defaultConfiguration() {
    return {
        id: Constants.DEFAULT_PROVIDER_ID,
        type: Constants.PROVIDER_TYPE,
        installationType: InstallationType.Native,
        name: Constants.DEFAULT_NAME,
        executable: Constants.DEFAULT_EXECUTABLE,
        config: Constants.DEFAULT_CONFIG_DIRECTORY,
        extraArguments: []
    };
}
