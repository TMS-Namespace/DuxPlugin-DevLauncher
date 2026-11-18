// CacheRules.test.js - Check that a cache is trimmed by evicting its oldest entries, in place.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const cacheRules = source("Helpers/CacheRules.js");

// The first keys in insertion order are removed, and the rest keep their values.
const cache = { a: 1, b: 2, c: 3, d: 4 };
assert.equal(cacheRules.evictOldest(cache, 2), 2);
assert.deepEqual(Object.keys(cache), ["c", "d"]);
assert.equal(cache.c, 3);

// Nothing is removed when no excess is requested, and asking for more than exists removes what is there.
assert.equal(cacheRules.evictOldest(cache, 0), 0);
assert.equal(cacheRules.evictOldest(cache, 10), 2);
assert.deepEqual(Object.keys(cache), []);

// The object is changed in place, so a caller holding the same reference sees the trimmed cache.
const shared = { x: 1, y: 2 };
const alias = shared;
cacheRules.evictOldest(shared, 1);
assert.equal(alias, shared);
assert.deepEqual(Object.keys(alias), ["y"]);
