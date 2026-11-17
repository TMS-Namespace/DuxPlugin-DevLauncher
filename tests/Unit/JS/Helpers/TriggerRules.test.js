// TriggerRules.test.js - Check launcher trigger limits and conflicts.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const triggers = source("Helpers/TriggerRules.js");
assert.equal(triggers.error("ab", "devLauncher", {}, {}), "");
assert.equal(triggers.error("`", "devLauncher", { "`": "devLauncher" }, {}), "");
assert.match(triggers.error("abcdeF", "devLauncher", {}, {}), /1 to 5/);
assert.match(triggers.error("ab2", "devLauncher", {}, {}), /no numbers/);
assert.match(triggers.error("a b", "devLauncher", {}, {}), /no numbers or spaces/);
assert.match(triggers.error("²", "devLauncher", {}, {}), /no numbers/);
assert.match(triggers.error("!", "devLauncher", { "!": "anotherPlugin" }, {}), /another launcher plugin/);
assert.match(triggers.error("?", "devLauncher", {}, { "?": "calculator" }), /built-in launcher plugin/);
