// NeoVimApi.js - Normalize NeoVim's ShaDa file marks and build the launch, validation, and check commands.
.pragma library
.import "../../../Plugin/JS/Contracts/ProviderApi.js" as Base
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "NeoVimConstants.js" as Constants
.import "NeoVimShada.js" as Shada
.import "NeoVimTerminal.js" as Terminal
// Rules: Pure history parsing and command building: throws PluginError for bad input and never runs a process; no QML types or logging.

// Flatpak and Snap run NeoVim through their own command, so their launcher comes before NeoVim's arguments.
function isFlatpak(properties) {
    return properties.installationType === InstallationType.Flatpak;
}
function isSnap(properties) {
    return properties.installationType === InstallationType.Snap;
}
// Return the arguments that a packaging launcher needs before NeoVim's own arguments; native installs need none.
function launcherArguments(properties) {
    if (isFlatpak(properties)) return ["run", Constants.FLATPAK_ID];
    if (isSnap(properties)) return ["run", Constants.SNAP_NAME];
    return [];
}

// Raise a provider-specific validation error with a friendly message and the raw details kept for the log.
function fail(message, details, field) {
    throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, message, details, field);
}

// The NeoVim API: reads its ShaDa history and builds the terminal launch and validation commands.
var NeoVimApi = class NeoVimApi extends Base.ProviderApi {
    // The ShaDa history file under the configured state folder is the only history source.
    sources(properties) {
        return [{ path: properties.settings.stateDirectory + Constants.SHADA_PATH }];
    }
    // The local paths marked in the history text, newest first. The reader checks which of them are folders.
    markedPaths(snapshot) {
        return Shada.records(Shada.decodeBase64(snapshot.text)).map(function (record) {
            return record.path;
        });
    }
    // Normalize the marked paths: each record keeps its path, whether it is a folder, and the time NeoVim last marked it.
    parseHistory(snapshot, properties) {
        const folders = {};
        for (const path of snapshot.directories || []) folders[path] = true;
        return Shada.records(Shada.decodeBase64(snapshot.text)).map(function (record) {
            const openedAt = record.timestamp * 1000;
            return {
                path: record.path,
                kind: folders[record.path] ? "folder" : "file",
                provider: properties.providerId,
                providerName: properties.name,
                openedAt: openedAt,
                recent: openedAt
            };
        });
    }
    // Build the terminal command: the terminal's own switches, then NeoVim, its switches, and the path as separate arguments.
    launchArgs(path, properties, home) {
        if (!PathRules.resourcePath(path)) fail("Choose a valid file or folder.", path, "");
        const switches = Terminal.switchesFor(properties.settings.terminal);
        if (!switches) fail("Choose a supported terminal emulator.", properties.settings.terminal, "terminal");
        const terminal = PathRules.expand(properties.settings.terminal, home, "");
        const program = PathRules.expand(properties.executable, home, "");
        return [terminal].concat(switches, [program], launcherArguments(properties), properties.extraArguments, [path]);
    }
    // Build the command that prints NeoVim's version without opening an editor.
    validationArgs(properties, home) {
        const program = PathRules.expand(properties.executable, home, "");
        if (isFlatpak(properties)) return [program, "info", "--show-ref", Constants.FLATPAK_ID];
        if (isSnap(properties)) return [program, "list", Constants.SNAP_NAME];
        return [program, "--version"];
    }
    // The state folder and terminal must exist; the history file is optional, because NeoVim writes it only after a session.
    validationPaths(properties, home, configHome) {
        const directory = PathRules.expand(properties.settings.stateDirectory, home, configHome);
        return [
            {
                field: "config",
                label: "NeoVim state folder",
                path: directory,
                kind: "directory",
                optional: false,
                unique: true
            },
            {
                field: "config",
                label: "NeoVim ShaDa history file",
                path: directory + Constants.SHADA_PATH,
                kind: "file",
                optional: true,
                unique: false
            },
            {
                field: "terminal",
                label: "Terminal emulator",
                path: PathRules.expand(properties.settings.terminal, home, configHome),
                kind: "file",
                optional: false,
                unique: false
            }
        ];
    }
    // The version line must name NeoVim, so another program with the same executable name is refused.
    validateExecutable(output, properties) {
        const text = String(output || "");
        const valid = isFlatpak(properties)
            ? text.trim().startsWith("app/" + Constants.FLATPAK_ID + "/")
            : isSnap(properties)
              ? text.split("\n").some((line) => line.trim().split(/\s+/)[0] === Constants.SNAP_NAME)
              : /^NVIM v\d+\.\d+/m.test(text);
        if (!valid) fail("Choose a working NeoVim installation.", text, "executable");
        return true;
    }
    // Reject empty or malformed additional arguments before they reach the command line.
    validateArguments(output, errorOutput, properties) {
        for (const argument of properties.extraArguments)
            if (!argument || argument.indexOf("\u0000") >= 0)
                fail("Check the additional arguments.", argument, "extraArguments");
        return true;
    }
    // A configured NeoVim is usable only when at least one local file or folder was marked in its history.
    validateHistory(records, properties) {
        if (!records.length)
            fail(
                "No recent local files or folders were found for NeoVim. Check its state folder.",
                properties.settings.stateDirectory,
                "config"
            );
        return true;
    }
};

// Create the provider API.
function create() {
    return new NeoVimApi();
}
