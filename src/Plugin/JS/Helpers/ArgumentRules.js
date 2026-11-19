// ArgumentRules.js - Validate bounded IDE switches without involving a shell.
.pragma library
.import "../Contracts/PluginError.js" as PluginError
.import "Config.js" as Config

// Check each separate command argument before it reaches a process.
function validate(argumentsList) {
    if (
        !Array.isArray(argumentsList) ||
        argumentsList.length > Config.maxAdditionalArguments ||
        argumentsList.some(function (argument) {
            return (
                typeof argument !== "string" ||
                !argument.trim() ||
                argument.length > Config.maxAdditionalArgumentLength ||
                argument.indexOf("\u0000") >= 0
            );
        })
    )
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "Check this IDE's additional arguments.",
            "Use at most " +
                Config.maxAdditionalArguments +
                " nonempty strings of up to " +
                Config.maxAdditionalArgumentLength +
                " characters.",
            "extraArguments"
        );
    return argumentsList;
}
