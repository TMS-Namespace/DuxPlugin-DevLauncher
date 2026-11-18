// LocalGitProvider.js - The only JavaScript entry point the plugin uses for the local Git folder source.
.pragma library
.import "../../../../Plugin/JS/Contracts/ProviderBase.js" as Base
.import "../LocalGitApi.js" as LocalGitApi
.import "../LocalGitConstants.js" as Constants
.import "../LocalGitDescriptor.js" as LocalGitDescriptor
.import "../LocalGitProperties.js" as LocalGitProperties

var LocalGitProvider = class LocalGitProvider extends Base.ProviderBase {
    typeId() { return Constants.PROVIDER_TYPE; }
    name() { return LocalGitDescriptor.create().name; }
    descriptor() { return LocalGitDescriptor.create(); }
    defaultConfiguration() { return LocalGitProperties.defaultConfiguration(); }
    createProperties(configuration) { return LocalGitProperties.create(configuration); }
    createApi() { return LocalGitApi.create(); }
};

// Create the entry point the plugin's provider registry calls.
function create() { return new LocalGitProvider(); }
