// LocalGitProperties.js - Declare one scanned folder as plain data; the folder is the only setting it needs.
.pragma library
.import "../../Contracts/ProviderProperties.js" as Base
.import "../../Contracts/PluginError.js" as PluginError
.import "../../Helpers/PathRules.js" as PathRules
.import "LocalGitConstants.js" as Constants

var LocalGitProperties = class LocalGitProperties extends Base.ProviderProperties {
    // Convert one saved scan folder into checked plain data; the folder must be an absolute local path.
    constructor(configuration) {
        const values = configuration || {};
        const folder = PathRules.localPath(values.folder || "");
        if (!folder)
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a local folder to scan.", String(values.folder || ""));
        super({
            providerType: Constants.PROVIDER_TYPE,
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
    return { id: "9f8e7d6c-5b4a-4c3b-8a2d-1e0f9a8b7c6d", type: Constants.PROVIDER_TYPE, name: Constants.DEFAULT_NAME, folder: "/" };
}
