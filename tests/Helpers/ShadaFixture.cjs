// ShadaFixture.cjs - Encode ShaDa items in the layout NeoVim writes, so parser tests can build exact inputs.
// Rules: Test helper only: encodes the small value set the parser reads and never touches the file system.

// Encode one MessagePack value using the smallest form that fits; only the types the fixtures need are supported.
function encodeValue(value) {
    if (value === null) return [0xc0];
    if (typeof value === "boolean") return [value ? 0xc3 : 0xc2];
    if (typeof value === "number") {
        if (value >= 0 && value < 128) return [value];
        if (value < 256) return [0xcc, value];
        if (value < 65536) return [0xcd, value >> 8, value & 0xff];
        return [0xce, (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
    }
    if (typeof value === "string") {
        const bytes = Array.from(Buffer.from(value, "utf8"));
        const header = bytes.length < 32 ? [0xa0 | bytes.length] : bytes.length < 256 ? [0xd9, bytes.length] : [0xda, bytes.length >> 8, bytes.length & 0xff];
        return header.concat(bytes);
    }
    if (Array.isArray(value)) return [0x90 | value.length].concat(...value.map(encodeValue));
    const entries = Object.keys(value);
    return [0x80 | entries.length].concat(...entries.map(key => encodeValue(key).concat(encodeValue(value[key]))));
}

// Encode one ShaDa item: its type, its timestamp in seconds, the byte length of its data, and the data.
function encodeItem(type, timestamp, data) {
    const body = encodeValue(data);
    return Buffer.from(encodeValue(type).concat(encodeValue(timestamp), encodeValue(body.length), body));
}

// Join encoded items into one ShaDa byte stream.
function encodeShada(items) {
    return Buffer.concat(items.map(item => encodeItem(item.type, item.timestamp, item.data)));
}

module.exports = { encodeValue, encodeItem, encodeShada };
