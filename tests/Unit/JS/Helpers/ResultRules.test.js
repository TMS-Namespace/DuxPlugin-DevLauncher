// ResultRules.test.js - Check the result-count choices.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const resultRules = source("Helpers/ResultRules.js");
assert.equal(resultRules.limit(undefined), 100);
assert.equal(resultRules.limit("25"), 25);
assert.equal(resultRules.valid("150"), true);
assert.equal(resultRules.valid("30"), false);
assert.equal(resultRules.valid("501"), false);
assert.equal(resultRules.valid("3.5"), false);
