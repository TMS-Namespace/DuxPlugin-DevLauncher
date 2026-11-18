// LocalGitApi.js - Turn find output for one folder into repository records, and refuse everything a folder cannot do.
.pragma library
.import "../../Contracts/ProviderApi.js" as Base
.import "../../Contracts/PluginError.js" as PluginError
.import "../../Helpers/Config.js" as Config
.import "../../Helpers/PathRules.js" as PathRules
.import "FolderScanningHelper.js" as FolderScanningHelper
.import "LocalGitConstants.js" as Constants

var LocalGitApi = class LocalGitApi extends Base.ProviderApi {
    // The scanned folder is the only source; the reader runs find on it.
    sources(properties) { return [{ path: properties.settings.folder, key: "" }]; }

    // Keep the Git roots that find reported, each tagged with this folder's identity; the per-folder cap applies.
    parseHistory(snapshot, properties) {
        return FolderScanningHelper.repositoryRoots(snapshot.output, Config.maxRepositories).map(function(record) {
            return Object.assign({}, record, { provider: properties.providerId, providerName: properties.name });
        });
    }

    // A folder source never opens items.
    launchArgs(path, properties, home) {
        throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This source cannot open items.", "launchArgs");
    }

    // The find version probe, so the validator can check the executable like any other source.
    validationArgs(properties, home) { return [Constants.EXECUTABLE, Constants.VERSION_ARGUMENT]; }

    // The folder itself must be readable; nothing else is declared.
    validationPaths(properties, home, configHome) {
        return [{ label: "Scan folder", path: PathRules.expand(properties.settings.folder, home, configHome), kind: "directory", optional: false, unique: true }];
    }

    // The probe must name find, since the source runs find.
    validateExecutable(output, properties) {
        if (!/\bfind\b/i.test(String(output || "")))
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a find executable for the scanned folder.", properties.executable);
        return true;
    }

    // A folder source takes no additional arguments.
    validateArguments(output, errorOutput, properties) {
        if (properties.extraArguments.length)
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "A scanned folder takes no additional arguments.", "extraArguments");
        return true;
    }

    // A folder with no repositories is still a valid folder.
    validateHistory(records, properties) { return true; }
};

// Create the API object expected by ProvidersManager.
function create() { return new LocalGitApi(); }
