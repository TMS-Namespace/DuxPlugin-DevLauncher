// VSCodeRecents.qml - Read VS Code history sources and return normalized recent items.
import "../../../JS/Helpers/PathRules.js" as PathRules
import "../../../JS/Providers/VSCode/VSCodeHistoryPayload.js" as HistoryPayload
import "../../../JS/Providers/VSCode/VSCodeReadCommands.js" as ReadCommands
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
    property string sourcePath: ""
    property string sourceKey: ""
    property string phase: ""
    property var history: null
    property string lastError: ""
    // Raw failure text for the log. It goes back through the callback, so the provider never imports plugin services.
    property string lastDetails: ""
    property HistoryDatabase database: HistoryDatabase {}

    // Ask this provider's API for its preferred sources and read one at a time.
    function read(providerApi, providerProperties, completed) {
        if (running) return false;
        api = providerApi;
        properties = providerProperties;
        callback = completed;
        sources = api.sources(properties);
        sourceIndex = 0;
        lastError = "";
        lastDetails = "";
        running = true;
        trySource();
        return true;
    }

    // Try the next provider-owned history location when one has no usable data.
    function trySource() {
        if (sourceIndex >= sources.length) {
            finish([], lastError || "No recent IDE history could be read.", lastDetails);
            return;
        }
        const source = sources[sourceIndex++];
        sourcePath = PathRules.expand(source.path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        sourceKey = source.key;
        if (sourcePath.endsWith(".json")) startProcess(ReadCommands.json(sourcePath), "json");
        else startProcess(ReadCommands.modifiedTime(sourcePath), "sqliteStat");
    }

    // Run one bounded read process and wait for stdout to drain.
    function startProcess(command, nextPhase) {
        phase = nextPhase;
        worker.outputText = "";
        worker.hasExited = false;
        worker.hasStreamed = false;
        worker.command = command;
        worker.running = true;
    }

    // Turn one usable provider snapshot into common path records.
    function finishHistory(value, modifiedAt) {
        try {
            const records = api.parseHistory({ history: value, modifiedAt: modifiedAt }, properties);
            if (records.length) {
                finish(records, "");
                return;
            }
        } catch (caughtError) {
            lastDetails = String(caughtError);
            lastError = caughtError.userMessage || "Could not parse IDE history.";
        }
        trySource();
    }

    // Interpret the answer according to this provider's selected source format.
    function processAnswer(exitCode, output) {
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

    // Release the current callback before the orchestrator starts another provider.
    function finish(records, message, details) {
        const completed = callback;
        callback = null;
        running = false;
        completed(records, message, details || "");
    }

    property Process worker: Process {
        id: historyProcess
        property string outputText: ""
        property bool hasExited: false
        property bool hasStreamed: false
        property int exitStatus: 0
        function complete() {
            if (hasExited && hasStreamed) root.processAnswer(exitStatus, outputText);
        }
        onExited: function(exitCode) { exitStatus = exitCode; hasExited = true; complete(); }
        stdout: StdioCollector {
            onStreamFinished: { historyProcess.outputText = text; historyProcess.hasStreamed = true; historyProcess.complete(); }
        }
    }
}
