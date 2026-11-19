// ProviderApi.js - Pure interface for IDE history sources, parsing, and launch arguments.
.pragma library
.import "PluginError.js" as PluginError
// Rules: Abstract base only: each required method throws a missing-method PluginError until a provider overrides it; no I/O, QML types or logging.

// Reject a provider that leaves a required method inherited.
function missing(method) {
    throw new PluginError.PluginError(
        PluginError.Code.PROVIDER_CONFIG,
        "An IDE provider is misconfigured.",
        "Missing " + method
    );
}

// The abstract history provider API: every required method throws until a provider overrides it.
var ProviderApi = class ProviderApi {
    // Describe provider-owned read-only local history sources in preference order.
    sources(properties) {
        return missing("sources");
    }
    // Normalize raw history into local path, kind, provider, order, and opening-date records.
    parseHistory(snapshot, properties) {
        return missing("parseHistory");
    }
    // Build separate process arguments, including provider-owned switches.
    launchArgs(path, properties, home) {
        return missing("launchArgs");
    }
    // Build a read-only command that identifies the selected executable.
    validationArgs(properties, home) {
        return missing("validationArgs");
    }
    // An optional non-launching probe may inspect installation metadata instead of running an IDE.
    validationProbe(properties, executable) {
        return [];
    }
    // Declare local folders and files that must be accessible before this provider is saved.
    validationPaths(properties, home, configHome) {
        return missing("validationPaths");
    }
    // Check the executable's answer before reading its history.
    validateExecutable(output, properties) {
        return missing("validateExecutable");
    }
    // Check configured switches against the executable probe's output.
    validateArguments(output, errorOutput, properties) {
        return missing("validateArguments");
    }
    // Check that a provider read returned usable local recent paths.
    validateHistory(records, properties) {
        return missing("validateHistory");
    }
};

// Expose the abstract contract for contributor checks and provider implementations.
function create() {
    return new ProviderApi();
}
