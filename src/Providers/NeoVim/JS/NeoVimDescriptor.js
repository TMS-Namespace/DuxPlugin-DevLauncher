// NeoVimDescriptor.js - Declare every label, placeholder, and chooser title the plugin needs for NeoVim.
.pragma library
.import "NeoVimConstants.js" as Constants
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
// Rules: Plain declaration data only: no logic beyond returning the frozen descriptor; no QML types or logging.

// NeoVim's declaration: its native, Flatpak, and Snap installations, each with its executable and state folder, plus the terminal that shows the editor.
// The terminal is a field of its own, because NeoVim is a terminal program and needs a window to start in.
var descriptor = Object.freeze({
    typeId: Constants.PROVIDER_TYPE,
    installations: Object.freeze([
        {
            type: InstallationType.Native,
            desktopId: "nvim",
            executable: Constants.DEFAULT_EXECUTABLE,
            config: Constants.DEFAULT_STATE_DIRECTORY
        },
        {
            type: InstallationType.Flatpak,
            desktopId: Constants.FLATPAK_DESKTOP_ID,
            executable: Constants.FLATPAK_EXECUTABLE,
            config: Constants.FLATPAK_STATE_DIRECTORY
        },
        {
            type: InstallationType.Snap,
            desktopId: Constants.SNAP_DESKTOP_ID,
            executable: Constants.SNAP_EXECUTABLE,
            config: Constants.DEFAULT_STATE_DIRECTORY
        }
    ]),
    defaultEnabled: false,
    name: Constants.DEFAULT_NAME,
    // NeoVim opens items in a terminal, so it offers launching and an executable.
    launchable: true,
    // NeoVim reads its own history; it does not scan folders.
    scansFolders: false,
    fields: Object.freeze([
        Object.freeze({
            key: "executable",
            kind: "executable",
            label: "NeoVim executable path",
            description: "Choose the nvim program used to open results.",
            placeholder: "/usr/bin/nvim",
            chooserTitle: "Choose NeoVim executable",
            comparison: "basename"
        }),
        Object.freeze({
            key: "config",
            kind: "directory",
            label: "NeoVim state folder",
            description: "Holds NeoVim's history file, normally ~/.local/state/nvim.",
            placeholder: Constants.DEFAULT_STATE_DIRECTORY,
            chooserTitle: "Choose NeoVim state folder",
            comparison: "exact"
        }),
        Object.freeze({
            key: "terminal",
            kind: "executable",
            label: "Terminal emulator",
            description: "Opens NeoVim in a terminal window.",
            placeholder: Constants.DEFAULT_TERMINAL,
            chooserTitle: "Choose terminal emulator",
            comparison: "basename"
        })
    ]),
    dependents: Object.freeze({})
});

// Return the declaration consumed by the plugin's registry and editor.
function create() {
    return descriptor;
}
