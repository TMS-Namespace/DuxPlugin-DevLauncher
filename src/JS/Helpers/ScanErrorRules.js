// ScanErrorRules.js - Turn repository process failures into useful diagnostics.
.pragma library
.import "PathRules.js" as PathRules

// Keep error classification independent of paths and platform-specific wording.
function repository(exitCode, errorText) {
    if (exitCode === 124 || exitCode === 137)
        return "Repository scan timed out. Try a narrower folder.";
    const output = String(errorText || "").toLowerCase();
    if (output.includes("permission denied"))
        return "Repository scan could not read part of the folder (permission denied).";
    if (output.includes("no such file or directory"))
        return "A configured repository folder no longer exists, or a file disappeared during scanning.";
    return "Repository scan failed (exit " + exitCode + "). Check that the folder is accessible.";
}

// Identify the configured root that produced one repository scan error.
function forFolder(path, exitCode, errorText) {
    return "Repository folder " + path + ": " + repository(exitCode, errorText);
}

// Explain why a configured root was never scanned because the repository cap was already reached.
function notScanned(path, repositoryLimit) {
    return "Repository folder " + path + " was not scanned because the limit of " + repositoryLimit + " repositories was already reached.";
}

// Pick the latest scan error for one configured folder, for display in the settings folder list.
// Folder errors are shown only here, never as a repeated toast: see RepositoryNotificationRules.messages.
function forConfiguredFolder(folder, failures) {
    const wanted = PathRules.localPath(folder);
    if (!wanted) return "";
    const match = (failures || []).find(function(failure) { return PathRules.localPath(failure.path) === wanted; });
    return match ? match.message : "";
}
