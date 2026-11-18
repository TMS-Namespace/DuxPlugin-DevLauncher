// ProviderValidator.test.qml - Verify a provider that cannot start does not leave validation pending.
// Rules: Runs in the offscreen shell with real validators and fixtures; a provider that cannot start must finish validation with a failure, never stay pending.
import QtQuick
import Quickshell
import "../../../../src/QML/Services" as Services

QtObject {
    id: checks
    required property var fixture

    property var activeValidator: null

    // Native processes must preserve Unicode, controls, quotes, and trailing spaces through resolution and checks.
    function startPathCheck(next) {
        const directory = Quickshell.env("DEV_LAUNCHER_UNICODE_ROOT");
        const executable = directory + "/code";
        const component = Qt.createComponent("file://" + fixture.pluginRoot + "/src/QML/BackgroundWorkers/ProviderValidator.qml");
        activeValidator = component.createObject(null);
        const handler = {
            // Stub: reports the Unicode directory as the only required validation path.
            validationPaths: function() { return [{ path: directory, kind: "directory", field: "config", label: "Data", optional: false }]; },
            // Stub: asks the validator to run the Unicode executable with --version.
            validationArgs: function() { return [executable, "--version"]; },
            // Stub: accepts the executable only when its output reports version 1.99.0.
            validateExecutable: function(output) { return output.includes("1.99.0"); },
            // Stub: accepts any arguments output.
            validateArguments: function(output, errors) { return true; },
            // Stub: accepts any history records.
            validateHistory: function(records) { return true; },
            // Stub: reports an empty history immediately and returns true.
            recents: function(callback) { callback([], ""); return true; }
        };
        activeValidator.finished.connect(function(accepted, message) {
            if (!checks.fixture.expect(accepted && checks.activeValidator.resolvedPath === executable,
                "Unicode executable or data folder validation failed: " + message)) return;
            checks.activeValidator.destroy();
            checks.activeValidator = null;
            next();
        });
        activeValidator.validate(handler);
    }

    // Validate and launch each real provider facade against an isolated Snap executable and history fixture.
    function startSnapCheck(type, next) {
        const provider = Services.ProvidersManager.candidate({ id: type === "vscode" ? fixture.firstIdentifier : fixture.secondIdentifier,
            type: type, name: "Snap IDE", installationType: "snap", executable: Quickshell.env("DEV_LAUNCHER_SNAP_PATH"),
            config: fixture.fixtureRoot + (type === "vscode" ? "/Code" : "/Zed"), shared: "", extraArguments: [] });
        const component = Qt.createComponent("file://" + fixture.pluginRoot + "/src/QML/BackgroundWorkers/ProviderValidator.qml");
        const validator = component.createObject(null);
        validator.finished.connect(function(accepted, message) {
            if (!checks.fixture.expect(accepted, "Snap " + type + " validation failed: " + message)) return;
            provider.launch(type === "vscode" ? "/tmp/snap-code-item" : "/tmp/snap-zed-item");
            validator.destroy();
            provider.properties.destroy();
            provider.destroy();
            next();
        });
        validator.validate(provider);
    }

    // Rider validates installation metadata without opening the IDE, then reads the versioned history.
    function startRiderCheck(installationType, next) {
        const executable = installationType === "snap" ? Quickshell.env("DEV_LAUNCHER_SNAP_PATH") : Quickshell.env("DEV_LAUNCHER_RIDER_PATH");
        const provider = Services.ProvidersManager.candidate({ id: fixture.thirdIdentifier, type: "rider", name: "Rider", installationType: installationType,
            executable: executable, config: fixture.fixtureRoot + "/RiderConfigs", extraArguments: [] });
        const component = Qt.createComponent("file://" + fixture.pluginRoot + "/src/QML/BackgroundWorkers/ProviderValidator.qml");
        const validator = component.createObject(null);
        validator.finished.connect(function(accepted, message) {
            if (!checks.fixture.expect(accepted && validator.resolvedPath === executable, "Rider " + installationType + " validation failed: " + message)) return;
            if (installationType === "snap") provider.launch("/tmp/snap-rider-item");
            validator.destroy();
            provider.properties.destroy();
            provider.destroy();
            next();
        });
        validator.validate(provider);
    }

    // Exercise the real validator with an unavailable provider facade.
    function checkUnavailableProvider() {
        const component = Qt.createComponent("file://" + fixture.pluginRoot + "/src/QML/BackgroundWorkers/ProviderValidator.qml");
        if (!fixture.expect(component.status === Component.Ready, "validator could not load: " + component.errorString())) return false;
        const validator = component.createObject(null);
        // Stub: reports that the provider could not start, so validation must end with a failure.
        validator.handler = { recents: function(callback) { return false; } };
        validator.running = true;
        let response = null;
        validator.finished.connect(function(accepted, message) { response = { accepted: accepted, message: message }; });
        validator.validateRecents();
        const passed = fixture.expect(!validator.running && response && !response.accepted && response.message.includes("Could not start"), "unavailable provider left validation pending");
        validator.destroy();
        return passed;
    }
}
