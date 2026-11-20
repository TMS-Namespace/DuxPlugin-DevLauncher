// NeoVimDescriptor.js - Declare NeoVim's installation types and the terminal command field the settings page shows.
.pragma library
.import "NeoVimConstants.js" as Constants
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
// Rules: Plain declaration data only: no logic beyond returning the frozen descriptor; no QML types or logging.

// NeoVim's declaration. The executable is the terminal command, which the user supplies for every installation type, so each
// installation declares userExecutable: the empty default is filled in by the user. The installation type decides the program
// started inside that terminal: native NeoVim, or the Flatpak and Snap launchers.
var descriptor = Object.freeze({
    typeId: Constants.PROVIDER_TYPE,
    installations: Object.freeze([
        {
            type: InstallationType.Native,
            desktopId: "nvim",
            executable: "",
            userExecutable: true,
            config: Constants.DEFAULT_STATE_DIRECTORY
        },
        {
            type: InstallationType.Flatpak,
            desktopId: Constants.FLATPAK_DESKTOP_ID,
            executable: "",
            userExecutable: true,
            config: Constants.FLATPAK_STATE_DIRECTORY
        },
        {
            type: InstallationType.Snap,
            desktopId: Constants.SNAP_DESKTOP_ID,
            executable: "",
            userExecutable: true,
            config: Constants.DEFAULT_STATE_DIRECTORY
        }
    ]),
    defaultEnabled: false,
    name: Constants.DEFAULT_NAME,
    // NeoVim opens items in a terminal, so it offers launching and a terminal command.
    launchable: true,
    // NeoVim reads its own history; it does not scan folders.
    scansFolders: false,
    fields: Object.freeze([
        Object.freeze({
            key: "executable",
            kind: "executable",
            label: "Terminal command",
            description:
                "The full command that opens a terminal window and runs a program in it, including the terminal's switch. NeoVim is started after it, for example: ghostty -e",
            placeholder: Constants.TERMINAL_PLACEHOLDER,
            chooserTitle: "Choose the terminal emulator",
            comparison: "exact"
        }),
        Object.freeze({
            key: "config",
            kind: "directory",
            label: "NeoVim state folder",
            description: "Holds NeoVim's history file, normally ~/.local/state/nvim.",
            placeholder: Constants.DEFAULT_STATE_DIRECTORY,
            chooserTitle: "Choose NeoVim state folder",
            comparison: "exact"
        })
    ]),
    dependents: Object.freeze({})
});

// Return the declaration consumed by the plugin's registry and editor.
function create() {
    return descriptor;
}
