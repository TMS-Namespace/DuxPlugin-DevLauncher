// NeoVimProperties.js - Validate and declare one NeoVim installation and the terminal that runs it.
.pragma library
.import "../../../Plugin/JS/Contracts/ProviderProperties.js" as Base
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/ArgumentRules.js" as ArgumentRules
.import "NeoVimConstants.js" as Constants
.import "NeoVimDescriptor.js" as Descriptor
.import "NeoVimTerminal.js" as Terminal
// Rules: Checks one NeoVim installation and throws PluginError for an unsupported type, folder, or terminal; no I/O, QML types or logging.

// One NeoVim installation as checked plain data: its executable, its state folder, and the terminal that shows it.
var NeoVimProperties = class NeoVimProperties extends Base.ProviderProperties {
    // Convert saved provider settings into checked plain data; the installation type is always present (see the storage layer).
    constructor(configuration) {
        const values = configuration || {};
        const installationType = values.installationType;
        if (
            !Descriptor.create().installations.some(function (choice) {
                return choice.type === installationType;
            })
        )
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "This installation type is not supported by this provider.",
                String(installationType),
                "installationType"
            );
        const stateDirectory = values.config || "";
        if (!/^(\/|~\/)[^\u0000]*$/.test(stateDirectory))
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "Choose a valid NeoVim state folder.",
                stateDirectory,
                "config"
            );
        const terminal = values.terminal || "";
        if (!/^(\/|~\/)[^\u0000]*$/.test(terminal) || !Terminal.switchesFor(terminal))
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "Choose a supported terminal emulator.",
                terminal,
                "terminal"
            );
        super({
            providerType: Constants.PROVIDER_TYPE,
            installationType: installationType,
            providerId: values.id || "",
            name: values.name || "",
            executable: values.executable || "",
            extraArguments: ArgumentRules.validate(values.extraArguments || []),
            settings: { stateDirectory: stateDirectory, terminal: terminal }
        });
    }
};

// Build the checked declaration.
function create(configuration) {
    return new NeoVimProperties(configuration);
}

// Supply the conventional defaults for a new NeoVim installation.
function defaultConfiguration() {
    return {
        id: Constants.DEFAULT_PROVIDER_ID,
        type: Constants.PROVIDER_TYPE,
        installationType: InstallationType.Native,
        name: Constants.DEFAULT_NAME,
        executable: Constants.DEFAULT_EXECUTABLE,
        config: Constants.DEFAULT_STATE_DIRECTORY,
        terminal: Constants.DEFAULT_TERMINAL,
        extraArguments: []
    };
}
