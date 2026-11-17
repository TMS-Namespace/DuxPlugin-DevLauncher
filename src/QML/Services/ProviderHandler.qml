// ProviderHandler.qml - The only facade allowed to call an IDE provider's JavaScript API.
import "../Contracts"
import QtQml
import Quickshell
import "../../JS/Helpers/ProviderValidationRules.js" as ValidationRules

QtObject {
    id: root
    property int type: -1
    property ProviderProperties properties: null
    property var api: null
    property Component readerType: null
    property var reader: null

    // Create the provider-owned reader on first use, so a facade that only declares paths starts no process or database.
    function createReader() {
        if (!reader && readerType) reader = readerType.createObject(root);
        return reader;
    }

    // Return normalized recents; callers never see provider source paths or payloads.
    function recents(callback) {
        const activeReader = createReader();
        return activeReader && activeReader.read(api, properties, callback);
    }

    // Let the provider build all switches and arguments before executing them.
    function launch(path) {
        Quickshell.execDetached(api.launchArgs(path, properties, Quickshell.env("HOME")));
    }

    // Keep executable and history validation inside the provider boundary.
    function validationArgs() { return api.validationArgs(properties, Quickshell.env("HOME")); }
    function validationPaths() { return ValidationRules.targets(api.validationPaths(properties, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"))); }
    function validateExecutable(output) { return api.validateExecutable(output, properties); }
    function validateArguments(output, errorOutput) { return api.validateArguments(output, errorOutput, properties); }
    function validateHistory(records) { return api.validateHistory(records, properties); }

    // Expose the configured program so shared icon logic can find its desktop icon.
    function executable() { return properties.executable; }

}
