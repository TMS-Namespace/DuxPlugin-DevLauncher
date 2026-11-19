// MountScanner.qml - Read the current process mount table before classifying scanned paths.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/PathRules.js" as PathRules
import QtQml
import Quickshell.Io

QtObject {
    id: root

    property var callback: null
    property Process reader

    function read(completed) {
        callback = completed;
        reader.running = true;
    }

    reader: Process {
        command: ["timeout", Config.mountScanTimeout, "cat", "/proc/self/mountinfo"]
        onExited: function(exitCode) {
            if (exitCode !== 0 && root.callback) {
                const completed = root.callback;
                root.callback = null;
                completed([]);
            }
        }

        stdout: StdioCollector {
            onStreamFinished: {
                const completed = root.callback;
                root.callback = null;
                if (completed)
                    completed(PathRules.shareMounts(text));

            }
        }

    }
    // A failed mount-table read falls back to ordinary local path checks.

}
