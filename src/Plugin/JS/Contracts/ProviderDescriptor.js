// ProviderDescriptor.js - Check the labels, field kinds, and dependencies a provider declares for the plugin.
.pragma library
.import "PluginError.js" as PluginError
.import "InstallationType.js" as InstallationType
// Rules: Pure validation: throws PluginError for any malformed declaration and returns it unchanged otherwise; no QML types or logging.

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
    if (descriptor.iconName !== undefined && typeof descriptor.iconName !== "string") invalid("iconName");
    if (
        descriptor.nativeIconFile !== undefined &&
        (typeof descriptor.nativeIconFile !== "string" || !/^[^/]+\.svg$/i.test(descriptor.nativeIconFile))
    )
        invalid("nativeIconFile");
    if (typeof descriptor.launchable !== "boolean") invalid("launchable");
    if (typeof descriptor.scansFolders !== "boolean") invalid("scansFolders");
    if (!Array.isArray(descriptor.installations) || !descriptor.installations.length) invalid("installations");
    const types = [];
    for (const installation of descriptor.installations) {
        if (!installation || !InstallationType.isValid(installation.type) || types.includes(installation.type))
            invalid("installation type");
        if (typeof installation.executable !== "string") invalid("installation executable");
        // An empty executable is allowed only when the user supplies it, so an accidental empty value is still refused.
        if (!installation.executable && installation.userExecutable !== true) invalid("installation executable");
        if (installation.userExecutable !== undefined && typeof installation.userExecutable !== "boolean")
            invalid("installation user executable");
        if (installation.desktopId !== undefined && typeof installation.desktopId !== "string")
            invalid("installation desktop ID");
        if (installation.iconName !== undefined && typeof installation.iconName !== "string")
            invalid("installation icon");
        if (installation.config !== undefined && typeof installation.config !== "string")
            invalid("installation config");
        if (installation.shared !== undefined && typeof installation.shared !== "string")
            invalid("installation shared folder");
        types.push(installation.type);
    }
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
        if (
            !Array.isArray(names) ||
            names.some(function (name) {
                return typeof name !== "string";
            })
        )
            invalid("dependents of " + key);
    }
    return descriptor;
}
