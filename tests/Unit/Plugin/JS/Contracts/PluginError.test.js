// PluginError.test.js - Check friendly errors keep details separate and wrap foreign exceptions safely.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const pluginError = source("Contracts/PluginError.js");

const friendly = new pluginError.PluginError(pluginError.Code.PARSE, "Friendly text.", "raw detail");
assert.equal(friendly.userMessage, "Friendly text.");
assert.equal(friendly.details, "raw detail");
assert.equal(friendly.message, "Friendly text.: raw detail");
assert.equal(friendly.retryable, false);
assert.equal(friendly.name, "PluginError");
assert.equal(friendly.field, "");
assert.equal(
    new pluginError.PluginError(pluginError.Code.PROVIDER_CONFIG, "Invalid.", "detail", "executable").field,
    "executable"
);

// An existing PluginError passes through unchanged.
assert.equal(pluginError.from(friendly), friendly);
// A foreign exception is wrapped with the generic message, and its raw text is kept only as details.
const wrapped = pluginError.from(new TypeError("internal path /home/secret"));
assert.equal(wrapped.code, pluginError.Code.PARSE);
assert.equal(wrapped.userMessage, "Could not read an IDE's recent history.");
assert.match(wrapped.details, /internal path/);
assert.ok(!wrapped.userMessage.includes("secret"), "raw exception text must not reach the user message");
