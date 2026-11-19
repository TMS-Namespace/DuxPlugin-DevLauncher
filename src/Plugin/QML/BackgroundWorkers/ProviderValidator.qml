// ProviderValidator.qml - Check one draft IDE executable and its recent history asynchronously.
// Rules: Only one check runs at a time, and a finished check reports its result without saving any setting.
import "../../JS/Helpers/Config.js" as Config
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
        running = true;
        executableProcess.outputText = "";
        executableProcess.hasExited = false;
        executableProcess.hasStreamed = false;
        executableProcess.command = ["timeout", Config.providerValidationTimeout, "which", handler.validationArgs()[0]];
        executableProcess.running = true;
        return true;
    }

    // Start one accessibility check on a declared folder or file.
    function checkPath(flag) {
        const target = paths[pathIndex];
        pathProcess.flag = flag;
        pathProcess.command = ["timeout", Config.providerValidationTimeout, "test", flag, target.path];
        pathProcess.running = true;
    }

    // Move from checked paths to the provider-owned executable probe.
    function nextPath() {
        if (pathIndex < paths.length) {
            checkPath("-e");
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

        versionProcess.command = ["timeout", Config.providerValidationTimeout].concat(argumentsList);
        versionProcess.running = true;
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

        // The test flag, such as -e or -r, of the path check that is running.
        property string flag: ""

        // Required paths must exist and be readable; optional paths are checked when present.
        onExited: function(exitCode) {
            const target = root.paths[root.pathIndex];
            if (flag === "-e" && exitCode !== 0 && target.optional) {
                root.pathIndex++;
                root.nextPath();
                return ;
            }
            if (exitCode !== 0) {
                root.complete(false, target.label + " is missing or cannot be read: " + target.path, target.field);
                return ;
            }
            if (flag === "-e") {
                root.checkPath(target.kind === "file" ? "-f" : "-d");
            } else if (flag === "-d" || flag === "-f") {
                root.checkPath("-r");
            } else if (flag === "-r" && target.kind === "directory") {
                root.checkPath("-x");
            } else {
                root.pathIndex++;
                root.nextPath();
            }
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
            try {
                root.handler.validateExecutable(outputText);
                root.handler.validateArguments(outputText, errorText);
                root.validateRecents();
            } catch (caughtError) {
                Logger.error("validation", String(caughtError));
                root.complete(false, caughtError.userMessage || "This IDE executable is not supported.", caughtError.field || "executable");
            }
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
