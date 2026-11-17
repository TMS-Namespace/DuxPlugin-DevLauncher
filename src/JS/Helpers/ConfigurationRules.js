// ConfigurationRules.js - Bound current-format user settings before scanning.
.pragma library
.import "Config.js" as Config
.import "PathRules.js" as PathRules

// Explain why one selected folder cannot be added to the scan list.
function folderAddition(value, currentFolders) {
    if (typeof value !== "string") return { path: "", error: "Choose a local folder." };
    const path = PathRules.localPath(value);
    if (!path) return { path: "", error: "Choose a local folder." };
    for (const existing of currentFolders || []) {
        const selected = PathRules.localPath(existing);
        if (path === selected) return { path: "", error: "This folder is already being scanned: " + selected };
        if (path.startsWith(selected === "/" ? "/" : selected + "/"))
            return { path: "", error: "This folder is already covered by the scanned folder " + selected + "." };
        if (selected.startsWith(path === "/" ? "/" : path + "/"))
            return { path: "", error: "A selected folder is already being scanned inside this folder: " + selected + ". Remove it before adding the parent folder." };
    }
    if ((currentFolders || []).length >= Config.maxScanFolders)
        return { path: "", error: "You can scan at most " + Config.maxScanFolders + " folders." };
    return { path: path, error: "" };
}

// Keep current folder lists unique, non-overlapping, and within the scanner limit.
function folders(value) {
    const entries = Array.isArray(value) ? value : [];
    const selected = [];
    for (const folder of entries) {
        const addition = folderAddition(folder, selected);
        if (addition.path) selected.push(addition.path);
    }
    return selected;
}

// Keep only current-format provider declarations within the configured limit.
function providers(value) {
    const entries = Array.isArray(value) ? value : [];
    return entries.filter(function(entry) { return entry && typeof entry === "object" && !Array.isArray(entry); })
        .slice(0, Config.maxProviders);
}

// Use a current provider name or the empty system-default selection.
function defaultProvider(value, providerList) {
    return typeof value === "string" && providerList.some(function(provider) { return provider.id === value; }) ? value : "";
}

// Keep repository search depth in the range offered by the settings slider.
function repositoryDepth(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= Config.minRepositoryDepth && number <= Config.maxRepositoryDepth ? number : Config.defaultRepositoryDepth;
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
    return { folders: folders(folderValues), providers: providers(providerValues), depth: repositoryDepth(depthValue) };
}
