// RiderRecents.qml - Discover versioned Rider history files with one find, then read each one as text.
// Rules: The find runs alone under a timeout; each history file is read by a FileView, and one unusable file is reported without discarding the others.
import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
import "../JS/RiderConstants.js" as Constants
import "../JS/RiderHistory.js" as RiderHistory
import QtQml
import QtQuick
import Quickshell
import Quickshell.Io

// The Rider history reader: it finds recentSolutions.xml files, then reads each one as text.
QtObject {
    id: root

    property bool running: false
    property var api: null
    property var properties: null
    property var callback: null
    // The history files still waiting to be read.
    property var files: []
    // The normalized records merged from every file read so far.
    property var records: []
    // How many history files were read and parsed, and the problem text of each file that could not be used.
    property int parsedFiles: 0
    property var problems: []
    // The current step: find for the file search, or history for one file read.
    property string phase: ""
    // The find process, when one is running.
    property var worker: null
    // The template for the find process; each search creates a fresh instance from it.
    property Component workerType
    property Timer watchdog
    // The history file currently being read.
    property FileView historyFile

    // Start one bounded find under the configured Rider root for recentSolutions.xml files, up to the configured depth.
    function read(providerApi, providerProperties, completed) {
        if (running)
            return false;

        api = providerApi;
        properties = providerProperties;
        callback = completed;
        files = [];
        records = [];
        parsedFiles = 0;
        problems = [];
        running = true;
        const rootPath = PathRules.expand(api.sources(properties)[0].path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        phase = "find";
        start(["timeout", Constants.READ_TIMEOUT, "find", rootPath, "-maxdepth", String(Constants.CONFIG_SCAN_DEPTH), "-type", "f", "-name", "recentSolutions.xml", "-print0"]);
        return true;
    }

    // Each search gets a fresh process, so a stopped worker cannot finish the next request.
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

    // Wait for the find's exit and both streams. The file list must be usable; each history file is then read on its own.
    function settle(readProcess) {
        if (!running || phase !== "find" || readProcess !== worker || !readProcess.hasExited || !readProcess.hasStreamed || !readProcess.hasErrorStreamed)
            return ;

        watchdog.stop();
        if (readProcess.exitStatus !== 0) {
            finish(false, readProcess.errorText || "Rider history read failed.");
            return ;
        }
        files = readProcess.outputText.split("\u0000").filter(Boolean);
        if (!files.length || files.length > Constants.MAX_HISTORY_FILES) {
            finish(false, "No usable Rider history files were found.");
            return ;
        }
        readNext();
    }

    // Read the next history file, or report when none is left. The read succeeds when at least one file was parsed.
    function readNext() {
        if (!files.length) {
            finish(parsedFiles > 0 || !problems.length, problems.join("\n"));
            return ;
        }
        const path = files[0];
        files = files.slice(1);
        phase = "history";
        watchdog.restart();
        loadFile(path);
    }

    // Start loading one file. Setting a new path starts the load itself, so reload is used only for the same path:
    // a reload right after a path change would drop the load that is already running.
    function loadFile(path) {
        if (historyFile.path === path)
            historyFile.reload();
        else
            historyFile.path = path;
    }

    // The answer for one history file: a file that cannot be read, or is too large, is reported and skipped.
    function historyAnswered(succeeded, text) {
        if (!running || phase !== "history")
            return ;

        watchdog.stop();
        if (!succeeded) {
            problems = problems.concat(["A Rider history file could not be read."]);
        } else if (text.length > Constants.MAX_HISTORY_BYTES) {
            problems = problems.concat(["A Rider history file is too large to read."]);
        } else {
            try {
                records = records.concat(api.parseHistory({
                    "text": text,
                    "home": Quickshell.env("HOME")
                }, properties));
                parsedFiles++;
            } catch (caughtError) {
                problems = problems.concat([String(caughtError)]);
            }
        }
        // The next file is loaded after this answer's handler returns, because a load started inside the handler is dropped.
        Qt.callLater(root.readNext);
    }

    // Report once and release the current process and file after their signal handlers complete.
    function finish(succeeded, details) {
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
        Qt.callLater(function() {
            if (!running)
                historyFile.path = "";

        });
        const completed = callback;
        callback = null;
        completed(succeeded ? RiderHistory.merge(records) : [], succeeded ? "" : "Could not read Rider history. Check its configuration folder.", details, succeeded);
    }

    historyFile: FileView {
        printErrors: false
        onLoaded: root.historyAnswered(true, text())
        onLoadFailed: function(error) {
            root.historyAnswered(false, "");
        }
    }

    workerType: Component {
        // One bounded process for the file search, which reports its output and exit back to its owner.
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
        onTriggered: root.finish(false, "Rider history read timed out.")
    }

}
