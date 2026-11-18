// ProviderDescriptor.js - Check the labels, field kinds, and dependencies a provider declares for the plugin.
.pragma library
.import "PluginError.js" as PluginError

var FIELD_KINDS = Object.freeze(["executable", "directory"]);
var COMPARISONS = Object.freeze(["exact", "basename"]);
var TEXT_FIELDS = Object.freeze(["label", "description", "placeholder", "chooserTitle"]);

// Stop with one provider-misconfiguration error that names the rule that failed.
function invalid(detail) {
    throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "An IDE provider is misconfigured.", detail);
}

// Return the declaration when it has every field the plugin reads; otherwise throw.
function validate(descriptor) {
    if (!descriptor || typeof descriptor !== "object") invalid("descriptor is not an object");
    if (typeof descriptor.typeId !== "string" || !descriptor.typeId) invalid("typeId");
    if (typeof descriptor.name !== "string" || !descriptor.name) invalid("name");
    if (typeof descriptor.launchable !== "boolean") invalid("launchable");
    if (typeof descriptor.scansFolders !== "boolean") invalid("scansFolders");
    if (!Array.isArray(descriptor.fields)) invalid("fields");
    for (const field of descriptor.fields) {
        if (!field || typeof field.key !== "string" || !field.key) invalid("field key");
        if (FIELD_KINDS.indexOf(field.kind) < 0) invalid("field kind of " + field.key);
        if (COMPARISONS.indexOf(field.comparison) < 0) invalid("comparison of " + field.key);
        for (const text of TEXT_FIELDS) if (typeof field[text] !== "string") invalid(text + " of " + field.key);
    }
    if (!descriptor.dependents || typeof descriptor.dependents !== "object") invalid("dependents");
    for (const key of Object.keys(descriptor.dependents)) {
        const names = descriptor.dependents[key];
        if (!Array.isArray(names) || names.some(function(name) { return typeof name !== "string"; })) invalid("dependents of " + key);
    }
    return descriptor;
}
