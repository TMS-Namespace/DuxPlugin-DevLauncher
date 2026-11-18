// RiderApi.js - Build Rider commands and normalize versioned recent-solution history.
.pragma library
// Rules: Pure history parsing and command building: throws PluginError for bad input and never runs a process; no QML types or logging.
.import "../../../Plugin/JS/Contracts/ProviderApi.js" as Base
.import "../../../Plugin/JS/Contracts/InstallationType.js" as InstallationType
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "RiderConstants.js" as Constants
.import "RiderHistory.js" as RiderHistory

// Raise a provider-specific validation error without exposing raw details in the UI.
function fail(message, details, field) { throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, message, details, field); }
// The Rider history reader and command builder for native and Snap installations.
var RiderApi = class RiderApi extends Base.ProviderApi {
    // Describe the configuration root; the reader discovers its versioned history files.
    sources(properties) { return [{ path: properties.settings.configDirectory }]; }
    // Normalize one parsed Rider history.
    parseHistory(snapshot, properties) { return RiderHistory.records(snapshot.text, snapshot.home, properties); }
    // Build the native or Snap command with separate path and switch arguments.
    launchArgs(path, properties, home) {
        if (!path || !path.startsWith("/")) fail("Choose a local file or folder.", path, "");
        return [PathRules.expand(properties.executable, home, "")].concat(properties.installationType === InstallationType.Snap ? ["run", Constants.SNAP_NAME] : [], properties.extraArguments, [path]);
    }
    // Resolve the configured launcher before checking its installation.
    validationArgs(properties, home) {
        const executable = PathRules.expand(properties.executable, home, "");
        return properties.installationType === InstallationType.Snap ? [executable, "list", Constants.SNAP_NAME] : [executable];
    }
    // Read Rider metadata without launching the graphical IDE. The shell resolves symlinks first, so a launcher reached
    // through a link (such as a Toolbox launcher in a user's bin folder) still finds its own installation's metadata.
    validationProbe(properties, executable) {
        if (properties.installationType === InstallationType.Snap) return [];
        return ["sh", "-c", 'head -c "$2" -- "$(dirname -- "$(dirname -- "$(readlink -f -- "$1")")")/product-info.json"', "sh", executable, String(Constants.MAX_HISTORY_BYTES + 1)];
    }
    // Require the configured Rider history root to exist and be readable.
    validationPaths(properties, home, configHome) {
        return [{ field: "config", label: "Rider configuration folder", path: PathRules.expand(properties.settings.configDirectory, home, configHome), kind: "directory", optional: false, unique: true }];
    }
    // Verify the installed Snap or the native product metadata.
    validateExecutable(output, properties) {
        if (properties.installationType === InstallationType.Snap) {
            if (!String(output).split("\n").some(function(line) { return line.trim().split(/\s+/)[0] === Constants.SNAP_NAME; })) fail("Choose an installed Rider Snap.", String(output), "executable");
            return true;
        }
        const name = String(properties.executable).split("/").pop();
        if (name !== "rider" && name !== "rider.sh") fail("Choose Rider's launcher in its installation bin folder.", name, "executable");
        let metadata;
        try { metadata = JSON.parse(output); } catch (error) { fail("Choose Rider's launcher in its installation bin folder.", String(error), "executable"); }
        if (!metadata || metadata.productCode !== "RD") fail("Choose Rider's launcher in its installation bin folder.", "Unexpected product metadata", "executable");
        return true;
    }
    // Reject empty or malformed arguments; metadata probes cannot verify Rider switches.
    validateArguments(output, errorOutput, properties) {
        for (const argument of properties.extraArguments) if (!argument || argument.indexOf("\u0000") >= 0) fail("Check the additional arguments.", argument, "extraArguments");
        return true;
    }
    // Confirm the provider can read at least one local recent project.
    validateHistory(records, properties) {
        if (!records.length) fail("No recent Rider projects were found. Check its configuration folder.", properties.settings.configDirectory, "config");
        return true;
    }
};
// Create the provider API.
function create() { return new RiderApi(); }
