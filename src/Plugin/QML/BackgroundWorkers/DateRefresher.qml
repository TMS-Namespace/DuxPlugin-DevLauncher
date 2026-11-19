// DateRefresher.qml - Read the modification times of many paths in batches, one stat process at a time, and report once.
// Only explicit absence errors remove paths; unreadable paths and failed commands keep their cached entries.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/StatBatchRules.js" as StatBatchRules
import QtQml
import QtQuick
import Quickshell.Io

QtObject {
    id: root

    property bool running: false
    property var pendingBatches: []
    property var currentBatch: []
    property var missingPaths: []
    property var modifiedByPath: ({
    })
    property var callback: null
    // The stat process of the current batch; each batch creates one, so a late answer from a stopped batch is ignored.
    property var worker: null
    property Component workerType
    // Stops a batch that never answers, so the refresh cannot stall; that batch is treated as timed out.
    property Timer watchdog

    // Start one refresh over the given paths; the callback receives the modification times and the paths that did not answer.
    function refresh(paths, completed) {
        if (running)
            return false;

        pendingBatches = StatBatchRules.batches(paths.slice(), Config.statBatchSize);
        missingPaths = [];
        modifiedByPath = ({
        });
        callback = completed;
        running = true;
        nextBatch();
        return true;
    }

    // Start the next batch, or report when none is left.
    function nextBatch() {
        if (!pendingBatches.length) {
            finish();
            return ;
        }
        currentBatch = pendingBatches[0];
        pendingBatches = pendingBatches.slice(1);
        const previous = worker;
        worker = workerType.createObject(root, {
            "command": StatBatchRules.command(currentBatch),
            "owner": root
        });
        worker.running = true;
        watchdog.restart();
        if (previous)
            stopProcess(previous);

    }

    // Stop a process that is no longer wanted, and destroy it after the current signal has finished.
    function stopProcess(process) {
        process.running = false;
        Qt.callLater(function() {
            process.destroy();
        });
    }

    // Once the batch's process has exited and its output has drained, store its answers and move on.
    function settleBatch(batch) {
        if (batch !== worker || !running || !batch.exited || !batch.streamed || !batch.errorStreamed)
            return ;

        finishBatch(batch.exitStatus, batch.outputText, batch.errorText);
    }

    // Store timestamps and only those absent paths that the finished command explicitly identified.
    function finishBatch(exitCode, output, errorOutput) {
        watchdog.stop();
        const modified = StatBatchRules.parse(output);
        // Merged in place: copying the whole map for every batch would make a refresh grow with the square of its paths.
        Object.assign(modifiedByPath, modified);
        for (const path of StatBatchRules.missingPaths(currentBatch, modified, errorOutput, exitCode)) missingPaths.push(path)
        nextBatch();
    }

    // Report every answer together, with the answered paths that did not return a time.
    function finish() {
        const missing = missingPaths;
        const completed = callback;
        const last = worker;
        worker = null;
        callback = null;
        running = false;
        if (last)
            stopProcess(last);

        completed(modifiedByPath, missing);
    }

    workerType: Component {
        Process {
            id: batchProcess

            property string outputText: ""
            property string errorText: ""
            property bool exited: false
            property bool streamed: false
            property bool errorStreamed: false
            property int exitStatus: 0
            // The refresher that created this batch; it receives the answer, and ignores it when the batch is no longer current.
            property var owner: null

            onExited: function(exitCode) {
                exitStatus = exitCode;
                exited = true;
                owner.settleBatch(batchProcess);
            }

            stdout: StdioCollector {
                onStreamFinished: {
                    batchProcess.outputText = text;
                    batchProcess.streamed = true;
                    batchProcess.owner.settleBatch(batchProcess);
                }
            }

            stderr: StdioCollector {
                onStreamFinished: {
                    batchProcess.errorText = text;
                    batchProcess.errorStreamed = true;
                    batchProcess.owner.settleBatch(batchProcess);
                }
            }

        }

    }

    watchdog: Timer {
        interval: Config.statBatchWatchdogMilliseconds
        repeat: false
        onTriggered: {
            if (!root.running)
                return ;

            root.finishBatch(124, "", "");
        }
    }

}
