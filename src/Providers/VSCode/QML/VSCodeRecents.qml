// VSCodeRecents.qml - Read VS Code history sources and return normalized recent items.
// Rules: One source is read at a time, each step has a watchdog, and a late answer from an earlier step is ignored. A source that cannot be read is skipped, and the previous cache is kept when no source can be read.
import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
import "../JS/VSCodeConstants.js" as Constants
import "../JS/VSCodeHistoryPayload.js" as HistoryPayload
import QtQml
import QtQuick
import Quickshell
import Quickshell.Io

QtObject {
    id: root

    property bool running: false
    property var api: null
    property var properties: null
    property var callback: null
    // The plugin's file service stat, which answers with the Dux stat result for one path.
    property var statPath: null
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
    // Counts the steps started, so an answer from an earlier step is recognised and ignored.
    property int stepId: 0
    // The file reader of the current JSON step, removed once its answer arrives.
    property var reader: null
    property HistoryDatabase database
    // Stops a read whose step never answers. It restarts for each step and stops when an answer arrives.
    property Timer watchdog
    // The template for the FileView that reads one JSON history file.
    property Component textReaderType

    // Give up on the current read because its step did not answer in time, and move on to the next source.
    // The step counter moves on, so a late answer from the abandoned step is ignored.
    function abandonRead() {
        if (!running)
            return ;

        watchdog.stop();
        stepId++;
        releaseReader();
        lastError = "IDE history read did not finish.";
        lastDetails = "Watchdog stopped a history read that produced no answer.";
        trySource();
    }

    // Ask this provider's API for its preferred sources and read one at a time.
    function read(providerApi, providerProperties, completed, statFunction) {
        if (running)
            return false;

        api = providerApi;
        properties = providerProperties;
        callback = completed;
        statPath = statFunction;
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
            if (sawEmptySnapshot)
                finish([], "", "", true);
            else
                finish([], lastError || "No recent IDE history could be read.", lastDetails, false);
            return ;
        }
        const source = sources[sourceIndex++];
        sourcePath = PathRules.expand(source.path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        sourceKey = source.key;
        if (sourcePath.endsWith(".json"))
            startStep("json");
        else
            startStep("sqliteStat");
    }

    // Start one step: a file read for a JSON source, or a stat for a database whose modification time is needed.
    function startStep(nextPhase) {
        phase = nextPhase;
        stepId++;
        watchdog.restart();
        const current = stepId;
        if (nextPhase === "json") {
            releaseReader();
            reader = textReaderType.createObject(root, {
                "owner": root,
                "step": current,
                "path": sourcePath
            });
            return ;
        }
        if (!statPath) {
            statAnswered(current, null);
            return ;
        }
        statPath(sourcePath, function(result) {
            root.statAnswered(current, result);
        });
    }

    // Destroy the JSON reader after its answer has been handled, so no late signal reaches a released object.
    function releaseReader() {
        const finished = reader;
        reader = null;
        if (finished)
            Qt.callLater(function() {
            finished.destroy();
        });

    }

    // A file read answer for the current step: the text of a JSON source, or nothing when it could not be read.
    function textAnswered(step, succeeded, text) {
        if (step !== stepId || !running)
            return ;

        watchdog.stop();
        releaseReader();
        processJson(succeeded, text);
    }

    // A stat answer for the current step. A missing or unreadable file gives no modification time.
    function statAnswered(step, result) {
        if (step !== stepId || !running)
            return ;

        watchdog.stop();
        const entry = result && !result.error ? (result.entry || result) : null;
        const modifiedAt = entry ? Number(entry.mtimeMs) || 0 : 0;
        if (phase === "sqliteStat") {
            if (entry) {
                try {
                    const value = HistoryPayload.decode(database.read(sourcePath, sourceKey), sourceKey, "sqlite");
                    if (value) {
                        finishHistory(value, modifiedAt);
                        return ;
                    }
                } catch (caughtError) {
                    lastDetails = String(caughtError);
                    lastError = caughtError.userMessage || "Could not read IDE history database.";
                }
            }
            trySource();
        } else {
            finishHistory(history, modifiedAt);
        }
    }

    // The JSON text is decoded; a decoded history is then dated by a stat of the same file.
    function processJson(succeeded, text) {
        if (succeeded) {
            try {
                history = HistoryPayload.decode(text, sourceKey, "json");
                if (history) {
                    stepId++;
                    phase = "jsonStat";
                    watchdog.restart();
                    const current = stepId;
                    if (!statPath) {
                        statAnswered(current, null);
                        return ;
                    }
                    statPath(sourcePath, function(result) {
                        root.statAnswered(current, result);
                    });
                    return ;
                }
            } catch (caughtError) {
                lastDetails = String(caughtError);
                lastError = caughtError.userMessage || "Could not parse IDE history.";
            }
        }
        trySource();
    }

    // A non-empty snapshot is the answer. An empty one may be a cleared list, but an older location may still hold history,
    // so the empty answer is kept as the fallback and the remaining locations are tried first.
    function finishHistory(value, modifiedAt) {
        try {
            const records = api.parseHistory({
                "history": value,
                "modifiedAt": modifiedAt
            }, properties);
            if (records.length > 0) {
                finish(records, "", "", true);
                return ;
            }
            sawEmptySnapshot = true;
        } catch (caughtError) {
            lastDetails = String(caughtError);
            lastError = caughtError.userMessage || "Could not parse IDE history.";
        }
        trySource();
    }

    // Release the current callback before the orchestrator starts another provider. A failed read says so, so the caller
    // keeps what it already holds; a read that succeeded or has no answer to keep passes true.
    function finish(records, message, details, succeeded) {
        const completed = callback;
        callback = null;
        running = false;
        watchdog.stop();
        releaseReader();
        completed(records, message, details || "", succeeded !== false);
    }

    watchdog: Timer {
        interval: Constants.READ_WATCHDOG_MILLISECONDS
        repeat: false
        onTriggered: root.abandonRead()
    }

    textReaderType: Component {
        FileView {
            property var owner: null
            property int step: 0

            printErrors: false
            onLoaded: owner.textAnswered(step, true, text())
            onLoadFailed: function(error) {
                owner.textAnswered(step, false, "");
            }
        }

    }

    database: HistoryDatabase {
    }

}
