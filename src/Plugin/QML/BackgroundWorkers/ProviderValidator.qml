// ProviderValidator.qml - Check one draft IDE executable and its recent history asynchronously.
// Rules: Only one check runs at a time, and a finished check reports its result without saving any setting.
import "../../JS/Helpers/Constants.js" as Constants
import "../Services"
import QtQuick
import Quickshell.Io

Item {
    id: root

    property var handler: null
    property bool running: false
    // The declared folders and files to test, in the order they are checked.
    property var paths: []
    property int pathIndex: 0
    // The full path of the executable that the which command found.
    property string resolvedPath: ""
    // True while the provider's metadata file is being read; a late answer after that is ignored.
    property bool awaitingMetadata: false

    signal finished(bool accepted, string message, string field)
    signal resolvedExecutable(string path)

    // Resolve the executable before checking every provider-declared local path.
    function validate(candidate) {
        if (running)
            return false;

        handler = candidate;
        paths = handler.validationPaths();
        pathIndex = 0;
        resolvedPath = "";
        awaitingMetadata = false;
        running = true;
        executableProcess.outputText = "";
        executableProcess.hasExited = false;
        executableProcess.hasStreamed = false;
        executableProcess.command = ["timeout", Constants.providerValidationTimeout, "which", handler.validationArgs()[0]];
        executableProcess.running = true;
        return true;
    }

    // Start the check on a declared folder or file: existence and type come from the Dux file service, and
    // access rights are checked with test, which the file service does not report.
    function checkPath(flag) {
        const target = paths[pathIndex];
        if (flag === "-e") {
            FileMetadataService.statPath(target.path, function(result) {
                root.pathStatAnswered(result);
            });
            return ;
        }
        pathProcess.flag = flag;
        pathProcess.command = ["timeout", Constants.providerValidationTimeout, "test", flag, target.path];
        pathProcess.running = true;
    }

    // The file service's answer for a declared path. A missing path is skipped when optional; a path of the wrong type fails.
    function pathStatAnswered(result) {
        if (!running)
            return ;

        const target = paths[pathIndex];
        const entry = result && !result.error ? (result.entry || result) : null;
        if (!entry) {
            if (target.optional) {
                pathIndex++;
                nextPath();
                return ;
            }
            complete(false, target.label + " is missing or cannot be read: " + target.path, target.field);
            return ;
        }
        if (target.kind === "file" ? entry.isDir : !entry.isDir) {
            complete(false, target.label + " is missing or cannot be read: " + target.path, target.field);
            return ;
        }
        checkPath("-r");
    }

    // Move from checked paths to the provider-owned executable probe.
    function nextPath() {
        if (pathIndex < paths.length) {
            checkPath("-e");
            return ;
        }
        // A provider's metadata file is read as text, so no process starts for an installation that can be checked that way.
        const metadataPath = typeof handler.validationFile === "function" ? handler.validationFile(resolvedPath) : "";
        if (metadataPath) {
            awaitingMetadata = true;
            // Setting a new path starts the load itself; reload is used only for the same path, as a reload after a path change drops the load.
            if (metadataFile.path === metadataPath)
                metadataFile.reload();
            else
                metadataFile.path = metadataPath;
            return ;
        }
        versionProcess.outputText = "";
        versionProcess.errorText = "";
        versionProcess.hasExited = false;
        versionProcess.hasStreamed = false;
        versionProcess.hasErrorStreamed = false;
        const probe = typeof handler.validationProbe === "function" ? handler.validationProbe(resolvedPath) : [];
        const argumentsList = probe && probe.length ? probe.slice() : handler.validationArgs().slice();
        if (!probe || !probe.length)
            argumentsList[0] = resolvedPath;

        versionProcess.command = ["timeout", Constants.providerValidationTimeout].concat(argumentsList);
        versionProcess.running = true;
    }

    // The metadata file's answer: a file that cannot be read fails the executable check, as a failed probe does.
    function metadataAnswered(succeeded, text) {
        if (!awaitingMetadata)
            return ;

        awaitingMetadata = false;
        if (!succeeded) {
            complete(false, "The selected IDE executable could not be started.", "executable");
            return ;
        }
        acceptExecutableOutput(text, "");
    }

    // Let the provider judge the executable's answer, then check its recent history.
    function acceptExecutableOutput(output, errorOutput) {
        try {
            root.handler.validateExecutable(output);
            root.handler.validateArguments(output, errorOutput);
            root.validateRecents();
        } catch (caughtError) {
            Logger.error("validation", String(caughtError));
            root.complete(false, caughtError.userMessage || "This IDE executable is not supported.", caughtError.field || "executable");
        }
    }

    // Finish a failed or successful validation without changing saved settings.
    function complete(accepted, message, field) {
        running = false;
        finished(accepted, message, field || "");
    }

    // A busy or unavailable provider cannot complete this validation request.
    function validateRecents() {
        const started = handler.recents(function(records, message) {
            try {
                root.handler.validateHistory(records);
                if (message) {
                    root.complete(false, message, root.historyField());
                    return ;
                }
                root.complete(true, "");
            } catch (caughtError) {
                Logger.error("validation", String(caughtError));
                root.complete(false, caughtError.userMessage || "Could not read recent IDE items.", caughtError.field || root.historyField());
            }
        });
        if (!started)
            complete(false, "Could not start reading recent IDE items. Try again.", historyField());

    }

    // Associate a general history-read failure with the provider's required storage field.
    function historyField() {
        const target = paths.find(function(candidate) {
            return !candidate.optional && candidate.kind === "directory" && candidate.field;
        });
        return target ? target.field : "";
    }

    // Finds the executable path with the which command, then reports the path or a failure.
    Process {
        id: executableProcess

        property string outputText: ""
        property bool hasExited: false
        property bool hasStreamed: false
        property int exitStatus: -1

        // Wait for the resolved command path after the process has exited.
        function inspect() {
            if (!hasExited || !hasStreamed)
                return ;

            // which appends one newline; embedded newlines and trailing spaces belong to the path.
            const path = outputText.endsWith("\n") ? outputText.slice(0, -1) : outputText;
            if (exitStatus !== 0 || !path.startsWith("/")) {
                root.complete(false, "Choose an IDE executable that exists and can be run.", "executable");
                return ;
            }
            root.resolvedPath = path;
            root.resolvedExecutable(path);
            root.nextPath();
        }

        onExited: function(exitCode) {
            exitStatus = exitCode;
            hasExited = true;
            inspect();
        }

        stdout: StdioCollector {
            onStreamFinished: {
                executableProcess.outputText = text;
                executableProcess.hasStreamed = true;
                executableProcess.inspect();
            }
        }

    }

    // Runs one test on the declared path at pathIndex: exists, then file or folder, then readable, and for folders also executable.
    Process {
        id: pathProcess

        // The test flag, -r or -x, of the access check that is running.
        property string flag: ""

        // Required paths must be readable; folders must also be searchable. Existence and type were checked by the file service.
        onExited: function(exitCode) {
            const target = root.paths[root.pathIndex];
            if (exitCode !== 0) {
                root.complete(false, target.label + " is missing or cannot be read: " + target.path, target.field);
                return ;
            }
            if (flag === "-r" && target.kind === "directory") {
                root.checkPath("-x");
            } else {
                root.pathIndex++;
                root.nextPath();
            }
        }
    }

    // The provider's metadata file, read as text when the provider names one for this installation.
    FileView {
        id: metadataFile

        printErrors: false
        onLoaded: root.metadataAnswered(true, text())
        onLoadFailed: function(error) {
            root.metadataAnswered(false, "");
        }
    }

    // Runs the executable's version or probe command and checks its output and error text.
    Process {
        id: versionProcess

        property string outputText: ""
        property string errorText: ""
        property bool hasExited: false
        property bool hasStreamed: false
        property bool hasErrorStreamed: false
        property int exitStatus: -1

        // Wait until stdout and stderr have drained after process exit.
        function inspect() {
            if (!hasExited || !hasStreamed || !hasErrorStreamed)
                return ;

            if (exitStatus !== 0) {
                root.complete(false, "The selected IDE executable could not be started.", "executable");
                return ;
            }
            root.acceptExecutableOutput(outputText, errorText);
        }

        onExited: function(exitCode) {
            exitStatus = exitCode;
            hasExited = true;
            inspect();
        }

        stdout: StdioCollector {
            onStreamFinished: {
                versionProcess.outputText = text;
                versionProcess.hasStreamed = true;
                versionProcess.inspect();
            }
        }

        stderr: StdioCollector {
            onStreamFinished: {
                versionProcess.errorText = text;
                versionProcess.hasErrorStreamed = true;
                versionProcess.inspect();
            }
        }

    }

}
