// VSCodeRecents.qml - Read VS Code history sources and return normalized recent items.
import "../../../JS/Helpers/PathRules.js" as PathRules
import "../../../JS/Providers/VSCode/VSCodeHistoryPayload.js" as HistoryPayload
import "../../../JS/Providers/VSCode/VSCodeReadCommands.js" as ReadCommands
import "../../../JS/Providers/VSCode/VSCodeConstants.js" as Constants
import QtQuick
import QtQml
import Quickshell
import Quickshell.Io

QtObject {
    id: root
    property bool running: false
    property var api: null
    property var properties: null
    property var callback: null
    property var sources: []
    property int sourceIndex: 0
    // True when a location was readable but held no items; it is the answer if no other location has any.
    property bool sawEmptySnapshot: false
    property string sourcePath: ""
    property string sourceKey: ""
    property string phase: ""
    property var history: null
    property string lastError: ""
    // Raw failure text for the log. It goes back through the callback, so the provider never imports plugin services.
    property string lastDetails: ""
    property HistoryDatabase database: HistoryDatabase {}
    // Stops a read whose process never answers. It restarts for each process and stops when an answer arrives.
    property Timer watchdog: Timer {
        interval: Constants.READ_WATCHDOG_MILLISECONDS
        repeat: false
        onTriggered: root.abandonRead()
    }

    // Give up on the current read because its process did not answer in time, and move on to the next source.
    // A late answer from the abandoned process is ignored, because the read is no longer running.
    function abandonRead() {
        if (!running) return;
        watchdog.stop();
        lastError = "IDE history read did not finish.";
        lastDetails = "Watchdog stopped a history read that produced no answer.";
        trySource();
    }

    // Ask this provider's API for its preferred sources and read one at a time.
    function read(providerApi, providerProperties, completed) {
        if (running) return false;
        api = providerApi;
        properties = providerProperties;
        callback = completed;
        sources = api.sources(properties);
        sourceIndex = 0;
        sawEmptySnapshot = false;
        lastError = "";
        lastDetails = "";
        running = true;
        trySource();
        return true;
    }

    // Try the next provider-owned history location when one has no usable data.
    function trySource() {
        if (sourceIndex >= sources.length) {
            // Every location was tried: a readable empty list is a real answer, so the cleared history replaces the old one.
            if (sawEmptySnapshot) finish([], "", "", true);
            else finish([], lastError || "No recent IDE history could be read.", lastDetails, false);
            return;
        }
        const source = sources[sourceIndex++];
        sourcePath = PathRules.expand(source.path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        sourceKey = source.key;
        if (sourcePath.endsWith(".json")) startProcess(ReadCommands.json(sourcePath), "json");
        else startProcess(ReadCommands.modifiedTime(sourcePath), "sqliteStat");
    }

    // Run one bounded read process for this step. The previous step's process is stopped and destroyed after this call,
    // so a late answer from it cannot be mistaken for the answer of this step.
    function startProcess(command, nextPhase) {
        phase = nextPhase;
        watchdog.restart();
        const previous = worker;
        worker = workerType.createObject(root, { "command": command, "owner": root });
        worker.running = true;
        if (previous) {
            previous.running = false;
            Qt.callLater(function() { previous.destroy(); });
        }
    }

    // A non-empty snapshot is the answer. An empty one may be a cleared list, but an older location may still hold history,
    // so the empty answer is kept as the fallback and the remaining locations are tried first.
    function finishHistory(value, modifiedAt) {
        try {
            const records = api.parseHistory({ history: value, modifiedAt: modifiedAt }, properties);
            if (records.length > 0) {
                finish(records, "", "", true);
                return;
            }
            sawEmptySnapshot = true;
        } catch (caughtError) {
            lastDetails = String(caughtError);
            lastError = caughtError.userMessage || "Could not parse IDE history.";
        }
        trySource();
    }

    // Interpret the answer according to this provider's selected source format.
    function processAnswer(exitCode, output) {
        // An answer for a read that was already abandoned or finished is ignored.
        if (!running) return;
        watchdog.stop();
        if (phase === "sqliteStat") {
            if (exitCode === 0) {
                try {
                    const value = HistoryPayload.decode(database.read(sourcePath, sourceKey), sourceKey, "sqlite");
                    if (value) {
                        finishHistory(value, Number(output.trim()) * 1000);
                        return;
                    }
                } catch (caughtError) {
                    lastDetails = String(caughtError);
                    lastError = caughtError.userMessage || "Could not read IDE history database.";
                }
            }
            trySource();
        } else if (phase === "json") {
            if (exitCode === 0) {
                try {
                    history = HistoryPayload.decode(output, sourceKey, "json");
                    if (history) {
                        startProcess(ReadCommands.modifiedTime(sourcePath), "jsonStat");
                        return;
                    }
                } catch (caughtError) {
                    lastDetails = String(caughtError);
                    lastError = caughtError.userMessage || "Could not parse IDE history.";
                }
            }
            trySource();
        } else {
            const seconds = exitCode === 0 ? Number(output.trim()) : 0;
            finishHistory(history, seconds > 0 ? seconds * 1000 : 0);
        }
    }

    // Release the current callback before the orchestrator starts another provider. A failed read says so, so the caller
    // keeps what it already holds; a read that succeeded or has no answer to keep passes true.
    function finish(records, message, details, succeeded) {
        const completed = callback;
        callback = null;
        running = false;
        watchdog.stop();
        if (worker) worker.running = false;
        completed(records, message, details || "", succeeded !== false);
    }

    // Accept one step's answer only when it is the current step and both of its streams have arrived.
    function settleStep(step) {
        if (step !== worker || !running) return;
        if (!step.hasExited || !step.hasStreamed) return;
        processAnswer(step.exitStatus, step.outputText);
    }

    // The process of the current read step; each step creates one.
    property var worker: null
    property Component workerType: Component {
        Process {
            id: historyProcess
            property string outputText: ""
            property bool hasExited: false
            property bool hasStreamed: false
            property int exitStatus: 0
            // The reader that created this step; it receives the answer, and ignores it when the step is no longer current.
            property var owner: null
            onExited: function(exitCode) { exitStatus = exitCode; hasExited = true; owner.settleStep(historyProcess); }
            stdout: StdioCollector {
                onStreamFinished: { historyProcess.outputText = text; historyProcess.hasStreamed = true; historyProcess.owner.settleStep(historyProcess); }
            }
        }
    }
}
