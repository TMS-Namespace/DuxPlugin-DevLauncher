// ZedDescriptor.js - Declare Zed's executable and history folder settings.
.pragma library
.import "ZedConstants.js" as Constants
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
// Rules: Plain declaration data only: no logic beyond returning the frozen descriptor; no QML types or logging.
// Zed's declaration: its installations, name, icon, and the two fields the settings page shows.
var descriptor = Object.freeze({
    typeId: Constants.PROVIDER_TYPE,
    installations: Object.freeze([
        {
            type: InstallationType.Native,
            executable: Constants.NATIVE_EXECUTABLE,
            config: Constants.NATIVE_DATA_DIRECTORY
        },
        {
            type: InstallationType.Flatpak,
            executable: Constants.DEFAULT_EXECUTABLE,
            config: Constants.DEFAULT_DATA_DIRECTORY
        },
        {
            type: InstallationType.Snap,
            desktopId: "zed_zed",
            executable: Constants.SNAP_EXECUTABLE,
            config: Constants.NATIVE_DATA_DIRECTORY
        }
    ]),
    name: Constants.DEFAULT_NAME,
    iconName: "dev.zed.Zed",
    launchable: true,
    scansFolders: false,
    fields: Object.freeze([
        Object.freeze({
            key: "executable",
            kind: "executable",
            label: "IDE executable path",
            description: "Choose Zed or the Flatpak executable.",
            placeholder: Constants.DEFAULT_EXECUTABLE,
            chooserTitle: "Choose Zed executable",
            comparison: "exact"
        }),
        Object.freeze({
            key: "config",
            kind: "directory",
            label: "IDE data folder",
            description: "Stores this installation's workspace history.",
            placeholder: Constants.DEFAULT_DATA_DIRECTORY,
            chooserTitle: "Choose Zed data folder",
            comparison: "exact"
        })
    ]),
    dependents: Object.freeze({})
});
// Return Zed's declaration.
function create() {
    return descriptor;
}
