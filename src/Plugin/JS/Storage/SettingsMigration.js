// SettingsMigration.js - Convert saved settings from older formats into the current format, before anything reads them.
.pragma library
// Rules: Pure conversion of older saved formats; current-format entries pass through unchanged; no QML types or logging.
// Only DataStorage calls these functions, so every older format is handled in this one module.
.import "../Helpers/ProviderIdentity.js" as ProviderIdentity

// Folders saved in the earliest format are plain path strings. Each one becomes a folder entry with its own unique identifier.
// Entries already in the current format are kept as they are.
function folders(value, typeId) {
    if (!Array.isArray(value)) return value;
    const taken = value.filter(function(item) { return item && typeof item === "object" && ProviderIdentity.valid(item.id); }).map(function(item) { return item.id; });
    return value.map(function(item) {
        if (typeof item !== "string") return item;
        const id = ProviderIdentity.create(taken);
        taken.push(id);
        return { id: id, type: typeId, folder: item };
    });
}

// Entries saved before installation types existed take the default installation type of their own provider type.
// The default is read from the provider's declaration through defaultFor; an unknown type is left as it is, so validation reports it.
function installations(key, value, defaultFor) {
    if ((key !== "providers" && key !== "folders") || !Array.isArray(value)) return value;
    return value.map(function(entry) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry) || entry.installationType !== undefined) return entry;
        const installationType = defaultFor(entry.type);
        return installationType === undefined ? entry : Object.assign({}, entry, { installationType: installationType });
    });
}
