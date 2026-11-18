// RiderRecents.qml - Discover versioned Rider history files and read them with bounded processes.
// Rules: Each external process runs alone under a timeout, and one unusable history file is reported without discarding the others.
import QtQuick
import QtQml
import Quickshell
import Quickshell.Io
import "../../../JS/Helpers/PathRules.js" as PathRules
import "../../../JS/Providers/Rider/RiderConstants.js" as Constants
import "../../../JS/Providers/Rider/RiderHistory.js" as RiderHistory

// The Rider history reader: it finds recentSolutions.xml files, then reads each one in its own bounded process.
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
    // The process object of the step that is running now.
    property var worker: null
    // The template for one bounded process; every step creates a fresh instance from it.
    property Component workerType: Component {
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
            onExited: function(exitCode) { exitStatus = exitCode; hasExited = true; owner.settle(readProcess); }
            stdout: StdioCollector { onStreamFinished: { readProcess.outputText = text; readProcess.hasStreamed = true; readProcess.owner.settle(readProcess); } }
            stderr: StdioCollector { onStreamFinished: { readProcess.errorText = text; readProcess.hasErrorStreamed = true; readProcess.owner.settle(readProcess); } }
        }
    }
    // Ends the read with a timeout failure when no step finishes within the watchdog interval.
    property Timer watchdog: Timer {
        interval: Constants.READ_WATCHDOG_MILLISECONDS
        repeat: false
        onTriggered: root.finish(false, "Rider history read timed out.")
    }

    // Start one bounded find under the configured Rider root for recentSolutions.xml files, up to the configured depth.
    function read(providerApi, providerProperties, completed) {
        if (running) return false;
        api = providerApi; properties = providerProperties; callback = completed;
        files = []; records = []; parsedFiles = 0; problems = []; running = true;
        const rootPath = PathRules.expand(api.sources(properties)[0].path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        start(["timeout", Constants.READ_TIMEOUT, "find", rootPath, "-maxdepth", String(Constants.CONFIG_SCAN_DEPTH), "-type", "f", "-name", "recentSolutions.xml", "-print0"], "find");
        return true;
    }

    // Each step gets a fresh process, so a stopped worker cannot finish the next request.
    function start(command, nextPhase) {
        const previous = worker;
        phase = nextPhase;
        worker = workerType.createObject(root, { command: command, owner: root });
        worker.running = true;
        watchdog.restart();
        if (previous) { previous.running = false; Qt.callLater(function() { previous.destroy(); }); }
    }

    // Wait for process exit and both streams. The file list must be usable; each history file is handled on its own,
    // so one version folder that cannot be read is reported and skipped while the other versions still contribute.
    function settle(readProcess) {
        if (!running || readProcess !== worker || !readProcess.hasExited || !readProcess.hasStreamed || !readProcess.hasErrorStreamed) return;
        watchdog.stop();
        if (phase === "find") {
            if (readProcess.exitStatus !== 0) { finish(false, readProcess.errorText || "Rider history read failed."); return; }
            files = readProcess.outputText.split("\u0000").filter(Boolean);
            if (!files.length || files.length > Constants.MAX_HISTORY_FILES) { finish(false, "No usable Rider history files were found."); return; }
        } else if (readProcess.exitStatus !== 0) {
            problems = problems.concat([readProcess.errorText || "A Rider history file could not be read."]);
        } else {
            try {
                records = records.concat(api.parseHistory({ text: readProcess.outputText, home: Quickshell.env("HOME") }, properties));
                parsedFiles++;
            } catch (caughtError) {
                problems = problems.concat([String(caughtError)]);
            }
        }
        if (!files.length) {
            // The read succeeds when at least one history file was read; it fails only when none could be used.
            finish(parsedFiles > 0 || !problems.length, problems.join("\n"));
            return;
        }
        const path = files[0];
        files = files.slice(1);
        start(["timeout", Constants.READ_TIMEOUT, "head", "-c", String(Constants.MAX_HISTORY_BYTES + 1), "--", path], "history");
    }

    // Report once and release the current process after its signal handler completes.
    function finish(succeeded, details) {
        if (!running) return;
        running = false;
        watchdog.stop();
        const readProcess = worker;
        worker = null;
        if (readProcess) { readProcess.running = false; Qt.callLater(function() { readProcess.destroy(); }); }
        const completed = callback;
        callback = null;
        completed(succeeded ? RiderHistory.merge(records) : [], succeeded ? "" : "Could not read Rider history. Check its configuration folder.", details, succeeded);
    }
}
