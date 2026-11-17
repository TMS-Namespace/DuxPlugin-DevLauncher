// ProviderProperties.js - Plain declaration fields shared by IDE integrations.
.pragma library
var ProviderProperties = class ProviderProperties {
    // Give each configured installation its own values and argument array.
    constructor(values) {
        this.providerType = "";
        this.providerId = "";
        this.name = "";
        this.executable = "";
        this.extraArguments = [];
        this.settings = {};
        Object.assign(this, values || {});
    }
};

// Expose the empty declaration to contributor checks.
function create() { return new ProviderProperties(); }
