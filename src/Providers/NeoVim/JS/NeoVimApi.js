// NeoVimApi.js - Normalize NeoVim's ShaDa file marks and build the launch, validation, and check commands.
.pragma library
.import "../../../Plugin/JS/Contracts/ProviderApi.js" as Base
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "NeoVimConstants.js" as Constants
.import "NeoVimShada.js" as Shada
.import "NeoVimCommands.js" as Commands
// Rules: Pure history parsing and command building: throws PluginError for bad input and never runs a process; no QML types or logging.

// The NeoVim API: reads its ShaDa history and builds the terminal launch and the checks for the terminal and NeoVim.
var NeoVimApi = class NeoVimApi extends Base.ProviderApi {
    // The ShaDa history file under the configured state folder is the only history source.
    sources(properties) {
        return [{ path: properties.settings.stateDirectory + Constants.SHADA_PATH }];
    }
    // The local paths marked in the history text, newest first. The reader checks which of them are folders.
    markedPaths(snapshot) {
        return Shada.records(snapshot.bytes).map(function (record) {
            return record.path;
        });
    }
    // Normalize the marked paths: each record keeps its path, whether it is a folder, and the time NeoVim last marked it.
    parseHistory(snapshot, properties) {
        const folders = {};
        for (const path of snapshot.directories || []) folders[path] = true;
        return Shada.records(snapshot.bytes).map(function (record) {
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
    // Build the launch: the terminal command, then the program and its launcher arguments, the extra arguments, and the path.
    launchArgs(path, properties, home) {
        if (!PathRules.resourcePath(path)) Commands.fail("Choose a valid file or folder.", path, "");
        return Commands.terminalCommand(properties, home).concat(
            [Commands.program(properties)],
            Commands.launcherArguments(properties),
            properties.extraArguments,
            [path]
        );
    }
    // The validator checks that the terminal program exists by resolving the first word of this command.
    validationArgs(properties, home) {
        return [Commands.terminalCommand(properties, home)[0]];
    }
    // The probe checks the NeoVim program from the plugin's own PATH, without opening a window.
    validationProbe(properties, executable) {
        if (Commands.isFlatpak(properties))
            return [Constants.FLATPAK_PROGRAM, "info", "--show-ref", Constants.FLATPAK_ID];
        if (Commands.isSnap(properties)) return [Constants.SNAP_PROGRAM, "list", Constants.SNAP_NAME];
        return [Constants.NATIVE_PROGRAM, "--version"];
    }
    // The state folder must exist; the history file is optional, because NeoVim writes it only after a session.
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
            }
        ];
    }
    // The version line must name NeoVim, so another program with the same executable name is refused.
    validateExecutable(output, properties) {
        const text = String(output || "");
        const valid = Commands.isFlatpak(properties)
            ? text.trim().startsWith("app/" + Constants.FLATPAK_ID + "/")
            : Commands.isSnap(properties)
              ? text.split("\n").some((line) => line.trim().split(/\s+/)[0] === Constants.SNAP_NAME)
              : /^NVIM v\d+\.\d+/m.test(text);
        if (!valid) Commands.fail("Choose a working NeoVim installation.", text, "executable");
        return true;
    }
    // Reject empty or malformed additional arguments before they reach the command line.
    validateArguments(output, errorOutput, properties) {
        for (const argument of properties.extraArguments)
            if (!argument || argument.indexOf("\u0000") >= 0)
                Commands.fail("Check the additional arguments.", argument, "extraArguments");
        return true;
    }
    // A configured NeoVim is usable only when at least one local file or folder was marked in its history.
    validateHistory(records, properties) {
        if (!records.length)
            Commands.fail(
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
