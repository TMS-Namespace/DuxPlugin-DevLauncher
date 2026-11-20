// LocalGitRecents.qml - Run one bounded find on a scanned folder and hand its output to the provider API.
// Each read starts a new find process, and a read in progress refuses a second start. An answer is accepted only from the
// process of the current read, so a process that was stopped or replaced cannot change the next read.
import "../../../Plugin/JS/Helpers/Config.js" as Config
import "../../../Plugin/JS/Helpers/ScanErrorRules.js" as ScanErrorRules
import "../JS/FolderScanningHelper.js" as FolderScanningHelper
import "../JS/LocalGitConstants.js" as Constants
import QtQml
import QtQuick
import Quickshell.Io

QtObject {
    id: root

    property bool running: false
    property var api: null
    property var properties: null
    property var callback: null
    // The find process of the current read; each read creates one.
    property var worker: null
    property Component workerType
    // Stops a find that never answers; its message is the same timeout message a find that ran too long gets.
    property Timer watchdog

    // Start one find process for the configured folder; the answer arrives through complete().
    function read(providerApi, providerProperties, completed) {
        if (running)
            return false;

        api = providerApi;
        properties = providerProperties;
        callback = completed;
        running = true;
        const previous = worker;
        worker = workerType.createObject(root, {
            "command": FolderScanningHelper.findCommand(properties.settings.folder, properties.settings.depth),
            "owner": root
        });
        worker.running = true;
        watchdog.restart();
        // The previous process is stopped and destroyed after this call, so its late answer cannot be mistaken for this read's.
        if (previous) {
            previous.running = false;
            Qt.callLater(function() {
                previous.destroy();
            });
        }
        return true;
    }

    // Accept an answer only from the current process, once it has exited and both of its output streams have drained.
    function settleStep(step) {
        if (step !== worker || !running)
            return ;

        if (!step.hasExited || !step.hasStreamed || !step.hasErrorStreamed)
            return ;

        complete(step.exitStatus, step.outputText, step.errorText);
    }

    // The find process has exited and its output has drained: turn the output into records and at most one message.
    function complete(exitCode, output, errorOutput) {
        watchdog.stop();
        const folder = properties.settings.folder;
        const records = api.parseHistory({
            "output": output
        }, properties);
        // A find cut short by its timeout gave an incomplete answer, which must not replace what the cache holds for this folder.
        const timedOut = exitCode === 124 || exitCode === 137;
        if (exitCode !== 0)
            finish(records, ScanErrorRules.forFolder(folder, exitCode, errorOutput), errorOutput, !timedOut);
        else if (records.length >= Config.maxRepositories)
            finish(records, ScanErrorRules.limitReached(folder, Config.maxRepositories), "", true);
        else
            finish(records, "", "", true);
    }

    // Release the callback before the orchestrator moves on to the next provider.
    function finish(records, message, details, succeeded) {
        const completed = callback;
        callback = null;
        running = false;
        watchdog.stop();
        if (worker)
            worker.running = false;

        completed(records, message, details || "", succeeded !== false);
    }

    workerType: Component {
        Process {
            id: findProcess

            property string outputText: ""
            property string errorText: ""
            property bool hasExited: false
            property bool hasStreamed: false
            property bool hasErrorStreamed: false
            property int exitStatus: 0
            // The reader that created this process; it receives the answer.
            property var owner: null

            environment: Config.commandEnvironment
            onExited: function(exitCode) {
                exitStatus = exitCode;
                hasExited = true;
                owner.settleStep(findProcess);
            }

            stdout: StdioCollector {
                onStreamFinished: {
                    findProcess.outputText = text;
                    findProcess.hasStreamed = true;
                    findProcess.owner.settleStep(findProcess);
                }
            }

            stderr: StdioCollector {
                onStreamFinished: {
                    findProcess.errorText = text;
                    findProcess.hasErrorStreamed = true;
                    findProcess.owner.settleStep(findProcess);
                }
            }

        }

    }

    watchdog: Timer {
        interval: Constants.READ_WATCHDOG_MILLISECONDS
        repeat: false
        onTriggered: {
            if (!root.running)
                return ;

            root.finish([], ScanErrorRules.forFolder(root.properties.settings.folder, 124, "watchdog"), "The find process did not answer.", false);
        }
    }

}
