// ConfigurationRules.js - Bound current-format user settings before scanning.
.pragma library
.import "Config.js" as Config
.import "PathRules.js" as PathRules
.import "ProviderIdentity.js" as ProviderIdentity
// Rules: Pure settings normalization: drops invalid saved entries instead of throwing; no QML types or logging.

// Explain why one selected folder cannot be added. The current list holds folder entries, each with its own folder path.
function folderAddition(value, currentEntries) {
    if (typeof value !== "string") return { path: "", error: "Choose a local folder." };
    const path = PathRules.localPath(value);
    if (!path) return { path: "", error: "Choose a local folder." };
    for (const entry of currentEntries || []) {
        const selected = PathRules.localPath(entry.folder);
        if (path === selected) return { path: "", error: "This folder is already being scanned: " + selected };
        if (path.startsWith(selected === "/" ? "/" : selected + "/"))
            return { path: "", error: "This folder is already covered by the scanned folder " + selected + "." };
        if (selected.startsWith(path === "/" ? "/" : path + "/"))
            return {
                path: "",
                error:
                    "A selected folder is already being scanned inside this folder: " +
                    selected +
                    ". Remove it before adding the parent folder."
            };
    }
    if ((currentEntries || []).length >= Config.maxScanFolders)
        return { path: "", error: "You can scan at most " + Config.maxScanFolders + " folders." };
    return { path: path, error: "" };
}

// The name shown for one scanned folder: a generated alias from the start of its own identifier.
function folderName(entry) {
    return "Folder " + String(entry.id).slice(0, 6);
}

// Keep only valid folder entries: each needs its own identifier and a source type, and the folders must be unique,
// non-overlapping, and within the scanner limit. Anything else is dropped, so the saved list is replaced by a valid one.
function folderEntries(value) {
    const entries = Array.isArray(value) ? value : [];
    const selected = [];
    for (const entry of entries) {
        if (
            !entry ||
            typeof entry !== "object" ||
            Array.isArray(entry) ||
            !ProviderIdentity.valid(entry.id) ||
            typeof entry.type !== "string" ||
            !entry.type
        )
            continue;
        if (
            selected.some(function (existing) {
                return existing.id === entry.id;
            })
        )
            continue;
        const addition = folderAddition(entry.folder, selected);
        if (addition.path) selected.push(Object.assign({}, entry, { folder: addition.path }));
    }
    return selected;
}

// Keep only current-format provider declarations within the configured limit.
function providers(value) {
    const entries = Array.isArray(value) ? value : [];
    return entries
        .filter(function (entry) {
            return entry && typeof entry === "object" && !Array.isArray(entry);
        })
        .slice(0, Config.maxProviders);
}

// Use a current provider name or the empty system-default selection.
function defaultProvider(value, providerList) {
    return typeof value === "string" &&
        providerList.some(function (provider) {
            return provider.id === value;
        })
        ? value
        : "";
}

// Keep repository search depth in the range offered by the settings slider.
function repositoryDepth(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= Config.minRepositoryDepth && number <= Config.maxRepositoryDepth
        ? number
        : Config.defaultRepositoryDepth;
}

// Find where the open IDE editor's row moves after another IDE is removed, or -1 when that row was removed.
// A negative edit index means the editor is adding a new IDE, so it is never moved.
function indexAfterRemoval(editIndex, removedIndex) {
    if (editIndex < 0) return editIndex;
    if (editIndex === removedIndex) return -1;
    return removedIndex < editIndex ? editIndex - 1 : editIndex;
}

// Give the scan orchestrator plain data without parsing settings in QML.
function scan(folderValues, providerValues, depthValue) {
    return {
        folders: folderEntries(folderValues),
        providers: providers(providerValues),
        depth: repositoryDepth(depthValue)
    };
}
