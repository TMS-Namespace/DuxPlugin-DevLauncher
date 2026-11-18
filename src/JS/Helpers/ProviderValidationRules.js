// ProviderValidationRules.js - Compare installation paths and identify draft readiness.
.pragma library
.import "PathRules.js" as PathRules
.import "Config.js" as Config
.import "../Contracts/PluginError.js" as PluginError

// Reject malformed or unbounded provider path declarations before any process runs.
function targets(values) {
    if (!Array.isArray(values) || !values.length || values.length > Config.maxProviderValidationPaths)
        throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This IDE provider could not validate its folders.", "Invalid validation path count");
    return values.map(function(target) {
        if (!target || typeof target.label !== "string" || !target.label.trim()
            || typeof target.path !== "string" || !target.path.startsWith("/") || !PathRules.localPath(target.path)
            || (target.kind !== "directory" && target.kind !== "file")
            || (target.field !== undefined && (typeof target.field !== "string" || !target.field))
            || typeof target.optional !== "boolean" || typeof target.unique !== "boolean")
            throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "This IDE provider could not validate its folders.", "Invalid validation path");
        return target;
    });
}

// Report the first executable or declared resource reused by another installation.
function duplicate(candidate, existing) {
    if (candidate.type !== existing.type) return "";
    const candidateExecutable = String(candidate.executable || "");
    const existingExecutable = String(existing.executable || "");
    const sameExecutable = candidateExecutable === existingExecutable
        || (candidateExecutable.startsWith("/") && existingExecutable.startsWith("/") && PathRules.localPath(candidateExecutable) === PathRules.localPath(existingExecutable))
        || (candidateExecutable.indexOf("/") < 0 && existingExecutable.split("/").pop() === candidateExecutable)
        || (existingExecutable.indexOf("/") < 0 && candidateExecutable.split("/").pop() === existingExecutable);
    if (sameExecutable) return "IDE executable path";
    for (const candidatePath of candidate.paths || []) {
        if (!candidatePath.unique) continue;
        const normalized = PathRules.localPath(candidatePath.path);
        if (!normalized) continue;
        for (const existingPath of existing.paths || []) {
            if (!existingPath.unique) continue;
            if (normalized === PathRules.localPath(existingPath.path)) return candidatePath.label;
        }
    }
    return "";
}

// Match duplicate-resource feedback to the field declared by the provider.
function duplicateField(label, paths) {
    if (label === "IDE executable path") return "executable";
    const target = (paths || []).find(function(candidate) { return candidate.label === label && candidate.field; });
    return target ? target.field : "";
}

// Keep verification attached to the exact fields that affect an installation.
function fingerprint(configuration) {
    return JSON.stringify(configuration || {});
}
