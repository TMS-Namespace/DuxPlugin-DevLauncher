// VSCodeValidation.js - Check that a VS Code executable answers as VS Code, its switches are accepted, and its history is usable.
.pragma library
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "VSCodeConstants.js" as Constants
// Rules: Pure checks: throws PluginError for a wrong executable, a rejected switch, or unusable history; no process, QML types or logging.

// A VS Code compatible CLI prints a version; its executable must have a known name.
function validateExecutable(output, properties) {
    if (properties.installationType === InstallationType.Flatpak) {
        if (
            !String(output)
                .trim()
                .startsWith("app/" + Constants.FLATPAK_ID + "/")
        )
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "Choose a working VS Code Flatpak installation.",
                String(output),
                "executable"
            );
        return true;
    }
    if (properties.installationType === InstallationType.Snap) {
        if (
            !String(output)
                .split("\n")
                .some(function (line) {
                    return line.trim().split(/\s+/)[0] === Constants.SNAP_NAME;
                })
        )
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "Choose a working VS Code Snap installation.",
                String(output),
                "executable"
            );
        return true;
    }
    const name = properties.executable.split("/").pop();
    const allowed = ["code", "code-insiders", "code-oss", "codium", "codium-insiders", "cursor"];
    if (allowed.indexOf(name) < 0 || !/^\d+\.\d+(?:\.\d+)?/m.test(String(output || "")))
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "Choose a VS Code compatible executable that responds to --version.",
            properties.executable,
            "executable"
        );
    return true;
}

// Reject malformed switch sequences and warnings reported by the selected CLI.
function validateArguments(output, errorOutput, properties) {
    const valueSwitches = [
        "--profile",
        "--user-data-dir",
        "--extensions-dir",
        "--locale",
        "--log",
        "--category",
        "--disable-extension",
        "--inspect-extensions",
        "--inspect-brk-extensions",
        "--sync",
        "--locate-shell-integration-path",
        "--enable-proposed-api",
        "--install-extension",
        "--uninstall-extension",
        "--add",
        "--remove",
        "--goto",
        "--add-mcp"
    ];
    const argumentsList = properties.extraArguments;
    for (let index = 0; index < argumentsList.length; index++) {
        const argument = argumentsList[index];
        if (!argument.startsWith("-"))
            throw new PluginError.PluginError(
                PluginError.Code.PROVIDER_CONFIG,
                "Additional arguments must be IDE switches or their values.",
                argument,
                "extraArguments"
            );
        if (valueSwitches.includes(argument)) {
            const value = argumentsList[++index];
            if (!value || !value.trim() || value.startsWith("-"))
                throw new PluginError.PluginError(
                    PluginError.Code.PROVIDER_CONFIG,
                    argument + " needs a value in Additional command arguments.",
                    argument,
                    "extraArguments"
                );
        }
    }
    const response = String(output || "") + "\n" + String(errorOutput || "");
    if (
        /not in the list of known options|unknown option|unrecognized option|requires a non empty value|invalid option/i.test(
            response
        )
    )
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "This IDE rejected an additional command argument. Check the switches and values.",
            response.slice(0, Constants.MAX_DIAGNOSTIC_CHARACTERS),
            "extraArguments"
        );
    return true;
}

// A configured provider is ready only when local recent items can be read.
function validateHistory(records, properties) {
    if (!records.length)
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "No recent local files or projects were found for this IDE. Check its data folder.",
            properties.settings.configDirectory,
            "config"
        );
    return true;
}
