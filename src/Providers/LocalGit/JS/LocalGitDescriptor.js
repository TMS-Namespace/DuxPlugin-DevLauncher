// LocalGitDescriptor.js - Declare the one folder field and the capabilities of the local Git folder source.
.pragma library
.import "LocalGitConstants.js" as Constants
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
// Rules: Plain declaration data only: no logic beyond returning the frozen descriptor; no QML types or logging.

// A folder source cannot open items and scans folders, so the plugin offers it only as a scanned folder.
var descriptor = Object.freeze({
    typeId: Constants.PROVIDER_TYPE,
    installations: Object.freeze([{ type: InstallationType.Native, executable: Constants.EXECUTABLE }]),
    name: Constants.DEFAULT_NAME,
    launchable: false,
    scansFolders: true,
    fields: Object.freeze([
        Object.freeze({
            key: "folder",
            kind: "directory",
            label: "Scan folder",
            description: "Git repositories below this folder are listed.",
            placeholder: "/home/user/projects",
            chooserTitle: "Choose folder to scan",
            comparison: "exact"
        })
    ]),
    dependents: Object.freeze({})
});

// Return the declaration consumed by the plugin's registry and folder list.
function create() {
    return descriptor;
}
