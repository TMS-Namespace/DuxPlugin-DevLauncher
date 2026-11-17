// VSCodeProvider.js - The only JavaScript entry point the plugin uses for VS Code; it exposes the abstract base class.
.pragma library
.import "../../../Contracts/ProviderBase.js" as Base
.import "../VSCodeApi.js" as VSCodeApi
.import "../VSCodeConstants.js" as Constants
.import "../VSCodeDescriptor.js" as VSCodeDescriptor
.import "../VSCodeProperties.js" as VSCodeProperties

var VSCodeProvider = class VSCodeProvider extends Base.ProviderBase {
    typeId() { return Constants.PROVIDER_TYPE; }
    name() { return VSCodeDescriptor.create().name; }
    descriptor() { return VSCodeDescriptor.create(); }
    defaultConfiguration() { return VSCodeProperties.defaultConfiguration(); }
    createProperties(configuration) { return VSCodeProperties.create(configuration); }
    createApi() { return VSCodeApi.create(); }
};

// Create the entry point the plugin's provider registry calls.
function create() { return new VSCodeProvider(); }
