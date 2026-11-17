// ArgumentRules.test.js - Check provider switch input.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const argumentsRules = source("Helpers/ArgumentRules.js");
const config = source("Helpers/Config.js");
assert.deepEqual(Array.from(argumentsRules.validate(["--profile", "Work Space"])), ["--profile", "Work Space"]);
assert.throws(() => argumentsRules.validate("--reuse-window"));
assert.throws(() => argumentsRules.validate([""]));
assert.throws(() => argumentsRules.validate([" "]));
assert.equal(argumentsRules.validate(Array(config.maxAdditionalArguments).fill("--flag")).length, config.maxAdditionalArguments);
assert.throws(() => argumentsRules.validate(Array(config.maxAdditionalArguments + 1).fill("--flag")));
assert.equal(argumentsRules.validate(["x".repeat(config.maxAdditionalArgumentLength)])[0].length, config.maxAdditionalArgumentLength);
assert.throws(() => argumentsRules.validate(["x".repeat(config.maxAdditionalArgumentLength + 1)]));
