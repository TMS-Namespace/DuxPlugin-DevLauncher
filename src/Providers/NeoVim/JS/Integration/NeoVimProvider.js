// NeoVimProvider.js - The only JavaScript entry point the plugin uses for NeoVim.
.pragma library
.import "../../../../Plugin/JS/Contracts/ProviderBase.js" as Base
.import "../NeoVimApi.js" as NeoVimApi
.import "../NeoVimConstants.js" as Constants
.import "../NeoVimDescriptor.js" as NeoVimDescriptor
.import "../NeoVimProperties.js" as NeoVimProperties
// Rules: Entry point only: each method hands the call to a NeoVim module; no logic, QML types or logging.

// NeoVim's entry point: each method hands the call to the matching NeoVim module.
var NeoVimProvider = class NeoVimProvider extends Base.ProviderBase {
    // Return the NeoVim provider type identifier.
    typeId() {
        return Constants.PROVIDER_TYPE;
    }
    // Return the display name from the NeoVim descriptor.
    name() {
        return NeoVimDescriptor.create().name;
    }
    // Return the NeoVim descriptor declaration.
    descriptor() {
        return NeoVimDescriptor.create();
    }
    // Return the default configuration for a new NeoVim installation.
    defaultConfiguration() {
        return NeoVimProperties.defaultConfiguration();
    }
    // Build the checked NeoVim properties from a saved configuration.
    createProperties(configuration) {
        return NeoVimProperties.create(configuration);
    }
    // Create the NeoVim history and command API.
    createApi() {
        return NeoVimApi.create();
    }
};

// Create the entry point the plugin's provider registry calls.
function create() {
    return new NeoVimProvider();
}
