// RepositoryScanner.qml - Find local Git repositories in configured folders.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/PathRules.js" as PathRules
import "../../JS/Helpers/RepositoryRules.js" as RepositoryRules
import "../../JS/Helpers/ScanCommand.js" as ScanCommand
import "../../JS/Helpers/ScanErrorRules.js" as ScanErrorRules
import "../Services" as Services
import QtQuick
import Quickshell
import Quickshell.Io

Item {
    id: root
    property bool running: false
    property var tasks: []
    property var currentTask: null
    property var repositories: []
    property var errors: []
    property int scanDepth: Config.defaultRepositoryDepth
    signal finished(var snapshot)

    // Queue bounded repository roots without knowing any IDE history sources.
    function start(folders, depth) {
        if (running) return false;
        scanDepth = depth;
        repositories = [];
        errors = [];
        tasks = folders.slice(0, Config.maxScanFolders).map(function(folder) {
            return { path: PathRules.expand(folder, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME")) };
        });
        running = true;
        nextTask();
        return true;
    }

    // Scan one configured folder at a time and preserve partial results.
    function nextTask() {
        if (!tasks.length || repositories.length >= Config.maxRepositories) {
            // Report every configured folder that the repository cap prevented from being scanned.
            if (tasks.length) errors = errors.concat(tasks.map(function(task) {
                return { path: task.path, message: ScanErrorRules.notScanned(task.path, Config.maxRepositories) };
            }));
            tasks = [];
            running = false;
            finished({ repositories: repositories, errors: errors });
            return;
        }
        currentTask = tasks.shift();
        worker.outputText = "";
        worker.errorText = "";
        worker.hasExited = false;
        worker.hasStreamed = false;
        worker.hasErrorStreamed = false;
        worker.command = ScanCommand.repositories(currentTask.path, scanDepth);
        Services.Logger.debug("scan", "started repository process");
        worker.running = true;
    }

    // Add readable repository paths even when find reports a later error.
    function processAnswer(exitCode, output, errorText) {
        repositories = repositories.concat(RepositoryRules.fromFind(output, Config.maxRepositories - repositories.length));
        if (exitCode !== 0) {
            const message = ScanErrorRules.forFolder(currentTask.path, exitCode, errorText);
            errors = errors.concat([{ path: currentTask.path, message: message }]);
        }
        Services.Logger.debug("scan", "repository process finished with " + repositories.length + " cumulative results and exit " + exitCode);
        nextTask();
    }

    Process {
        id: worker
        property string outputText: ""
        property string errorText: ""
        property bool hasExited: false
        property bool hasStreamed: false
        property bool hasErrorStreamed: false
        property int exitStatus: 0

        // Wait for exit and both output streams before advancing the queue.
        function complete() {
            if (hasExited && hasStreamed && hasErrorStreamed) root.processAnswer(exitStatus, outputText, errorText);
        }
        onExited: function(exitCode) { exitStatus = exitCode; hasExited = true; complete(); }
        stdout: StdioCollector {
            onStreamFinished: { worker.outputText = text; worker.hasStreamed = true; worker.complete(); }
        }
        stderr: StdioCollector {
            onStreamFinished: { worker.errorText = text; worker.hasErrorStreamed = true; worker.complete(); }
        }
    }
}
