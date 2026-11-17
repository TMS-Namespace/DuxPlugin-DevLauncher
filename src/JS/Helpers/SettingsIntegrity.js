// SettingsIntegrity.js - Detect damaged settings before normalizing or replacing them.
.pragma library
.import "ConfigurationRules.js" as ConfigurationRules
.import "AgeFilterRules.js" as AgeFilterRules
.import "ResultRules.js" as ResultRules
.import "TriggerRules.js" as TriggerRules
.import "Config.js" as Config

// Missing values use defaults; invalid saved data must be preserved before replacement.
function damaged(key, value) {
    if (value === undefined) return false;
    if (key === "folders" || key === "providers") {
        if (!Array.isArray(value)) return true;
        const normalized = key === "folders" ? ConfigurationRules.folders(value) : ConfigurationRules.providers(value);
        return JSON.stringify(value) !== JSON.stringify(normalized);
    }
    if (key === "ageFilter") {
        if (!value || typeof value !== "object" || Array.isArray(value)) return true;
        const normalized = AgeFilterRules.normalize(value);
        return value.value !== normalized.value || value.unit !== normalized.unit || Object.keys(value).length !== 2;
    }
    if (key === "resultsLimit") return !ResultRules.valid(value);
    if (key === "repositoryDepth") return typeof value !== "number" || !Number.isInteger(value) || value < Config.minRepositoryDepth || value > Config.maxRepositoryDepth;
    if (key === "trigger") return TriggerRules.error(value, Config.pluginId, {}, {}) !== "";
    if (key === "searchPaths") return typeof value !== "boolean";
    if (key === "defaultProvider") return typeof value !== "string";
    if (key === "usage") {
        if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length > Config.maxUsageEntries) return true;
        return Object.keys(value).some(function(path) {
            const entry = value[path];
            return !path.startsWith("/") || !entry || typeof entry !== "object" || Array.isArray(entry)
                || !Number.isInteger(entry.count) || entry.count < 0 || !Number.isFinite(entry.recent) || entry.recent < 0;
        });
    }
    return false;
}

// Keep one value that the backup cannot place under a known key, so nothing is overwritten.
function keepUnreadable(backup, value) {
    const kept = Array.isArray(backup.unreadable) ? backup.unreadable : backup.unreadable === undefined ? [] : [backup.unreadable];
    backup.unreadable = kept.concat([value]);
}

// Add one damaged value to the backup without discarding anything already kept.
// A backup container or entry in an unexpected shape is moved under "unreadable" rather than refusing the save.
function withBackup(previous, key, damagedValue) {
    const isObject = !!previous && typeof previous === "object" && !Array.isArray(previous);
    const backup = isObject ? Object.assign({}, previous) : {};
    if (!isObject && previous !== undefined) keepUnreadable(backup, previous);
    if (backup[key] !== undefined && !Array.isArray(backup[key])) {
        keepUnreadable(backup, backup[key]);
        delete backup[key];
    }
    backup[key] = (Array.isArray(backup[key]) ? backup[key] : []).concat([damagedValue]);
    return backup;
}
