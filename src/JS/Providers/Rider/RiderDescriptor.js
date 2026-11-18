// RiderDescriptor.js - Declare Rider installation and history settings for the generic editor.
.pragma library
// Rules: Plain declaration data only: no logic beyond returning the frozen descriptor; no QML types or logging.
.import "RiderConstants.js" as Constants
.import "../../Contracts/InstallationType.js" as InstallationType
var descriptor = Object.freeze({ typeId: Constants.PROVIDER_TYPE, name: Constants.DEFAULT_NAME, iconName: "jetbrains-rider", nativeIconFile: "rider.svg", launchable: true, scansFolders: false,
    installations: Object.freeze([{ type: InstallationType.Native, desktopId: "jetbrains-rider", executable: Constants.DEFAULT_EXECUTABLE, config: Constants.DEFAULT_CONFIG_DIRECTORY }, { type: InstallationType.Snap, desktopId: "rider_rider", executable: Constants.SNAP_EXECUTABLE, config: Constants.DEFAULT_CONFIG_DIRECTORY }]),
    fields: Object.freeze([
        Object.freeze({ key: "executable", kind: "executable", label: "IDE executable path", description: "Choose the Rider launcher in its bin folder.", placeholder: "rider", chooserTitle: "Choose Rider executable", comparison: "exact" }),
        Object.freeze({ key: "config", kind: "directory", label: "IDE data folder", description: "Choose the JetBrains configuration folder or one Rider version folder.", placeholder: Constants.DEFAULT_CONFIG_DIRECTORY, chooserTitle: "Choose Rider configuration folder", comparison: "exact" })
    ]), dependents: Object.freeze({}) });
// Expose the provider declaration through its entry point.
function create() { return descriptor; }
