// VSCodeApi.js - Describe VS Code history files, parse local recents, and build launch args.
.pragma library
.import "../../../Plugin/JS/Contracts/ProviderApi.js" as Base
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "VSCodeConstants.js" as Constants
.import "VSCodeCommands.js" as VSCodeCommands
.import "VSCodeValidation.js" as VSCodeValidation
// Rules: Pure history parsing and command building: throws PluginError for bad input and never runs a process; no QML types or logging.
// The deduction of one step: (LAUNCH_DECAY_BASE ^ order_index) hours, capped at ten days, in milliseconds.
// Each entry's estimated date is the previous entry's date less its own step's deduction, starting from the history file's time.
function stepDeduction(orderIndex) {
    return (
        Math.min(Math.pow(Constants.LAUNCH_DECAY_BASE, orderIndex), Constants.LAUNCH_MAX_DEDUCTION_HOURS) *
        Constants.HOUR_MILLISECONDS
    );
}

// The VS Code history reader and command builder for native, Flatpak and Snap installations.
var VSCodeApi = class VSCodeApi extends Base.ProviderApi {
    // Prefer shared storage, then older SQLite and JSON locations.
    sources(properties) {
        const config = properties.settings.configDirectory.replace(/\/$/, "");
        const sources = [];
        let shared = properties.settings.sharedStorageDirectory;
        if (!shared && /(?:^|\/)\.config\/[^/]+$/.test(config)) {
            const basename = config.split("/").pop();
            const sharedName = Constants.SHARED_NAMES[basename] || basename.toLowerCase().replace(/\s+/g, "-");
            shared = "~/." + sharedName + "-shared";
        }
        if (shared) sources.push({ path: shared + "/sharedStorage/state.vscdb", key: Constants.RECENT_KEY });
        sources.push({ path: config + "/User/globalStorage/state.vscdb", key: Constants.RECENT_KEY });
        sources.push({ path: config + "/User/globalStorage/storage.json", key: Constants.JSON_KEY });
        return sources;
    }
    // Preserve stored order while accepting local folders, files, and workspace files.
    parseHistory(snapshot, properties) {
        const history = snapshot.history || {};
        const fields = [
            ["entries", "folder"],
            ["workspaces3", "folder"],
            ["files2", "file"]
        ];
        const records = [];
        // The position counts entries across all three lists, so the estimate follows the order VS Code stores them in.
        let position = 0;
        // The running estimate starts at the history file's time; without that time there is no date to estimate from.
        let estimate = Number(snapshot.modifiedAt) > 0 ? Number(snapshot.modifiedAt) : 0;
        for (const field of fields) {
            const entries = Array.isArray(history[field[0]]) ? history[field[0]] : [];
            for (let i = 0; i < entries.length && i < Constants.MAX_PER_LIST; i++) {
                const entry = entries[i];
                const workspace = entry && typeof entry === "object" ? entry.workspace : null;
                const candidate =
                    entry && typeof entry === "object"
                        ? entry.folderUri || entry.fileUri || (workspace && workspace.configPath)
                        : entry;
                const path = PathRules.resourcePath(candidate);
                if (!path) continue;
                const kind = path.endsWith(".code-workspace")
                    ? "workspace"
                    : entry && entry.fileUri
                      ? "file"
                      : field[1];
                estimate = Math.max(0, estimate - stepDeduction(position));
                const openedAt = estimate > 0 ? Math.round(estimate) : 0;
                records.push({
                    path: path,
                    kind: kind,
                    provider: properties.providerId,
                    providerName: properties.name,
                    recent: openedAt > 0 ? openedAt : Constants.MAX_PER_LIST - position,
                    openedAt: openedAt
                });
                position++;
            }
        }
        return records;
    }
    // The data folder is required; shared storage is a usable but optional history source.
    validationPaths(properties, home, configHome) {
        const paths = [
            {
                field: "config",
                label: "IDE data folder",
                path: PathRules.expand(properties.settings.configDirectory, home, configHome),
                kind: "directory",
                optional: false,
                unique: true
            }
        ];
        const shared = properties.settings.sharedStorageDirectory;
        if (shared)
            paths.push({
                field: "shared",
                label: "Shared history folder",
                path: PathRules.expand(shared, home, configHome),
                kind: "directory",
                optional:
                    shared === Constants.DEFAULT_SHARED_STORAGE_DIRECTORY ||
                    shared === Constants.FLATPAK_SHARED_DIRECTORY,
                unique: true
            });
        for (const source of this.sources(properties))
            paths.push({
                field: shared && source.path.startsWith(shared + "/") ? "shared" : "config",
                label: "IDE history file",
                path: PathRules.expand(source.path, home, configHome),
                kind: "file",
                optional: true,
                unique: false
            });
        return paths;
    }
    // Build the launch command through the command module, passing the open kind that the caller supplies.
    launchArgs(path, properties, home) {
        return VSCodeCommands.launchArgs(path, properties, home, arguments[3]);
    }
    // Build the executable check through the command module.
    validationArgs(properties, home) {
        return VSCodeCommands.validationArgs(properties, home);
    }
    // Check the executable's answer through the validation module.
    validateExecutable(output, properties) {
        return VSCodeValidation.validateExecutable(output, properties);
    }
    // Check configured switches through the validation module.
    validateArguments(output, errorOutput, properties) {
        return VSCodeValidation.validateArguments(output, errorOutput, properties);
    }
    // Check that the read returned usable history through the validation module.
    validateHistory(records, properties) {
        return VSCodeValidation.validateHistory(records, properties);
    }
};

// Create the API object expected by ProvidersManager.
function create() {
    return new VSCodeApi();
}
