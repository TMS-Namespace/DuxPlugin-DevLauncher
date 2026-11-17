// PluginError.js - Keep friendly provider errors separate from diagnostic details.
.pragma library
var Code = Object.freeze({ PROVIDER_CONFIG: "providerConfig", PARSE: "parse", STORAGE: "storage" });

// One error type crosses the JavaScript and QML boundary.
function PluginError(code, userMessage, details, field) {
    this.name = "PluginError";
    this.code = code;
    this.userMessage = userMessage;
    this.details = details || "";
    this.message = this.details ? userMessage + ": " + this.details : userMessage;
    this.retryable = false;
    this.field = field || "";
}
PluginError.prototype = Object.create(Error.prototype);
PluginError.prototype.constructor = PluginError;

// Hide foreign exception text from the user interface.
function from(value) {
    return value instanceof PluginError ? value : new PluginError(Code.PARSE, "Could not read an IDE's recent history.", String(value));
}
