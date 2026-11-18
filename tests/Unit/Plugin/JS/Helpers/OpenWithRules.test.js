// OpenWithRules.test.js - Check every step of the choice: last launching IDE, latest source, default IDE, then system default.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const openWith = source("Helpers/OpenWithRules.js");
const codeId = "4c8620ac-08b2-4f28-bcd7-cbe29a37b597";
const codiumId = "78dc1b4e-1d72-45da-b49b-45379f0735ec";
const folderId = "7b65f5c6-7284-47cf-9ce2-9a4a71a16571";
const openable = [codeId, codiumId];
const sources = [{ id: codeId, name: "Code", openedAt: 100 }, { id: codiumId, name: "VSCodium", openedAt: 300 }, { id: folderId, name: "Folder", openedAt: 0 }];

// The IDE that launched the item last opens it, when it can open items.
assert.equal(openWith.choose({ lastIde: codeId, sources: sources }, openable, codiumId), codeId);
// A last IDE that cannot open items anymore is skipped, so the latest source is used.
assert.equal(openWith.choose({ lastIde: folderId, sources: sources }, openable, codiumId), codiumId);
// Without a last launch, the source with the latest date opens it; a folder source is never a choice.
assert.equal(openWith.choose({ lastIde: "", sources: [{ id: folderId, name: "Folder", openedAt: 900 }, { id: codeId, name: "Code", openedAt: 100 }] }, openable, ""), codeId);
// With no reporting IDE that can open items, the default IDE opens it.
assert.equal(openWith.choose({ lastIde: "", sources: [{ id: folderId, name: "Folder", openedAt: 0 }] }, openable, codiumId), codiumId);
// With nothing to choose from, the system default opens it.
assert.equal(openWith.choose({ lastIde: "", sources: [{ id: folderId, name: "Folder", openedAt: 0 }] }, openable, ""), "");
