// DraftRules.test.js - Check dependent-field clearing using a declaration that is not VS Code, to prove the rule is generic.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const rules = source("Helpers/DraftRules.js");

const descriptor = { fields: [{ key: "binary", comparison: "basename" }, { key: "root", comparison: "exact" }, { key: "cache", comparison: "exact" }], dependents: { binary: ["root", "cache"], root: ["cache"] } };
const defaults = { binary: "/usr/bin/tool", root: "~/.tool", cache: "~/.tool-cache" };
const draft = { binary: "/usr/bin/tool", root: "~/.tool", cache: "~/.tool-cache", name: "Work" };

// Moving the binary to another file name clears its dependents that still hold defaults.
const movedBinary = rules.applyEdit(draft, defaults, descriptor, "binary", "/opt/other");
assert.equal(movedBinary.root, "");
assert.equal(movedBinary.cache, "");
assert.equal(movedBinary.name, "Work", "fields without dependencies are kept");

// A binary with the same file name, in another folder, is not a move, so nothing is cleared.
const sameName = rules.applyEdit(draft, defaults, descriptor, "binary", "/opt/tool");
assert.equal(sameName.root, "~/.tool");
assert.equal(sameName.cache, "~/.tool-cache");

// A dependent the user already changed keeps its value.
const customRoot = rules.applyEdit(Object.assign({}, draft, { root: "/data/custom" }), defaults, descriptor, "binary", "/opt/other");
assert.equal(customRoot.root, "/data/custom");
assert.equal(customRoot.cache, "");

// Changing a root clears only its own dependents, and only when it moves away from its default.
const movedRoot = rules.applyEdit(draft, defaults, descriptor, "root", "/data/new");
assert.equal(movedRoot.cache, "");
assert.equal(movedRoot.binary, "/usr/bin/tool");
const defaultRoot = rules.applyEdit(Object.assign({}, draft, { root: "/data/new", cache: "/c" }), defaults, descriptor, "root", "~/.tool");
assert.equal(defaultRoot.cache, "/c", "returning to the default must not clear the cache");

// A field with no declaration never clears anything.
assert.equal(rules.applyEdit(draft, defaults, descriptor, "name", "Renamed").cache, "~/.tool-cache");
