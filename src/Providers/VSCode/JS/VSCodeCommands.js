// VSCodeCommands.js - Build the VS Code launch and validation commands for native, Flatpak, and Snap installations.
.pragma library
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "VSCodeConstants.js" as Constants
// Rules: Pure command building: no process is run and no QML types or logging are used; PluginError marks bad input.

// Place provider switches before the path and keep every value in its own argument.
function launchArgs(path, properties, home, kind) {
    if (!PathRules.resourcePath(path))
        throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Choose a valid file or folder.", path);
    const launcherArgs =
        properties.installationType === InstallationType.Flatpak
            ? ["run", Constants.FLATPAK_ID]
            : properties.installationType === InstallationType.Snap
              ? ["run", Constants.SNAP_NAME]
              : [];
    const remoteArgs =
        PathRules.resourceType(path) === "remote"
            ? [kind === "file" || kind === "workspace" ? "--file-uri" : "--folder-uri", path]
            : [path];
    return [PathRules.expand(properties.executable, home, "")].concat(
        launcherArgs,
        properties.extraArguments,
        remoteArgs
    );
}

// Build the command that checks the configured executable without opening a window: a version call for native installs, a package query for Flatpak and Snap.
function validationArgs(properties, home) {
    const executable = PathRules.expand(properties.executable, home, "");
    if (properties.installationType === InstallationType.Flatpak)
        return [executable, "info", "--show-ref", Constants.FLATPAK_ID];
    if (properties.installationType === InstallationType.Snap) return [executable, "list", Constants.SNAP_NAME];
    return [executable].concat(properties.extraArguments, ["--version"]);
}
