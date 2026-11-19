// FileMetadataStub.qml - Answer the file metadata requests of the launcher harness with deterministic stat results.
import QtQuick

QtObject {
    id: fileMetadata

    property bool connected: true
    property int requests: 0
    property double modifiedAt: Date.now() - 2 * 3600000

    function stat(path, callback) {
        requests++;
        Qt.callLater(function() {
            if (path.endsWith("missing-project.js")) {
                callback({
                    "error": "No such file or directory",
                    "code": "ENOENT"
                });
                return ;
            }
            callback({
                "entry": {
                    "iconName": path.endsWith(".code-workspace") ? "missing-workspace-icon" : path.endsWith(".js") ? "text-x-javascript" : path.endsWith(".yaml") ? "text-x-yaml" : "folder-special",
                    "mtimeMs": path.endsWith("old-project.js") ? Date.now() - 2 * 365 * 86400000 : modifiedAt
                }
            });
        });
    }

}
