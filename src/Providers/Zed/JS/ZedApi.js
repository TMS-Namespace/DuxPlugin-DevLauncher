// ZedApi.js - Normalize Zed history and build commands for native and Flatpak installations.
.pragma library
.import "../../../Plugin/JS/Contracts/ProviderApi.js" as Base
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "ZedConstants.js" as Constants
.import "ZedHistoryPath.js" as ZedHistoryPath
// Rules: Pure history parsing and command building: throws PluginError for bad input and never runs a process; no QML types or logging.

// A packaging launcher identifies Zed before any IDE-specific switches.
function flatpak(properties) {
    return properties.installationType === InstallationType.Flatpak;
}
// Raise a provider-specific validation error with a friendly message and the raw details kept for the log.
function fail(message, details, field) {
    throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, message, details, field);
}

// The Zed API: reads its history database and builds the launch, validation and read commands for each installation type.
var ZedApi = class ZedApi extends Base.ProviderApi {
    // Return the Zed history database under the configured data folder as the only source.
    sources(properties) {
        return [{ path: properties.settings.dataDirectory + Constants.HISTORY_PATH }];
    }
    // Normalize the Zed history rows: one record per local path, keeping the latest date and whether the path is a file.
    parseHistory(snapshot, properties) {
        const byPath = {};
        for (const row of snapshot.rows || []) {
            const path = ZedHistoryPath.historyPath(row);
            if (!path) continue;
            const openedAt = Date.parse(String(row.timestamp || "").replace(" ", "T") + "Z") || 0;
            const previous = byPath[path];
            const date = Math.max(openedAt, previous ? previous.openedAt : 0);
            const kind = row.kind === "file" || (previous && previous.kind === "file") ? "file" : "folder";
            byPath[path] = {
                path: path,
                kind: kind,
                provider: properties.providerId,
                providerName: properties.name,
                openedAt: date,
                recent: date
            };
        }
        return Object.keys(byPath).map(function (path) {
            return byPath[path];
        });
    }
    // Build the native, Flatpak, or Snap command with the path as its own argument.
    launchArgs(path, properties, home) {
        if (!PathRules.resourcePath(path)) fail("Choose a valid file or folder.", path, "");
        if (PathRules.resourceType(path) === "remote" && !path.startsWith("ssh://"))
            fail("Zed cannot open this remote connection from its command line.", path, "");
        const executable = PathRules.expand(properties.executable, home, "");
        const launcherArgs = flatpak(properties)
            ? ["run", Constants.FLATPAK_ID]
            : properties.installationType === InstallationType.Snap
              ? ["run", Constants.SNAP_NAME]
              : [];
        return [executable].concat(launcherArgs, properties.extraArguments, [path]);
    }
    // Build the command that proves the configured installation exists, for each installation type.
    validationArgs(properties, home) {
        const executable = PathRules.expand(properties.executable, home, "");
        if (flatpak(properties)) return [executable, "info", "--show-ref", Constants.FLATPAK_ID];
        if (properties.installationType === InstallationType.Snap) return [executable, "list", Constants.SNAP_NAME];
        return [executable, "--version"];
    }
    // The data folder and the history database this installation must be able to read.
    validationPaths(properties, home, configHome) {
        const directory = PathRules.expand(properties.settings.dataDirectory, home, configHome);
        return [
            {
                field: "config",
                label: "IDE data folder",
                path: directory,
                kind: "directory",
                optional: false,
                unique: true
            },
            {
                field: "config",
                label: "Zed history database",
                path: directory + Constants.HISTORY_PATH,
                kind: "file",
                optional: false,
                unique: false
            }
        ];
    }
    // Check that the executable output names Zed for the configured installation type.
    validateExecutable(output, properties) {
        const valid = flatpak(properties)
            ? String(output)
                  .trim()
                  .startsWith("app/" + Constants.FLATPAK_ID + "/")
            : properties.installationType === InstallationType.Snap
              ? String(output)
                    .split("\n")
                    .some(function (line) {
                        return line.trim().split(/\s+/)[0] === Constants.SNAP_NAME;
                    })
              : /zed/i.test(String(output));
        if (!valid) fail("Choose a working Zed installation.", String(output), "executable");
        return true;
    }
    // Reject empty or malformed additional arguments before they reach a command.
    validateArguments(output, errorOutput, properties) {
        for (const argument of properties.extraArguments)
            if (!argument || argument.indexOf("\u0000") >= 0)
                fail("Check the additional arguments.", argument, "extraArguments");
        return true;
    }
    // Confirm the provider can read at least one local recent item.
    validateHistory(records, properties) {
        if (!records.length)
            fail(
                "No recent local files or projects were found for Zed. Check its data folder.",
                properties.settings.dataDirectory,
                "config"
            );
        return true;
    }
};
// Create the provider API.
function create() {
    return new ZedApi();
}
