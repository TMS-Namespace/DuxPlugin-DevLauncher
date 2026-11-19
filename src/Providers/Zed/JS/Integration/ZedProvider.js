// ZedProvider.js - The only JavaScript entry point the plugin uses for Zed.
.pragma library
.import "../../../../Plugin/JS/Contracts/ProviderBase.js" as Base
.import "../ZedApi.js" as ZedApi
.import "../ZedConstants.js" as Constants
.import "../ZedDescriptor.js" as ZedDescriptor
.import "../ZedProperties.js" as ZedProperties
// Rules: Entry point only: each method hands the call to a Zed module; no logic, QML types or logging.

// Zed's entry point: each method hands the call to the matching Zed module.
var ZedProvider = class ZedProvider extends Base.ProviderBase {
    // Return the Zed provider type identifier.
    typeId() {
        return Constants.PROVIDER_TYPE;
    }
    // Return the display name from the Zed descriptor.
    name() {
        return ZedDescriptor.create().name;
    }
    // Return the Zed descriptor declaration.
    descriptor() {
        return ZedDescriptor.create();
    }
    // Return the default configuration for a new Zed installation.
    defaultConfiguration() {
        return ZedProperties.defaultConfiguration();
    }
    // Build the checked Zed properties from a saved configuration.
    createProperties(configuration) {
        return ZedProperties.create(configuration);
    }
    // Create the Zed history and command API.
    createApi() {
        return ZedApi.create();
    }
};

// Create the entry point the plugin's provider registry calls.
function create() {
    return new ZedProvider();
}
