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
        try {
            path = decodeURIComponent(match[1]);
        } catch (error) {
            return "";
        }
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

// Preserve IDE resource URIs and normalize only local file paths.
function resourcePath(value) {
    if (value && typeof value === "object") {
        if (!value.scheme || (value.scheme === "file" && (!value.authority || value.authority === "localhost")))
            return localPath(value);
        if (typeof value.path !== "string" || !value.path.startsWith("/")) return "";
        return (
            String(value.scheme) +
            "://" +
            String(value.authority || "") +
            encodeURI(value.path).replace(/#/g, "%23").replace(/\?/g, "%3F")
        );
    }
    if (typeof value !== "string" || value.includes("\u0000")) return "";
    const local = localPath(value);
    if (local) return local;
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : "";
}

// Decode mountinfo paths and retain the filesystem type of each mounted location.
function shareMounts(text) {
    return String(text || "")
        .split("\n")
        .map(function (line) {
            const parts = line.split(" - ");
            const fields = parts[0].split(" ");
            if (parts.length !== 2 || fields.length < 5) return null;
            const mount = fields[4].replace(/\\([0-7]{3})/g, function (match, digits) {
                return String.fromCharCode(parseInt(digits, 8));
            });
            const type = parts[1].split(" ")[0];
            const network = /^(?:cifs|smb3?|nfs4?|9p|ceph|glusterfs|davfs|fuse\.sshfs|fuse\.rclone)$/.test(type);
            return { path: mount, share: network };
        })
        .filter(Boolean)
        .sort(function (left, right) {
            return right.path.length - left.path.length;
        });
}

// A remote URI is never probed; mounted network filesystems are classified as shares.
function resourceType(path, mounts) {
    if (typeof path !== "string") return "";
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return "remote";
    if (/^\/run\/user\/[^/]+\/gvfs(?:\/|$)/.test(path)) return "share";
    for (const mount of mounts || []) {
        if (path === mount.path || path.startsWith(mount.path === "/" ? "/" : mount.path + "/"))
            return mount.share ? "share" : "local";
    }
    return path.startsWith("/") ? "local" : "";
}
