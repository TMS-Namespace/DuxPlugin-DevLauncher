// NeoVimShada.test.js - Check ShaDa decoding on a real NeoVim file and on damaged or oversized input.
// Rules: Runs in plain node; the real fixture comes from NeoVim 0.12 itself, and damaged input must throw PluginError rather than return partial history.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = require("../../../../Helpers/LoadSource.cjs");
const { encodeItem, encodeShada, encodeValue } = require("../../../../Helpers/ShadaFixture.cjs");
const Shada = source("Providers/NeoVim/JS/NeoVimShada.js");
const MessagePack = source("Providers/NeoVim/JS/NeoVimMsgpack.js");
const Constants = source("Providers/NeoVim/JS/NeoVimConstants.js");

// Copy a value produced by a QML JavaScript module into this realm, so strict comparisons see plain arrays and objects.
function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

// Throw unless the code raises a PluginError with the parse code.
function assertParseError(action, label) {
    assert.throws(
        action,
        (error) => error && error.code === "parse" && error.userMessage === "The NeoVim history file is damaged.",
        label
    );
}

// The reader hands ShaDa bytes over as a plain array of byte values, which is what FileView.data() gives after Array.from.
function bytesOf(buffer) {
    return Array.from(buffer);
}

// A real ShaDa file written by NeoVim 0.12.6: it marks three local paths, one of them a folder.
const realBytes = fs.readFileSync(path.join(__dirname, "..", "fixtures", "nvim-real.shada"));
const realRecords = Shada.records(bytesOf(realBytes));
assert.deepEqual(plain(realRecords.map((record) => record.path).sort()), [
    "/srv/dl-fixture/project",
    "/srv/dl-fixture/project/main.lua",
    "/srv/dl-fixture/project/notes.md"
]);
assert.ok(realRecords.every((record) => Number.isInteger(record.timestamp) && record.timestamp > 1700000000));

// Item types other than file marks are skipped by their length, so their body is never decoded.
const mixed = encodeShada([
    { type: 1, timestamp: 100, data: { generator: "nvim" } },
    { type: 8, timestamp: 200, data: { f: "/srv/jump-only" } },
    { type: 10, timestamp: 300, data: { f: "/srv/marked.md", l: 4, n: 46 } },
    { type: 10, timestamp: 250, data: { f: "/srv/marked.md", l: 1, n: 34 } },
    { type: 7, timestamp: 400, data: { f: "/srv/global.lua", n: 48 } }
]);
// A later item type with a malformed body must not stop the read, because its length still frames it.
const unknownBody = Buffer.from([99, 0x82, 0xc1, 0xc1]);
const stream = Buffer.concat([
    mixed,
    Buffer.from(encodeValue(77)),
    Buffer.from(encodeValue(5)),
    Buffer.from(encodeValue(unknownBody.length)),
    unknownBody
]);
const mixedRecords = Shada.records(bytesOf(stream));
assert.deepEqual(plain(mixedRecords.map((record) => [record.path, record.timestamp])), [
    ["/srv/global.lua", 400],
    ["/srv/marked.md", 300]
]);

// Remote and virtual buffers and relative names are not local paths, so they are left out.
const virtual = encodeShada([
    { type: 10, timestamp: 10, data: { f: "scp://host/home/file" } },
    { type: 10, timestamp: 11, data: { f: "term://bash" } },
    { type: 10, timestamp: 12, data: { f: "relative/file.md" } },
    { type: 10, timestamp: 13, data: { n: 46 } },
    { type: 10, timestamp: 14, data: { f: "/srv/local.md" } }
]);
assert.deepEqual(plain(Shada.records(bytesOf(virtual)).map((record) => record.path)), ["/srv/local.md"]);

// The list keeps only the newest entries within the declared limit.
const many = [];
for (let index = 0; index < Constants.MAX_PER_LIST + 5; index++)
    many.push({ type: 10, timestamp: 1000 + index, data: { f: "/srv/item-" + index } });
const limited = Shada.records(bytesOf(encodeShada(many)));
assert.equal(limited.length, Constants.MAX_PER_LIST);
assert.equal(limited[0].path, "/srv/item-" + (Constants.MAX_PER_LIST + 4));

// Damaged input throws a parse error instead of returning partial history.
const truncated = encodeItem(10, 1, { f: "/srv/x" }).subarray(0, 6);
assertParseError(() => Shada.records(bytesOf(truncated)), "truncated item");
const badLength = Buffer.from(encodeValue(10).concat(encodeValue(1), encodeValue(200), encodeValue({ f: "/x" })));
assertParseError(() => Shada.records(bytesOf(badLength)), "item length beyond the data");
const badUtf8 = Buffer.from(encodeValue(10).concat(encodeValue(1), encodeValue(4), [0xa2, 0xc3, 0x28]));
assertParseError(() => Shada.records(bytesOf(badUtf8)), "invalid UTF-8 in a path");

// Bytes over the size limit are refused before they are parsed.
assertParseError(() => Shada.records(new Array(Constants.MAX_SHADA_BYTES + 1).fill(0)), "oversized ShaDa file");

// The decoder reads all MessagePack forms that ShaDa items use, and refuses nesting beyond the depth limit.
assert.deepEqual(MessagePack.decodeValue([0xc3]), true);
assert.deepEqual(MessagePack.decodeValue([0xd0, 0xff]), -1);
assert.deepEqual(MessagePack.decodeValue([0xcd, 0x01, 0x00]), 256);
assert.deepEqual(MessagePack.decodeValue([0xa1, 0x61]), "a");
assert.deepEqual(plain(MessagePack.decodeValue([0x92, 0x01, 0x02])), [1, 2]);
assert.equal(MessagePack.decodeValue([0xc4, 0x02, 0x61, 0x62]), "ab");
assert.deepEqual(plain(MessagePack.decodeValue([0x81, 0xa1, 0x66, 0x01])), { f: 1 });
let deep = [0x01];
for (let level = 0; level < 40; level++) deep = [0x91].concat(deep);
assertParseError(() => MessagePack.decodeValue(deep), "nesting beyond the depth limit");
console.log("NeoVimShada tests passed");
