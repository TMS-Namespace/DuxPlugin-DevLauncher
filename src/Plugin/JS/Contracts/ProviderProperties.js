// ProviderProperties.js - Plain declaration fields shared by IDE integrations.
.pragma library
// Rules: Plain declaration data: no validation, I/O, QML types or logging; each provider checks its own values.
// The plain declaration fields of one IDE installation; no validation happens here.
var ProviderProperties = class ProviderProperties {
    // Give each configured installation its own values and argument array.
    constructor(values) {
        this.providerType = "";
        this.providerId = "";
        this.installationType = "";
        this.name = "";
        this.executable = "";
        this.extraArguments = [];
        this.settings = {};
        Object.assign(this, values || {});
    }
};

// Expose the empty declaration to contributor checks.
function create() {
    return new ProviderProperties();
}
