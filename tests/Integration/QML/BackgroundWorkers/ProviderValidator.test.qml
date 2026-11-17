// ProviderValidator.test.qml - Verify a provider that cannot start does not leave validation pending.
import QtQuick
import Quickshell

QtObject {
    required property var fixture

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
