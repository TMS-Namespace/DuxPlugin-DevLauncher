// RiderHistory.js - Parse bounded JetBrains recent-solution XML without executing markup or resolving entities externally.
.pragma library
// Rules: Pure XML reader: throws PluginError on damaged or oversized input and never resolves external entities; no QML types or logging.
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
.import "RiderConstants.js" as Constants

// Decode the five XML entities and numeric character references; refuse unknown or invalid entities.
function decode(value) {
    return String(value).replace(/&([^;\s<&]+;)?/g, function(match, encoded) {
        if (!encoded) throw new PluginError.PluginError(PluginError.Code.PARSE, "The Rider history file is damaged.", "Invalid XML entity");
        const entity = encoded.slice(0, -1);
        const known = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
        if (Object.prototype.hasOwnProperty.call(known, entity)) return known[entity];
        const numeric = /^#([0-9]+)$/.exec(entity) || /^#x([0-9a-f]+)$/i.exec(entity);
        if (numeric) {
            const number = parseInt(numeric[1], entity[1].toLowerCase() === "x" ? 16 : 10);
            if (number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff)) return String.fromCodePoint(number);
        }
        throw new PluginError.PluginError(PluginError.Code.PARSE, "The Rider history file is damaged.", "Invalid XML entity");
    });
}

// Count UTF-8 bytes so a bounded process cannot return a truncated multibyte document.
function byteLength(text) {
    let length = 0;
    for (const character of text) {
        const code = character.codePointAt(0);
        length += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    }
    return length;
}

// Read attributes strictly so malformed entries cannot silently erase previously cached history.
function attributes(tag) {
    const found = {};
    let remaining = tag.replace(/^<[A-Za-z_:][\w:.-]*/, "").replace(/\/?\s*>$/, "");
    const pattern = /^\s+([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/;
    while (remaining.trim()) {
        const match = pattern.exec(remaining);
        if (!match || Object.prototype.hasOwnProperty.call(found, match[1]))
            throw new PluginError.PluginError(PluginError.Code.PARSE, "The Rider history file is damaged.", "Invalid XML attributes");
        found[match[1]] = decode(match[2] === undefined ? match[3] : match[2]);
        remaining = remaining.slice(match[0].length);
    }
    return found;
}

// Normalize local recent entries and their actual Rider project-open times.
function records(text, home, properties) {
    const xml = String(text || "");
    if (!xml || byteLength(xml) > Constants.MAX_HISTORY_BYTES || /<!DOCTYPE/i.test(xml))
        throw new PluginError.PluginError(PluginError.Code.PARSE, "Could not read Rider history.", "Empty, oversized, or unsupported XML");
    const token = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[A-Za-z_:][^<>"']*(?:"[^"]*"[^<>"']*|'[^']*'[^<>"']*)*>/g;
    const stack = [];
    const result = [];
    let current = null;
    let previousEnd = 0;
    let foundComponent = false;
    let match;
    while ((match = token.exec(xml))) {
        if (xml.slice(previousEnd, match.index).includes("<")) throw new PluginError.PluginError(PluginError.Code.PARSE, "The Rider history file is damaged.", "Invalid XML markup");
        previousEnd = token.lastIndex;
        const tag = match[0];
        if (tag.startsWith("<?") || tag.startsWith("<!--") || tag.startsWith("<![CDATA[")) continue;
        const closing = tag.startsWith("</");
        const name = /^<\/?([A-Za-z_:][\w:.-]*)/.exec(tag)[1];
        if (closing) {
            if (!stack.length || stack.pop().name !== name) throw new PluginError.PluginError(PluginError.Code.PARSE, "The Rider history file is damaged.", "Unbalanced XML");
            if (name === "entry" && current && stack.length === current.depth) {
                const source = current.path === "$USER_HOME$" ? home : current.path.startsWith("$USER_HOME$/") ? home + current.path.slice(11) : current.path;
                const path = PathRules.localPath(source);
                if (path && result.length >= Constants.MAX_HISTORY_ENTRIES) throw new PluginError.PluginError(PluginError.Code.PARSE, "The Rider history file is too large to read.", "Too many recent projects");
                if (path) result.push({ path: path, kind: /\.(slnx?|csproj|fsproj|vbproj)$/i.test(path) ? "file" : "folder", provider: properties.providerId, providerName: properties.name, openedAt: current.openedAt, recent: current.openedAt });
                current = null;
            }
            continue;
        }
        const data = attributes(tag);
        if (name === "component" && data.name === "RiderRecentProjectsManager") foundComponent = true;
        if (name === "entry" && !current && stack.some(function(item) { return item.name === "component" && item.data.name === "RiderRecentProjectsManager"; }) && stack.some(function(item) { return item.name === "option" && item.data.name === "additionalInfo"; }) && data.key)
            current = { path: data.key, openedAt: 0, depth: stack.length };
        if (name === "option" && current && data.name === "projectOpenTimestamp") current.openedAt = Math.max(0, Number(data.value) || 0);
        if (!tag.endsWith("/>")) stack.push({ name: name, data: data });
    }
    if (!foundComponent || stack.length || xml.slice(previousEnd).includes("<")) throw new PluginError.PluginError(PluginError.Code.PARSE, "The Rider history file is damaged.", "Incomplete XML");
    return result;
}

// The same path can occur in several versioned histories; keep its latest recorded opening date.
function merge(records) {
    const entries = Object.create(null);
    for (const record of records || []) {
        const previous = entries[record.path];
        if (!previous || record.openedAt > previous.openedAt) entries[record.path] = record;
    }
    return Object.keys(entries).map(function(path) { return entries[path]; });
}
