// VSCodeHistoryPayload.test.js - Check SQLite and JSON history decoding.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const payload = source("Providers/VSCode/VSCodeHistoryPayload.js");
assert.equal(payload.decode('{"entries":[1]}', "unused", "sqlite").entries.length, 1);
assert.equal(payload.decode('{"history.recentlyOpenedPathsList":{"entries":[1]}}', "history.recentlyOpenedPathsList", "json").entries.length, 1);
assert.throws(() => payload.decode("broken", "key", "sqlite"));
// An oversize JSON history file is refused with a friendly parse error instead of being parsed.
const oversizeText = "{" + "a".repeat(source("Providers/VSCode/VSCodeConstants.js").MAX_HISTORY_BYTES) + "}";
assert.throws(() => payload.decode(oversizeText, "openedPathsList", "json"), error => error.code === "parse" && error.userMessage.includes("too large"));
// The size limit counts UTF-8 bytes, not characters: 'é' is two bytes, so a multibyte file just over the limit is refused as too large.
const limit = source("Providers/VSCode/VSCodeConstants.js").MAX_HISTORY_BYTES;
const multibyteOver = '{"k":"' + "é".repeat(Math.floor((limit - 10) / 2) + 10) + '"}';
assert.ok(multibyteOver.length < limit && payload.utf8ByteLength(multibyteOver) > limit, "the fixture must be under the limit in characters and over it in bytes");
assert.throws(() => payload.decode(multibyteOver, "openedPathsList", "json"), error => error.code === "parse" && error.userMessage.includes("too large"));
// Bytes of common characters, a surrogate pair, and an empty text.
assert.equal(payload.utf8ByteLength("abc"), 3);
assert.equal(payload.utf8ByteLength("é"), 2);
assert.equal(payload.utf8ByteLength("€"), 3);
assert.equal(payload.utf8ByteLength("😀"), 4);
assert.equal(payload.utf8ByteLength(""), 0);
