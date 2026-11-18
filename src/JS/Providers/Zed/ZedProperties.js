// ZedProperties.js - Validate and declare one Zed installation.
.pragma library
// Rules: Checks one Zed installation and throws PluginError for an unsupported type or invalid folder; no I/O, QML types or logging.
.import "../../Contracts/ProviderProperties.js" as Base
.import "../../Contracts/InstallationType.js" as InstallationType
.import "../../Contracts/PluginError.js" as PluginError
.import "../../Helpers/ArgumentRules.js" as ArgumentRules
.import "ZedConstants.js" as Constants
.import "ZedDescriptor.js" as Descriptor

// One Zed installation as checked plain data: its launcher type and its data folder.
var ZedProperties = class ZedProperties extends Base.ProviderProperties {
    // Convert saved provider settings into checked plain data; the installation type is always present (see the storage layer).
    constructor(configuration) {
        const values = configuration || {};
        const installationType = values.installationType;
        if (!Descriptor.create().installations.some(function(choice) { return choice.type === installationType; })) throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This installation type is not supported by this provider.", String(installationType), "installationType");
        const directory = values.config || "";
        if (!/^(\/|~\/|\$XDG_CONFIG_HOME\/)[^\u0000]*$/.test(directory))
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a valid Zed data folder.", directory, "config");
        super({ providerType: Constants.PROVIDER_TYPE, installationType: installationType, providerId: values.id || "", name: values.name || "", executable: values.executable || "", extraArguments: ArgumentRules.validate(values.extraArguments || []), settings: { dataDirectory: directory } });
    }
};
// Build the checked declaration.
function create(configuration) { return new ZedProperties(configuration); }
// Supply the conventional defaults for a new Zed installation, which is the Flatpak one.
function defaultConfiguration() {
    return { id: Constants.DEFAULT_PROVIDER_ID, type: Constants.PROVIDER_TYPE, installationType: InstallationType.Flatpak, name: Constants.DEFAULT_NAME, executable: Constants.DEFAULT_EXECUTABLE, config: Constants.DEFAULT_DATA_DIRECTORY, extraArguments: [] };
}
