// NeoVimRecents.qml - Read NeoVim's ShaDa history as bytes, then check which marked paths are folders.
// Rules: The history file is read by a FileView, which starts no process; its size is checked before it is parsed. Only one find process runs, under a timeout, and a failed read keeps the previous cache.
import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
import "../JS/NeoVimConstants.js" as Constants
import "../JS/NeoVimReadCommands.js" as ReadCommands
import QtQml
import QtQuick
import Quickshell
import Quickshell.Io

// The NeoVim history reader: one file read of the ShaDa file, then one folder check over the marked paths.
QtObject {
    id: root

    property bool running: false
    property var api: null
    property var properties: null
    property var callback: null
    // The current step: history (the file read) or directories (the folder check).
    property string phase: ""
    // The ShaDa file path and its bytes, kept until the folder check is parsed.
    property string sourcePath: ""
    property var historyBytes: null
    // The find process of the folder check, when one is running.
    property var worker: null
    // The template for the folder-check process; each check creates a fresh instance from it.
    property Component workerType
    property Timer watchdog
    // The ShaDa file, read as bytes when read() asks for it.
    property FileView historyFile

    // Start the read by loading the ShaDa file under the configured state folder.
    function read(providerApi, providerProperties, completed) {
        if (running)
            return false;

        api = providerApi;
        properties = providerProperties;
        callback = completed;
        running = true;
        sourcePath = PathRules.expand(api.sources(properties)[0].path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        phase = "history";
        watchdog.restart();
        // Setting a new path starts the load itself; reload is used only for the same path, as a reload after a path change drops the load.
        if (historyFile.path === sourcePath)
            historyFile.reload();
        else
            historyFile.path = sourcePath;
        return true;
    }

    // The file answer: a missing or unreadable file fails the read; otherwise the bytes are size-checked and the marked paths are checked as folders.
    function historyAnswered(succeeded) {
        if (!running || phase !== "history")
            return ;

        watchdog.stop();
        if (!succeeded) {
            finish(false, "NeoVim history file could not be read.", []);
            return ;
        }
        const buffer = historyFile.data();
        if (!buffer || buffer.byteLength > Constants.MAX_SHADA_BYTES) {
            finish(false, "The NeoVim history file is too large to read.", []);
            return ;
        }
        historyBytes = Array.from(new Uint8Array(buffer));
        let paths;
        try {
            paths = api.markedPaths({
                "bytes": historyBytes
            });
        } catch (caughtError) {
            finish(false, String(caughtError), []);
            return ;
        }
        // Without marked paths there is nothing to check, so the empty history is parsed directly.
        if (!paths.length) {
            parseAndFinish([]);
            return ;
        }
        phase = "directories";
        start(ReadCommands.directories(paths));
    }

    // Start the folder check in a fresh process, so a stopped worker cannot finish the next request.
    function start(command) {
        const previous = worker;
        worker = workerType.createObject(root, {
            "command": command,
            "owner": root
        });
        worker.running = true;
        watchdog.restart();
        if (previous) {
            previous.running = false;
            Qt.callLater(function() {
                previous.destroy();
            });
        }
    }

    // Wait for the process exit and both streams, then parse. The folder check may exit 1 when a marked path no longer
    // exists; its output is still used, because the other paths are valid.
    function settle(readProcess) {
        if (!running || phase !== "directories" || readProcess !== worker || !readProcess.hasExited || !readProcess.hasStreamed || !readProcess.hasErrorStreamed)
            return ;

        watchdog.stop();
        if (readProcess.exitStatus !== 0 && readProcess.exitStatus !== 1) {
            finish(false, readProcess.errorText || "NeoVim history read failed.", []);
            return ;
        }
        parseAndFinish(readProcess.outputText.split("\u0000").filter(Boolean));
    }

    // Parse the history with the folder list and report the result; a parse failure is a failed read.
    function parseAndFinish(folders) {
        let records;
        try {
            records = api.parseHistory({
                "bytes": historyBytes,
                "directories": folders
            }, properties);
        } catch (caughtError) {
            finish(false, String(caughtError), []);
            return ;
        }
        finish(true, "", records);
    }

    // Report once and release the file and the current process after their signal handlers complete.
    function finish(succeeded, details, records) {
        if (!running)
            return ;

        running = false;
        phase = "";
        watchdog.stop();
        const readProcess = worker;
        worker = null;
        if (readProcess) {
            readProcess.running = false;
            Qt.callLater(function() {
                readProcess.destroy();
            });
        }
        historyBytes = null;
        Qt.callLater(function() {
            if (!running)
                historyFile.path = "";

        });
        const completed = callback;
        callback = null;
        completed(succeeded ? records : [], succeeded ? "" : "Could not read NeoVim history. Check its state folder.", details, succeeded);
    }

    historyFile: FileView {
        printErrors: false
        onLoaded: root.historyAnswered(true)
        onLoadFailed: function(error) {
            root.historyAnswered(false);
        }
    }

    workerType: Component {
        // One bounded process for the folder check, which reports its output and exit back to its owner.
        Process {
            id: readProcess

            property var owner: null
            property string outputText: ""
            property string errorText: ""
            property bool hasExited: false
            property bool hasStreamed: false
            property bool hasErrorStreamed: false
            property int exitStatus: -1

            onExited: function(exitCode) {
                exitStatus = exitCode;
                hasExited = true;
                owner.settle(readProcess);
            }

            stdout: StdioCollector {
                onStreamFinished: {
                    readProcess.outputText = text;
                    readProcess.hasStreamed = true;
                    readProcess.owner.settle(readProcess);
                }
            }

            stderr: StdioCollector {
                onStreamFinished: {
                    readProcess.errorText = text;
                    readProcess.hasErrorStreamed = true;
                    readProcess.owner.settle(readProcess);
                }
            }

        }

    }

    // Ends the read with a timeout failure when no step finishes within the watchdog interval.
    watchdog: Timer {
        interval: Constants.READ_WATCHDOG_MILLISECONDS
        repeat: false
        onTriggered: root.finish(false, "NeoVim history read timed out.", [])
    }

}
