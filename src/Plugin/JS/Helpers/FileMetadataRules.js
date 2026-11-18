// FileMetadataRules.js - Share MIME icon metadata by extension where appropriate.
.pragma library

// Keep extensionless files and folders path-specific.
function cacheKey(path, kind) {
    if (kind === "file") {
        const name = String(path).split("/").pop();
        const dot = name.lastIndexOf(".");
        if (dot > 0 && dot < name.length - 1) return "type:" + name.slice(dot + 1).toLowerCase();
    }
    return "path:" + path;
}
