// VSCodeHistoryPayload.js - Decode VS Code's SQLite and JSON recent-item values.
.pragma library
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "VSCodeConstants.js" as Constants

// Count the UTF-8 bytes of a text, so the size limit applies to bytes as the reader fetches them.
// A surrogate pair is one code point of four bytes; other characters take one, two, or three bytes.
function utf8Length(text) {
    let bytes = 0;
    for (let index = 0; index < text.length; index++) {
        const code = text.charCodeAt(index);
        if (code < 0x80) bytes += 1;
        else if (code < 0x800) bytes += 2;
        else if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length && (text.charCodeAt(index + 1) & 0xfc00) === 0xdc00) {
            bytes += 4;
            index++;
        } else bytes += 3;
    }
    return bytes;
}

// Return a usable history object or null when the source has no records.
function decode(text, key, format) {
    if (!String(text || "").trim()) return null;
    // A JSON file over the limit is refused, because the reader only fetches the first bytes of it.
    if (format === "json" && utf8Length(String(text)) > Constants.MAX_HISTORY_BYTES)
        throw new PluginError.PluginError(PluginError.Code.PARSE, "The IDE history file is too large to read.", "larger than " + Constants.MAX_HISTORY_BYTES + " bytes");
    let parsed;
    try { parsed = JSON.parse(text); }
    catch (error) {
        throw new PluginError.PluginError(PluginError.Code.PARSE, "An IDE history file is damaged.", String(error));
    }
    const history = format === "json" ? parsed && parsed[key] : parsed;
    return history && typeof history === "object" && !Array.isArray(history) && Object.keys(history).length ? history : null;
}

// Expose the byte counter so the size limit can be checked on multibyte text.
var utf8ByteLength = utf8Length;
