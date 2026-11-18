// ProviderBase.js - Abstract entry point that every IDE provider exports to the plugin.
.pragma library
.import "PluginError.js" as PluginError

// Reject a provider whose entry point leaves a required method inherited.
function missing(method) {
    throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "An IDE provider is misconfigured.", "Missing " + method);
}

var ProviderBase = class ProviderBase {
    // Return the stable identifier written into saved IDE entries.
    typeId() { return missing("typeId"); }
    // Return the name shown in the IDE type list.
    name() { return missing("name"); }
    // Return the declaration of labels, placeholders, field kinds, and dependent fields.
    descriptor() { return missing("descriptor"); }
    // Return the default saved installation values.
    defaultConfiguration() { return missing("defaultConfiguration"); }
    // Build the declaration for one saved installation.
    createProperties(configuration) { return missing("createProperties"); }
    // Build the provider API used for parsing, launching, and validation.
    createApi() { return missing("createApi"); }
};

// Expose the abstract entry point for contributor checks and provider implementations.
function create() { return new ProviderBase(); }
