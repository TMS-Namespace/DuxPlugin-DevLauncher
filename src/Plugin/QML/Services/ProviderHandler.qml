// ProviderHandler.qml - The only facade allowed to call an IDE provider's JavaScript API.
// Rules: Only this facade calls a provider's JavaScript API, and a source that is not launchable never opens items.
import "../../JS/Contracts/PluginError.js" as PluginError
import "../../JS/Helpers/ProviderValidationRules.js" as ValidationRules
import "../Contracts"
import QtQml
import Quickshell

// The facade for one configured IDE: it builds the reader on first use and forwards each call to the provider's API.
QtObject {
    id: root

    property int type: -1
    property ProviderProperties properties: null
    property var api: null
    // The component that creates this provider's reader when it is first needed.
    property Component readerType: null
    // Only launchable providers may open items; the others only read recents or validate paths.
    property bool launchable: true
    property string iconPath: ""
    // The reader instance once it exists; null until the first read asks for it.
    property var reader: null

    // Create the provider-owned reader on first use, so a facade that only declares paths starts no process or database.
    function createReader() {
        if (!reader && readerType)
            reader = readerType.createObject(root);

        return reader;
    }

    // Return normalized recents; callers never see provider source paths or payloads.
    function recents(callback) {
        const activeReader = createReader();
        // The file service is passed in, so a reader can stat a history file without importing the plugin's services.
        return activeReader && activeReader.read(api, properties, callback, FileMetadataService.statPath);
    }

    // Let the provider build all switches and arguments before executing them.
    function launch(path, kind) {
        if (!launchable)
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This source cannot open items.", "not launchable");

        Quickshell.execDetached(api.launchArgs(path, properties, Quickshell.env("HOME"), kind));
    }

    // Keep executable and history validation inside the provider boundary.
    function validationArgs() {
        return api.validationArgs(properties, Quickshell.env("HOME"));
    }

    // Use a provider's safe metadata probe when supplied; otherwise keep the usual version command.
    function validationProbe(executable) {
        return api.validationProbe(properties, executable);
    }

    // The metadata file to read instead of running the executable, or an empty string when the provider has none.
    function validationFile(executable) {
        return api.validationFile(properties, executable);
    }

    // Declared folders and files this installation must be able to read, with the provider's own limits applied.
    function validationPaths() {
        return ValidationRules.targets(api.validationPaths(properties, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME")));
    }

    // The provider decides whether the executable is the right program, from its version output.
    function validateExecutable(output) {
        return api.validateExecutable(output, properties);
    }

    // The provider decides whether the configured switches are accepted by the executable.
    function validateArguments(output, errorOutput) {
        return api.validateArguments(output, errorOutput, properties);
    }

    // The provider decides whether a read returned usable recent items.
    function validateHistory(records) {
        return api.validateHistory(records, properties);
    }

    // Expose the installation type for provider-declared presentation.
    function installationType() {
        return properties.installationType;
    }

    // Expose the provider type so the shared icon service can read its declared desktop icon.
    function providerType() {
        return properties.providerType;
    }

    // Expose the configured program so shared icon logic can find its desktop icon.
    function executable() {
        return properties.executable;
    }

}
