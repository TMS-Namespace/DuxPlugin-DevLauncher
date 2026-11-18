// RiderProvider.js - The only JavaScript entry point the plugin uses for Rider.
.pragma library
// Rules: Entry point only: each method hands the call to a Rider module; no logic, QML types or logging.
.import "../../../../Plugin/JS/Contracts/ProviderBase.js" as Base
.import "../RiderApi.js" as RiderApi
.import "../RiderConstants.js" as Constants
.import "../RiderDescriptor.js" as RiderDescriptor
.import "../RiderProperties.js" as RiderProperties

// Rider's entry point: each method hands the call to the matching Rider module.
var RiderProvider = class RiderProvider extends Base.ProviderBase {
    // Return the Rider provider type identifier.
    typeId() { return Constants.PROVIDER_TYPE; }
    // Return the display name from the Rider descriptor.
    name() { return RiderDescriptor.create().name; }
    // Return the Rider descriptor declaration.
    descriptor() { return RiderDescriptor.create(); }
    // Return the default configuration for a new Rider installation.
    defaultConfiguration() { return RiderProperties.defaultConfiguration(); }
    // Build the checked Rider properties from a saved configuration.
    createProperties(configuration) { return RiderProperties.create(configuration); }
    // Create the Rider history and command API.
    createApi() { return RiderApi.create(); }
};

// Create the entry point the plugin's provider registry calls.
function create() { return new RiderProvider(); }
