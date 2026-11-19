// NeoVimShada.js - Decode NeoVim's ShaDa history: base64 text becomes items, and file-mark items become local paths.
.pragma library
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
.import "NeoVimConstants.js" as Constants
.import "NeoVimMsgpack.js" as MessagePack
// Rules: Pure parsing: throws PluginError for damaged or oversized input and never runs a process; no QML types or logging.

var BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Stop with one parse error for damaged history, so the previous cache is kept.
function damaged(detail) {
    throw new PluginError.PluginError(PluginError.Code.PARSE, "The NeoVim history file is damaged.", detail);
}

// Decode standard base64 text, as written by base64 -w0, into a plain array of byte values.
function decodeBase64(text) {
    const encoded = String(text || "");
    // The text must have whole groups of four characters, padding only at the end, and no more than the byte limit.
    if (
        encoded.length > Math.ceil(Constants.MAX_SHADA_BYTES / 3) * 4 ||
        encoded.length % 4 !== 0 ||
        !/^[A-Za-z0-9+\/]*={0,2}$/.test(encoded)
    )
        damaged("Invalid or oversized base64 text");
    const bytes = [];
    for (let index = 0; index < encoded.length; index += 4) {
        const first = BASE64_ALPHABET.indexOf(encoded[index]);
        const second = BASE64_ALPHABET.indexOf(encoded[index + 1]);
        const third = encoded[index + 2] === "=" ? 0 : BASE64_ALPHABET.indexOf(encoded[index + 2]);
        const fourth = encoded[index + 3] === "=" ? 0 : BASE64_ALPHABET.indexOf(encoded[index + 3]);
        bytes.push((first << 2) | (second >> 4));
        if (encoded[index + 2] !== "=") bytes.push(((second & 15) << 4) | (third >> 2));
        if (encoded[index + 3] !== "=") bytes.push(((third & 3) << 6) | fourth);
    }
    return bytes;
}

// A ShaDa item count, timestamp, or length is a non-negative whole number.
function isCount(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

// Walk the ShaDa items. Each item is a type, a timestamp in seconds, a data length, and then the data itself.
// Items of other types are skipped by their length, so newer NeoVim item types do not stop the read.
function fileMarkTimes(bytes) {
    const reader = new MessagePack.Reader(bytes);
    const latest = {};
    while (!reader.atEnd()) {
        const type = MessagePack.next(reader);
        const timestamp = MessagePack.next(reader);
        const length = MessagePack.next(reader);
        if (!isCount(type) || !isCount(timestamp) || !isCount(length)) damaged("Invalid item header");
        const body = reader.take(length);
        if (Constants.FILE_MARK_TYPES.indexOf(type) < 0) continue;
        const item = MessagePack.decodeValue(body);
        // A file mark without a file name is not a file record, so it is skipped.
        if (!item || typeof item.f !== "string") continue;
        if (!(item.f in latest) || latest[item.f] < timestamp) latest[item.f] = timestamp;
    }
    return latest;
}

// Return the newest local absolute paths marked in ShaDa, with their timestamps in seconds, up to the list limit.
// Remote and virtual buffers such as scp:// or term:// are not local paths, so they are left out.
function records(bytes) {
    const latest = fileMarkTimes(bytes);
    return Object.keys(latest)
        .filter(function (path) {
            return path.startsWith("/") && path.indexOf("\u0000") < 0;
        })
        .map(function (path) {
            return { path: path, timestamp: latest[path] };
        })
        .sort(function (first, second) {
            return (
                second.timestamp - first.timestamp || (first.path < second.path ? -1 : first.path > second.path ? 1 : 0)
            );
        })
        .slice(0, Constants.MAX_PER_LIST);
}
