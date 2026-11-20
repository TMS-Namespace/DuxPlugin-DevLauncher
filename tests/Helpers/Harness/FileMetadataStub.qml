// FileMetadataStub.qml - Answer the file metadata requests of the launcher harness the way Dux does: a real path is found, a missing one reports ENOENT, and a folder is a folder.
import QtQuick
import Quickshell.Io

QtObject {
    id: fileMetadata

    property bool connected: true
    property int requests: 0
    property double modifiedAt: Date.now() - 2 * 3600000
    // Probes whether one path exists: a FileView loads a file, reports a folder as error 4, and a missing path as error 2.
    property Component probeType

    function stat(path, callback) {
        requests++;
        probeType.createObject(fileMetadata, {
            "owner": fileMetadata,
            "answer": callback,
            "path": path
        });
    }

    // Answer one probe with the Dux stat shape, then destroy the probe once its answer has been delivered.
    function answerProbe(probe, kind) {
        const callback = probe.answer;
        const path = probe.path;
        probe.destroy();
        if (kind === "missing") {
            Qt.callLater(function() {
                callback({
                    "error": "No such file or directory",
                    "code": "ENOENT"
                });
            });
            return ;
        }
        Qt.callLater(function() {
            callback({
                "entry": {
                    "isDir": kind === "directory",
                    "iconName": path.endsWith(".code-workspace") ? "missing-workspace-icon" : path.endsWith(".js") ? "text-x-javascript" : path.endsWith(".yaml") ? "text-x-yaml" : "folder-special",
                    "mtimeMs": path.endsWith("old-project.js") ? Date.now() - 2 * 365 * 86400000 : modifiedAt
                }
            });
        });
    }

    probeType: Component {
        FileView {
            id: probe

            property var owner: null
            property var answer: null

            printErrors: false
            onLoaded: owner.answerProbe(this, "file")
            // Dux stat reports an existing file even when it cannot be read, so only a missing path or a folder is answered differently.
            onLoadFailed: function(error) {
                owner.answerProbe(this, error === 4 ? "directory" : error === 2 ? "missing" : "file");
            }
        }

    }

}
