// VSCodeDescriptor.js - Declare every label, placeholder, chooser title, and field dependency the plugin needs for VS Code.
.pragma library
// Rules: Plain declaration data only: no logic beyond returning the frozen descriptor; no QML types or logging.
.import "VSCodeConstants.js" as Constants
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType

// The plugin reads names, field text, and dependencies only from this declaration, never from its own literals.
// Field kinds tell the plugin which chooser to open: an executable or a directory.
// "comparison: basename" means two executable paths match when their file names match.
// Each dependents entry lists the fields that are cleared when the key changes away from its default.
// defaultEnabled: true seeds this IDE into a new settings list; other IDEs are added by the user.
var descriptor = Object.freeze({
    typeId: Constants.PROVIDER_TYPE, installations: Object.freeze([{ type: InstallationType.Native, executable: Constants.DEFAULT_EXECUTABLE, config: Constants.DEFAULT_CONFIG_DIRECTORY, shared: Constants.DEFAULT_SHARED_STORAGE_DIRECTORY }, { type: InstallationType.Flatpak, iconName: Constants.FLATPAK_ID, executable: "/usr/bin/flatpak", config: Constants.FLATPAK_CONFIG_DIRECTORY, shared: Constants.FLATPAK_SHARED_DIRECTORY }, { type: InstallationType.Snap, desktopId: "code_code", executable: Constants.SNAP_EXECUTABLE, config: Constants.DEFAULT_CONFIG_DIRECTORY, shared: Constants.DEFAULT_SHARED_STORAGE_DIRECTORY }]),
    defaultEnabled: true,
    name: Constants.DEFAULT_NAME,
    // The IDE opens items, so it offers launching and an executable.
    launchable: true,
    // The IDE reads its own history; it does not scan folders.
    scansFolders: false,
    fields: Object.freeze([
        Object.freeze({ key: "executable", kind: "executable", label: "IDE executable path", description: "Choose the executable used to open results.", placeholder: "/usr/bin/code", chooserTitle: "Choose IDE executable", comparison: "basename" }),
        Object.freeze({ key: "config", kind: "directory", label: "IDE data folder", description: "Stores this installation's recent history.", placeholder: Constants.DEFAULT_CONFIG_DIRECTORY, chooserTitle: "Choose IDE data folder", comparison: "exact" }),
        Object.freeze({ key: "shared", kind: "directory", label: "Shared history folder", description: "Used by VS Code's shared recent history.", placeholder: Constants.DEFAULT_SHARED_STORAGE_DIRECTORY, chooserTitle: "Choose shared IDE storage folder", comparison: "exact" })
    ]),
    dependents: Object.freeze({ executable: Object.freeze(["config", "shared"]), config: Object.freeze(["shared"]) })
});

// Return the declaration consumed by the plugin's registry and editor.
function create() { return descriptor; }
