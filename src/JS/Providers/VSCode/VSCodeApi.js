// VSCodeApi.js - Describe VS Code history files, parse local recents, and build launch args.
.pragma library
// Rules: Pure history parsing and command building: throws PluginError for bad input and never runs a process; no QML types or logging.
.import "../../Contracts/ProviderApi.js" as Base
.import "../../Contracts/InstallationType.js" as InstallationType
.import "../../Contracts/PluginError.js" as PluginError
.import "../../Helpers/PathRules.js" as PathRules
.import "VSCodeConstants.js" as Constants

// Order one history entry by its position, using the file time when the IDE's file time is known.
// Without a file time the position alone ranks entries, so they stay below any dated entries.
function recentRank(modifiedAt, position) {
    if (Number(modifiedAt) > 0) return Math.max(0, modifiedAt - position);
    return Constants.MAX_PER_LIST - position;
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
        const fields = [["entries", "folder"], ["workspaces3", "folder"], ["files2", "file"]];
        const records = [];
        for (const field of fields) {
            const entries = Array.isArray(history[field[0]]) ? history[field[0]] : [];
            for (let i = 0; i < entries.length && i < Constants.MAX_PER_LIST; i++) {
                const entry = entries[i];
                const workspace = entry && typeof entry === "object" ? entry.workspace : null;
                const candidate = entry && typeof entry === "object"
                    ? entry.folderUri || entry.fileUri || (workspace && workspace.configPath)
                    : entry;
                const path = PathRules.localPath(candidate);
                if (!path) continue;
                const kind = path.endsWith(".code-workspace") ? "workspace" : entry && entry.fileUri ? "file" : field[1];
                records.push({ path: path, kind: kind, provider: properties.providerId, providerName: properties.name, recent: recentRank(snapshot.modifiedAt, i), openedAt: snapshot.modifiedAt });
            }
        }
        return records;
    }

    // Place provider switches before the path and keep every value in its own argument.
    launchArgs(path, properties, home) {
        if (!path || !path.startsWith("/"))
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a local file or folder.", path);
        const launcherArgs = properties.installationType === InstallationType.Flatpak ? ["run", Constants.FLATPAK_ID] : properties.installationType === InstallationType.Snap ? ["run", Constants.SNAP_NAME] : [];
        return [PathRules.expand(properties.executable, home, "")].concat(launcherArgs, properties.extraArguments, [path]);
    }

    // Build the command that checks the configured executable without opening a window: a version call for native installs, a package query for Flatpak and Snap.
    validationArgs(properties, home) {
        const executable = PathRules.expand(properties.executable, home, "");
        if (properties.installationType === InstallationType.Flatpak) return [executable, "info", "--show-ref", Constants.FLATPAK_ID];
        if (properties.installationType === InstallationType.Snap) return [executable, "list", Constants.SNAP_NAME];
        return [executable].concat(properties.extraArguments, ["--version"]);
    }

    // The data folder is required; shared storage is a usable but optional history source.
    validationPaths(properties, home, configHome) {
        const paths = [{ field: "config", label: "IDE data folder", path: PathRules.expand(properties.settings.configDirectory, home, configHome), kind: "directory", optional: false, unique: true }];
        const shared = properties.settings.sharedStorageDirectory;
        if (shared) paths.push({ field: "shared", label: "Shared history folder", path: PathRules.expand(shared, home, configHome), kind: "directory", optional: shared === Constants.DEFAULT_SHARED_STORAGE_DIRECTORY || shared === Constants.FLATPAK_SHARED_DIRECTORY, unique: true });
        for (const source of this.sources(properties))
            paths.push({ field: shared && source.path.startsWith(shared + "/") ? "shared" : "config", label: "IDE history file", path: PathRules.expand(source.path, home, configHome), kind: "file", optional: true, unique: false });
        return paths;
    }

    // A VS Code compatible CLI prints a version; its executable must have a known name.
    validateExecutable(output, properties) {
        if (properties.installationType === InstallationType.Flatpak) {
            if (!String(output).trim().startsWith("app/" + Constants.FLATPAK_ID + "/"))
                throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a working VS Code Flatpak installation.", String(output), "executable");
            return true;
        }
        if (properties.installationType === InstallationType.Snap) {
            if (!String(output).split("\n").some(function(line) { return line.trim().split(/\s+/)[0] === Constants.SNAP_NAME; }))
                throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a working VS Code Snap installation.", String(output), "executable");
            return true;
        }
        const name = properties.executable.split("/").pop();
        const allowed = ["code", "code-insiders", "code-oss", "codium", "codium-insiders", "cursor"];
        if (allowed.indexOf(name) < 0 || !/^\d+\.\d+(?:\.\d+)?/m.test(String(output || "")))
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a VS Code compatible executable that responds to --version.", properties.executable, "executable");
        return true;
    }

    // Reject malformed switch sequences and warnings reported by the selected CLI.
    validateArguments(output, errorOutput, properties) {
        const valueSwitches = ["--profile", "--user-data-dir", "--extensions-dir", "--locale", "--log", "--category", "--disable-extension", "--inspect-extensions", "--inspect-brk-extensions", "--sync", "--locate-shell-integration-path", "--enable-proposed-api", "--install-extension", "--uninstall-extension", "--add", "--remove", "--goto", "--add-mcp"];
        const argumentsList = properties.extraArguments;
        for (let index = 0; index < argumentsList.length; index++) {
            const argument = argumentsList[index];
            if (!argument.startsWith("-"))
                throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Additional arguments must be IDE switches or their values.", argument, "extraArguments");
            if (valueSwitches.includes(argument)) {
                const value = argumentsList[++index];
                if (!value || !value.trim() || value.startsWith("-"))
                    throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, argument + " needs a value in Additional command arguments.", argument, "extraArguments");
            }
        }
        const response = String(output || "") + "\n" + String(errorOutput || "");
        if (/not in the list of known options|unknown option|unrecognized option|requires a non empty value|invalid option/i.test(response))
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This IDE rejected an additional command argument. Check the switches and values.", response.slice(0, Constants.MAX_DIAGNOSTIC_CHARACTERS), "extraArguments");
        return true;
    }

    // A configured provider is ready only when local recent items can be read.
    validateHistory(records, properties) {
        if (!records.length)
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "No recent local files or projects were found for this IDE. Check its data folder.", properties.settings.configDirectory, "config");
        return true;
    }

};

// Create the API object expected by ProvidersManager.
function create() { return new VSCodeApi(); }
