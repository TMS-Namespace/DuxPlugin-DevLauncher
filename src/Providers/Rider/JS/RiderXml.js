// RiderXml.js - Decode XML entities, count UTF-8 bytes, and read tag attributes strictly for Rider's recent-solution files.
.pragma library
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
// Rules: Pure XML primitives: throws PluginError on invalid input and never resolves external entities; no QML types or logging.

// Decode the five XML entities and numeric character references; refuse unknown or invalid entities.
function decode(value) {
    return String(value).replace(/&([^;\s<&]+;)?/g, function (match, encoded) {
        if (!encoded)
            throw new PluginError.PluginError(
                PluginError.Code.PARSE,
                "The Rider history file is damaged.",
                "Invalid XML entity"
            );
        const entity = encoded.slice(0, -1);
        const known = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
        if (Object.prototype.hasOwnProperty.call(known, entity)) return known[entity];
        const numeric = /^#([0-9]+)$/.exec(entity) || /^#x([0-9a-f]+)$/i.exec(entity);
        if (numeric) {
            const number = parseInt(numeric[1], entity[1].toLowerCase() === "x" ? 16 : 10);
            if (number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff))
                return String.fromCodePoint(number);
        }
        throw new PluginError.PluginError(
            PluginError.Code.PARSE,
            "The Rider history file is damaged.",
            "Invalid XML entity"
        );
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
            throw new PluginError.PluginError(
                PluginError.Code.PARSE,
                "The Rider history file is damaged.",
                "Invalid XML attributes"
            );
        found[match[1]] = decode(match[2] === undefined ? match[3] : match[2]);
        remaining = remaining.slice(match[0].length);
    }
    return found;
}
