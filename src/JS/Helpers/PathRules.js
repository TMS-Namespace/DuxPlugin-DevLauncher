// PathRules.js - Expand configured paths and normalize local file URI targets.
.pragma library

// Expand a leading home shortcut or XDG config placeholder using QML-provided values.
function expand(value, home, configHome) {
    const path = String(value || "");
    if (path === "~") return home;
    if (path.startsWith("~/")) return home + path.slice(1);
    if (path === "$XDG_CONFIG_HOME") return configHome || home + "/.config";
    if (path.startsWith("$XDG_CONFIG_HOME/")) return (configHome || home + "/.config") + path.slice(16);
    return path;
}

// Accept only absolute local paths and remove lexical dot segments.
function localPath(value) {
    if (value && typeof value === "object") {
        if (value.scheme && value.scheme !== "file") return "";
        value = value.path || "";
    }
    if (typeof value !== "string" || value.includes("\u0000")) return "";
    let path = value;
    if (path.startsWith("file://")) {
        const match = /^file:\/\/(?:localhost)?(\/[\s\S]*)$/.exec(path);
        if (!match) return "";
        // A malformed URI is not a usable local history entry.
        try { path = decodeURIComponent(match[1]); } catch (error) { return ""; }
    }
    if (path.includes("\u0000") || !path.startsWith("/")) return "";
    const segments = [];
    for (const segment of path.split("/")) {
        if (!segment || segment === ".") continue;
        if (segment === "..") segments.pop();
        else segments.push(segment);
    }
    return "/" + segments.join("/");
}

// Return the containing directory, including the root for a top-level path.
function parentDirectory(path) {
    const local = localPath(path);
    if (!local) return "";
    const separator = local.lastIndexOf("/");
    return separator > 0 ? local.slice(0, separator) : "/";
}
