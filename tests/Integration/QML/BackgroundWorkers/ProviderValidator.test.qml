// ProviderValidator.test.qml - Verify a provider that cannot start does not leave validation pending.
import QtQuick
import Quickshell

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
            validationPaths: function() { return [{ path: directory, kind: "directory", field: "config", label: "Data", optional: false }]; },
            validationArgs: function() { return [executable, "--version"]; },
            validateExecutable: function(output) { return output.includes("1.99.0"); },
            validateArguments: function(output, errors) { return true; },
            validateHistory: function(records) { return true; },
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

    // Exercise the real validator with an unavailable provider facade.
    function checkUnavailableProvider() {
        const component = Qt.createComponent("file://" + fixture.pluginRoot + "/src/QML/BackgroundWorkers/ProviderValidator.qml");
        if (!fixture.expect(component.status === Component.Ready, "validator could not load: " + component.errorString())) return false;
        const validator = component.createObject(null);
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
