// NeoVimCommands.js - Build the terminal command, the program started inside it, and the launcher arguments for NeoVim.
.pragma library
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "NeoVimConstants.js" as Constants
// Rules: Pure command building: throws PluginError for an empty terminal command and never runs a process; no QML types or logging.

// Flatpak and Snap run NeoVim through their own command, so their launcher comes before NeoVim's arguments.
function isFlatpak(properties) {
    return properties.installationType === InstallationType.Flatpak;
}
function isSnap(properties) {
    return properties.installationType === InstallationType.Snap;
}
// Return the program started inside the terminal: native NeoVim, or the Flatpak or Snap launcher.
function program(properties) {
    if (isFlatpak(properties)) return Constants.FLATPAK_PROGRAM;
    if (isSnap(properties)) return Constants.SNAP_PROGRAM;
    return Constants.NATIVE_PROGRAM;
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

// Split the terminal command into its program and the switches after it, each as a separate argument. The command is entered
// by the user, so a value with no words is refused, and only the program name gets home-folder expansion.
function terminalCommand(properties, home) {
    const words = String(properties.executable || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (!words.length)
        fail("Enter the terminal command, for example " + Constants.TERMINAL_PLACEHOLDER + ".", "empty", "executable");
    return [PathRules.expand(words[0], home, "")].concat(words.slice(1));
}
