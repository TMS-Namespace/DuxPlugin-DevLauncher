// NeoVimMsgpack.js - Decode the MessagePack values that NeoVim writes into its ShaDa history file.
.pragma library
.import "../../../Plugin/JS/Contracts/PluginError.js" as PluginError
// Rules: Pure byte decoding: throws PluginError on truncated, nested too deeply, or unsupported input; no QML types, I/O, or logging.

var MAX_DEPTH = 32;

// Stop with one parse error for damaged ShaDa data, so the previous history is kept.
function damaged(detail) {
    throw new PluginError.PluginError(PluginError.Code.PARSE, "The NeoVim history file is damaged.", detail);
}

// A cursor over a plain array of byte values; every read checks the bounds before it moves forward.
var Reader = class Reader {
    // Start reading at the first byte of the array.
    constructor(bytes) {
        this.bytes = bytes;
        this.position = 0;
    }
    // Report whether every byte has been read.
    atEnd() {
        return this.position >= this.bytes.length;
    }
    // Take the next count bytes as a new array, refusing to read past the end.
    take(count) {
        if (count < 0 || this.position + count > this.bytes.length) damaged("Truncated value");
        const slice = this.bytes.slice(this.position, this.position + count);
        this.position += count;
        return slice;
    }
    // Read a big-endian unsigned integer that is the given number of bytes wide.
    unsigned(width) {
        let value = 0;
        for (const item of this.take(width)) value = value * 256 + item;
        return value;
    }
    // Read a big-endian two's complement integer that is the given number of bytes wide.
    signed(width) {
        const value = this.unsigned(width);
        return value >= Math.pow(2, width * 8 - 1) ? value - Math.pow(2, width * 8) : value;
    }
};

// Turn UTF-8 bytes into text; invalid UTF-8 is refused instead of being shown as replacement characters.
function text(bytes) {
    let encoded = "";
    for (const item of bytes) encoded += "%" + (item < 16 ? "0" : "") + item.toString(16);
    try {
        return decodeURIComponent(encoded);
    } catch (caughtError) {
        return damaged("Invalid UTF-8 text");
    }
}

// Read a MessagePack map of the given entry count, converting every key to text.
function map(reader, count, depth) {
    const result = {};
    for (let index = 0; index < count; index++) {
        const key = readValue(reader, depth + 1);
        result[String(key)] = readValue(reader, depth + 1);
    }
    return result;
}

// Read a MessagePack array of the given entry count.
function array(reader, count, depth) {
    const result = [];
    for (let index = 0; index < count; index++) result.push(readValue(reader, depth + 1));
    return result;
}

// Read the next MessagePack value from the reader. Floats are skipped as null, because ShaDa paths and times never use them.
function readValue(reader, depth) {
    if (depth > MAX_DEPTH) damaged("Value nested too deeply");
    const marker = reader.take(1)[0];
    if (marker <= 0x7f) return marker;
    if (marker >= 0xe0) return marker - 256;
    if (marker >= 0x80 && marker <= 0x8f) return map(reader, marker & 0x0f, depth);
    if (marker >= 0x90 && marker <= 0x9f) return array(reader, marker & 0x0f, depth);
    if (marker >= 0xa0 && marker <= 0xbf) return text(reader.take(marker & 0x1f));
    switch (marker) {
        case 0xc0:
            return null;
        case 0xc2:
            return false;
        case 0xc3:
            return true;
        // NeoVim writes file names as binary values that hold UTF-8, so binary values are read as text.
        case 0xc4:
            return text(reader.take(reader.unsigned(1)));
        case 0xc5:
            return text(reader.take(reader.unsigned(2)));
        case 0xc6:
            return text(reader.take(reader.unsigned(4)));
        case 0xca:
            reader.take(4);
            return null;
        case 0xcb:
            reader.take(8);
            return null;
        case 0xcc:
            return reader.unsigned(1);
        case 0xcd:
            return reader.unsigned(2);
        case 0xce:
            return reader.unsigned(4);
        case 0xcf:
            return reader.unsigned(8);
        case 0xd0:
            return reader.signed(1);
        case 0xd1:
            return reader.signed(2);
        case 0xd2:
            return reader.signed(4);
        case 0xd3:
            return reader.signed(8);
        case 0xd9:
            return text(reader.take(reader.unsigned(1)));
        case 0xda:
            return text(reader.take(reader.unsigned(2)));
        case 0xdb:
            return text(reader.take(reader.unsigned(4)));
        case 0xdc:
            return array(reader, reader.unsigned(2), depth);
        case 0xdd:
            return array(reader, reader.unsigned(4), depth);
        case 0xde:
            return map(reader, reader.unsigned(2), depth);
        case 0xdf:
            return map(reader, reader.unsigned(4), depth);
        default:
            return damaged("Unsupported value type");
    }
}

// Decode the first value of a byte array, which is the whole item body in the ShaDa format.
function decodeValue(bytes) {
    return readValue(new Reader(bytes), 0);
}

// Read the next value from a shared reader, so a ShaDa item can read its type, timestamp, and length one after another.
function next(reader) {
    return readValue(reader, 0);
}
