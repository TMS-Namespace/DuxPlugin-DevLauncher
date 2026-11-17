// VSCodeProperties.js - Declare one VS Code compatible IDE installation.
.pragma library
.import "../../Contracts/ProviderProperties.js" as Base
.import "../../Helpers/ArgumentRules.js" as ArgumentRules
.import "../../Contracts/PluginError.js" as PluginError
.import "VSCodeConstants.js" as Constants

var VSCodeProperties = class VSCodeProperties extends Base.ProviderProperties {
    // Convert saved provider settings into checked plain data.
    constructor(configuration) {
        const values = configuration || {};
        const configDirectory = values.config || "";
        const sharedStorageDirectory = values.shared || "";
        const localDirectory = /^(\/|~\/|\$XDG_CONFIG_HOME\/)[^\u0000]*$/;
        if (!localDirectory.test(configDirectory))
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a valid VS Code data folder.", configDirectory, "config");
        if (sharedStorageDirectory && !localDirectory.test(sharedStorageDirectory))
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a valid shared history folder.", sharedStorageDirectory, "shared");
        super({
            providerType: Constants.PROVIDER_TYPE,
            providerId: values.id || "",
            name: values.name || "",
            executable: values.executable || "",
            extraArguments: ArgumentRules.validate(values.extraArguments || []),
            settings: { configDirectory: configDirectory, sharedStorageDirectory: sharedStorageDirectory }
        });
    }
};

// Build the declaration expected by ProvidersManager.
function create(configuration) { return new VSCodeProperties(configuration); }

// Provide the conventional paths for a new VS Code installation.
function defaultConfiguration() {
    return { id: Constants.DEFAULT_PROVIDER_ID, type: Constants.PROVIDER_TYPE, name: Constants.DEFAULT_NAME, config: Constants.DEFAULT_CONFIG_DIRECTORY,
        executable: Constants.DEFAULT_EXECUTABLE, shared: Constants.DEFAULT_SHARED_STORAGE_DIRECTORY, extraArguments: [] };
}
