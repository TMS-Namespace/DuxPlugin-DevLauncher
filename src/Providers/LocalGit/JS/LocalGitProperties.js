// LocalGitProperties.js - Declare one scanned folder as plain data; the folder is the only setting it needs.
.pragma library
// Rules: Checks one scanned folder and throws PluginError for an unsupported type or a missing folder; no I/O, QML types or logging.
.import "../../../Plugin/JS/Contracts/ProviderProperties.js" as Base
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "LocalGitConstants.js" as Constants
.import "LocalGitDescriptor.js" as Descriptor

// One scanned folder as plain data; the folder is the only setting it needs.
var LocalGitProperties = class LocalGitProperties extends Base.ProviderProperties {
    // Convert one saved scan folder into checked plain data; the folder must be an absolute local path.
    constructor(configuration) {
        const values = configuration || {};
        // The installation type is always present: the storage layer fills it in for older saved entries.
        const installationType = values.installationType;
        if (!Descriptor.create().installations.some(function(choice) { return choice.type === installationType; })) throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This installation type is not supported by this provider.", String(installationType), "installationType");
        const folder = PathRules.localPath(values.folder || "");
        if (!folder)
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a local folder to scan.", String(values.folder || ""));
        super({
            providerType: Constants.PROVIDER_TYPE, installationType: installationType,
            providerId: values.id || "",
            name: values.name || Constants.DEFAULT_NAME,
            executable: Constants.EXECUTABLE,
            extraArguments: [],
            settings: { folder: folder, depth: values.depth }
        });
    }
};

// Build the declaration expected by ProvidersManager.
function create(configuration) { return new LocalGitProperties(configuration); }

// A valid placeholder used only by the contributor check; saved folders always carry their own values.
function defaultConfiguration() {
    return { id: "9f8e7d6c-5b4a-4c3b-8a2d-1e0f9a8b7c6d", type: Constants.PROVIDER_TYPE, installationType: InstallationType.Native, name: Constants.DEFAULT_NAME, folder: "/" };
}
