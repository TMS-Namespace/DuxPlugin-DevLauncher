// NeoVimRecents.qml - Read NeoVim's ShaDa history in bounded steps, then check which marked paths are folders.
import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
import "../JS/NeoVimConstants.js" as Constants
import "../JS/NeoVimReadCommands.js" as ReadCommands
import QtQml
// Rules: Each external process runs alone under a timeout, the history file is size-checked before it is read, and a failed read keeps the previous cache.
import QtQuick
import Quickshell
import Quickshell.Io

// The NeoVim history reader: size check, then base64 read of the ShaDa file, then one folder check over the marked paths.
QtObject {
    id: root

    property bool running: false
    property var api: null
    property var properties: null
    property var callback: null
    // The current step: size, history, or directories.
    property string phase: ""
    // The ShaDa file path and its base64 text, kept until the directory check is parsed.
    property string sourcePath: ""
    property string historyText: ""
    // The process object of the step that is running now.
    property var worker: null
    // The template for one bounded process; every step creates a fresh instance from it.
    property Component workerType
    property Timer watchdog

    // Start the read with a size check of the ShaDa file under the configured state folder.
    function read(providerApi, providerProperties, completed) {
        if (running)
            return false;

        api = providerApi;
        properties = providerProperties;
        callback = completed;
        historyText = "";
        running = true;
        sourcePath = PathRules.expand(api.sources(properties)[0].path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        start(ReadCommands.size(sourcePath), "size");
        return true;
    }

    // Each step gets a fresh process, so a stopped worker cannot finish the next request.
    function start(command, nextPhase) {
        const previous = worker;
        phase = nextPhase;
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

    // Wait for the process exit and both streams, then move to the next step. The directory check may exit 1 when a marked
    // path no longer exists; its output is still used, because the other paths are valid.
    function settle(readProcess) {
        if (!running || readProcess !== worker || !readProcess.hasExited || !readProcess.hasStreamed || !readProcess.hasErrorStreamed)
            return ;

        watchdog.stop();
        const accepted = phase === "directories" ? readProcess.exitStatus === 0 || readProcess.exitStatus === 1 : readProcess.exitStatus === 0;
        if (!accepted) {
            finish(false, readProcess.errorText || "NeoVim history read failed.", []);
            return ;
        }
        if (phase === "size") {
            const size = Number(readProcess.outputText.trim());
            if (!(size >= 0) || size > Constants.MAX_SHADA_BYTES) {
                finish(false, "The NeoVim history file is too large to read.", []);
                return ;
            }
            start(ReadCommands.history(sourcePath), "history");
        } else if (phase === "history") {
            historyText = readProcess.outputText;
            let paths;
            try {
                paths = api.markedPaths({
                    "text": historyText
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
            start(ReadCommands.directories(paths), "directories");
        } else {
            parseAndFinish(readProcess.outputText.split("\u0000").filter(Boolean));
        }
    }

    // Parse the history with the folder list and report the result; a parse failure is a failed read.
    function parseAndFinish(folders) {
        let records;
        try {
            records = api.parseHistory({
                "text": historyText,
                "directories": folders
            }, properties);
        } catch (caughtError) {
            finish(false, String(caughtError), []);
            return ;
        }
        finish(true, "", records);
    }

    // Report once and release the current process after its signal handler completes.
    function finish(succeeded, details, records) {
        if (!running)
            return ;

        running = false;
        watchdog.stop();
        const readProcess = worker;
        worker = null;
        if (readProcess) {
            readProcess.running = false;
            Qt.callLater(function() {
                readProcess.destroy();
            });
        }
        historyText = "";
        const completed = callback;
        callback = null;
        completed(succeeded ? records : [], succeeded ? "" : "Could not read NeoVim history. Check its state folder.", details, succeeded);
    }

    workerType: Component {
        // One bounded process for a single step, which reports its output and exit back to its owner.
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
