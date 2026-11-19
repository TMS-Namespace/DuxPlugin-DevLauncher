// ScanErrorRules.js - Turn repository scan failures into useful diagnostics, and pick the one a source shows.
.pragma library

// Keep error classification independent of paths and platform-specific wording.
function repository(exitCode, errorText) {
    if (exitCode === 124 || exitCode === 137) return "Repository scan timed out. Try a narrower folder.";
    const output = String(errorText || "").toLowerCase();
    if (output.includes("permission denied"))
        return "Repository scan could not read part of the folder (permission denied).";
    if (output.includes("no such file or directory"))
        return "A configured repository folder no longer exists, or a file disappeared during scanning.";
    return "Repository scan failed (exit " + exitCode + "). Check that the folder is accessible.";
}

// Identify the configured folder that produced one repository scan error.
function forFolder(path, exitCode, errorText) {
    return "Repository folder " + path + ": " + repository(exitCode, errorText);
}

// Explain that a folder has more repositories than one scan lists, so only the first ones are shown.
function limitReached(path, repositoryLimit) {
    return (
        "Repository folder " +
        path +
        " has more than " +
        repositoryLimit +
        " repositories; only the first " +
        repositoryLimit +
        " are listed."
    );
}

// Pick the latest error recorded for one source, for display in that source's settings row.
function forProvider(providerId, failures) {
    const match = (failures || []).find(function (failure) {
        return failure.providerId === providerId;
    });
    return match ? match.message : "";
}
