// ArgumentRules.js - Validate bounded IDE switches without involving a shell.
.pragma library
.import "../Contracts/PluginError.js" as PluginError
.import "Constants.js" as Constants

// Check each separate command argument before it reaches a process.
function validate(argumentsList) {
    if (
        !Array.isArray(argumentsList) ||
        argumentsList.length > Constants.maxAdditionalArguments ||
        argumentsList.some(function (argument) {
            return (
                typeof argument !== "string" ||
                !argument.trim() ||
                argument.length > Constants.maxAdditionalArgumentLength ||
                argument.indexOf("\u0000") >= 0
            );
        })
    )
        throw new PluginError.PluginError(
            PluginError.Code.PROVIDER_CONFIG,
            "Check this IDE's additional arguments.",
            "Use at most " +
                Constants.maxAdditionalArguments +
                " nonempty strings of up to " +
                Constants.maxAdditionalArgumentLength +
                " characters.",
            "extraArguments"
        );
    return argumentsList;
}
