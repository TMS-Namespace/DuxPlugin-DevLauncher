// RiderHistory.js - Parse bounded JetBrains recent-solution XML without executing markup or resolving entities externally.
.pragma library
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "RiderConstants.js" as Constants
.import "RiderXml.js" as RiderXml
// Rules: Pure XML reader: throws PluginError on damaged or oversized input and never resolves external entities; no QML types or logging.

// Normalize local recent entries and their actual Rider project-open times.
function records(text, home, properties) {
    const xml = String(text || "");
    if (!xml || RiderXml.byteLength(xml) > Constants.MAX_HISTORY_BYTES || /<!DOCTYPE/i.test(xml))
        throw new PluginError.PluginError(
            PluginError.Code.PARSE,
            "Could not read Rider history.",
            "Empty, oversized, or unsupported XML"
        );
    const token =
        /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[A-Za-z_:][^<>"']*(?:"[^"]*"[^<>"']*|'[^']*'[^<>"']*)*>/g;
    const stack = [];
    const result = [];
    let current = null;
    let previousEnd = 0;
    let foundComponent = false;
    let match;
    while ((match = token.exec(xml))) {
        if (xml.slice(previousEnd, match.index).includes("<"))
            throw new PluginError.PluginError(
                PluginError.Code.PARSE,
                "The Rider history file is damaged.",
                "Invalid XML markup"
            );
        previousEnd = token.lastIndex;
        const tag = match[0];
        if (tag.startsWith("<?") || tag.startsWith("<!--") || tag.startsWith("<![CDATA[")) continue;
        const closing = tag.startsWith("</");
        const name = /^<\/?([A-Za-z_:][\w:.-]*)/.exec(tag)[1];
        if (closing) {
            if (!stack.length || stack.pop().name !== name)
                throw new PluginError.PluginError(
                    PluginError.Code.PARSE,
                    "The Rider history file is damaged.",
                    "Unbalanced XML"
                );
            if (name === "entry" && current && stack.length === current.depth) {
                const source =
                    current.path === "$USER_HOME$"
                        ? home
                        : current.path.startsWith("$USER_HOME$/")
                          ? home + current.path.slice(11)
                          : current.path;
                const path = PathRules.resourcePath(source);
                // Rider's command line only accepts local paths; do not publish an unlaunchable remote URI.
                if (path && PathRules.resourceType(path) === "remote") {
                    current = null;
                    continue;
                }
                if (path && result.length >= Constants.MAX_HISTORY_ENTRIES)
                    throw new PluginError.PluginError(
                        PluginError.Code.PARSE,
                        "The Rider history file is too large to read.",
                        "Too many recent projects"
                    );
                if (path)
                    result.push({
                        path: path,
                        kind: /\.(slnx?|csproj|fsproj|vbproj)$/i.test(path) ? "file" : "folder",
                        provider: properties.providerId,
                        providerName: properties.name,
                        openedAt: current.openedAt,
                        recent: current.openedAt
                    });
                current = null;
            }
            continue;
        }
        const data = RiderXml.attributes(tag);
        if (name === "component" && data.name === "RiderRecentProjectsManager") foundComponent = true;
        if (
            name === "entry" &&
            !current &&
            stack.some(function (item) {
                return item.name === "component" && item.data.name === "RiderRecentProjectsManager";
            }) &&
            stack.some(function (item) {
                return item.name === "option" && item.data.name === "additionalInfo";
            }) &&
            data.key
        )
            current = { path: data.key, openedAt: 0, depth: stack.length };
        if (name === "option" && current && data.name === "projectOpenTimestamp")
            current.openedAt = Math.max(0, Number(data.value) || 0);
        if (!tag.endsWith("/>")) stack.push({ name: name, data: data });
    }
    if (!foundComponent || stack.length || xml.slice(previousEnd).includes("<"))
        throw new PluginError.PluginError(
            PluginError.Code.PARSE,
            "The Rider history file is damaged.",
            "Incomplete XML"
        );
    return result;
}

// The same path can occur in several versioned histories; keep its latest recorded opening date.
function merge(records) {
    const entries = Object.create(null);
    for (const record of records || []) {
        const previous = entries[record.path];
        if (!previous || record.openedAt > previous.openedAt) entries[record.path] = record;
    }
    return Object.keys(entries).map(function (path) {
        return entries[path];
    });
}
