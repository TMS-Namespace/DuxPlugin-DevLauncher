// RecentCacheRules.test.js - Check reconciliation of source answers, dates, launches, stat refreshes, and ordering.
// Rules: Runs in plain node; source answers must reconcile without duplicating entries, and dates are recomputed only past the threshold.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const cache = source("Helpers/RecentCacheRules.js");
const config = source("Helpers/Config.js");
const day = 86400000;
const now = Date.UTC(2026, 10, 17, 12);
const ide = "4c8620ac-08b2-4f28-bcd7-cbe29a37b597";
const folder = "7b65f5c6-7284-47cf-9ce2-9a4a71a16571";

// A source's answer creates one entry per path, dated from that source's history bound at once.
let store = cache.reconcile({}, ide, "Code", [{ path: "/tmp/a.js", kind: "file", openedAt: now - 2 * day }], {}, now);
assert.equal(store["/tmp/a.js"].name, "a.js");
assert.equal(store["/tmp/a.js"].date, now - 2 * day);
assert.equal(store["/tmp/a.js"].sources[0].name, "Code");

// Two sources of one path keep one entry, and its date is the latest date any source reported.
store = cache.reconcile(store, folder, "Folder 7b65f5", [{ path: "/tmp/a.js", kind: "repository", openedAt: 0 }], {}, now);
assert.equal(store["/tmp/a.js"].sources.length, 2);
assert.equal(store["/tmp/a.js"].kind, "repository");
assert.equal(store["/tmp/a.js"].date, now - 2 * day);

// A source that stops reporting a path loses it; the entry stays while another source still reports it.
store = cache.reconcile(store, ide, "Code", [], {}, now + 1000);
assert.equal(store["/tmp/a.js"].sources.length, 1);
assert.equal(store["/tmp/a.js"].sources[0].id, folder);
store = cache.reconcile(store, folder, "Folder 7b65f5", [], {}, now + 2000);
assert.equal(Object.keys(store).length, 0, "an entry with no source left is removed");

// Dates older than the threshold are recomputed; newer ones are kept, so a scan does not repeat the date work.
store = cache.reconcile({}, ide, "Code", [{ path: "/tmp/b.js", kind: "file", openedAt: now - day }], {}, now);
const datedAt = store["/tmp/b.js"].datedAt;
store = cache.reconcile(store, ide, "Code", [{ path: "/tmp/b.js", kind: "file", openedAt: now - day }], {}, now + config.redateMilliseconds - 1);
assert.equal(store["/tmp/b.js"].datedAt, datedAt, "a date inside the threshold is not recomputed");
assert.equal(store["/tmp/b.js"].date, now - day);
store = cache.reconcile(store, ide, "Code", [{ path: "/tmp/b.js", kind: "file", openedAt: now - 3 * day }], {}, now + config.redateMilliseconds);
assert.equal(store["/tmp/b.js"].date, now - 3 * day, "a date past the threshold is recomputed");

// A newer date reported by a source is applied at once, even inside the threshold.
const newer = cache.reconcile({}, ide, "Code", [{ path: "/tmp/i.js", kind: "file", openedAt: now - 5 * day }], {}, now);
const newerStore = cache.reconcile(newer, ide, "Code", [{ path: "/tmp/i.js", kind: "file", openedAt: now - day }], {}, now + 30000);
assert.equal(newerStore["/tmp/i.js"].date, now - day, "a newer source date inside the threshold is applied at once");

// A launch is recorded in the usage map first; the entry then takes the saved activity and moves to the time of the launch.
const launched = { "/tmp/b.js": { count: 1, recent: now + 5 * day, ide: ide } };
store = cache.recordLaunch(store, "/tmp/b.js", launched, now + 5 * day);
assert.equal(store["/tmp/b.js"].count, 1);
assert.equal(store["/tmp/b.js"].lastIde, ide);
assert.equal(store["/tmp/b.js"].date, now + 5 * day);

// The usage map is the only store: an entry whose saved activity was trimmed shows none after the next sync.
store = cache.syncUsage(store, {}, now + 6 * day);
assert.equal(store["/tmp/b.js"].count, 0);
assert.equal(store["/tmp/b.js"].lastIde, "");

// A launch of an item the cache no longer holds never creates an entry without a source.
assert.equal(cache.recordLaunch({}, "/tmp/gone.js", launched, now)["/tmp/gone.js"], undefined);

// Saved launch counts apply to an entry when its first source reports it.
const restored = cache.reconcile({}, ide, "Code", [{ path: "/tmp/c.js", kind: "file", openedAt: now - day }], { "/tmp/c.js": { count: 4, recent: now - 2 * day, ide: folder } }, now);
assert.equal(restored["/tmp/c.js"].count, 4);
assert.equal(restored["/tmp/c.js"].lastIde, folder);
assert.equal(restored["/tmp/c.js"].date, now - day, "the launch time is older than the source date, so the source date stays");

// A stat refresh sets the modification time; the earlier of the file date and the source date is the date.
store = cache.reconcile({}, ide, "Code", [{ path: "/tmp/d.js", kind: "file", openedAt: now - day }], {}, now);
store = cache.applyModifiedTimes(store, { "/tmp/d.js": now - 10 * day }, [], now + config.redateMilliseconds);
assert.equal(store["/tmp/d.js"].modifiedAt, now - 10 * day);
assert.equal(store["/tmp/d.js"].date, now - 10 * day, "the older file date caps the source date");
assert.ok(store["/tmp/d.js"].statAt > 0);

// A path that did not answer the stat is missing and is removed.
store = cache.applyModifiedTimes(store, {}, ["/tmp/d.js"], now + 2 * config.redateMilliseconds);
assert.equal(store["/tmp/d.js"], undefined);

// Only paths never read, or read longer ago than the threshold, need a stat.
store = cache.reconcile({}, ide, "Code", [{ path: "/tmp/e.js", kind: "file", openedAt: now }, { path: "/tmp/f.js", kind: "file", openedAt: now }], {}, now);
store["/tmp/f.js"].statAt = now;
assert.deepEqual(Array.from(cache.stalePaths(store, now)), ["/tmp/e.js"]);
assert.deepEqual(Array.from(cache.stalePaths(store, now + config.redateMilliseconds)), ["/tmp/e.js", "/tmp/f.js"]);

// Dropping a removed source takes its items out, and keeps the others.
store = cache.reconcile({}, ide, "Code", [{ path: "/tmp/g.js", kind: "file", openedAt: now }], {}, now);
store = cache.reconcile(store, folder, "Folder", [{ path: "/tmp/g.js", kind: "repository", openedAt: 0 }, { path: "/tmp/h.js", kind: "repository", openedAt: 0 }], {}, now);
store = cache.dropSources(store, [ide], now);
assert.deepEqual(Array.from(Object.keys(store).sort()), ["/tmp/g.js", "/tmp/h.js"]);
assert.equal(store["/tmp/g.js"].sources.length, 1);

// Ordering: newest date first, then the most launches, then the path; the cache is ordered once, never when searched.
const ordered = cache.sortEntries({
    "/tmp/old.js": { path: "/tmp/old.js", date: now - 9 * day, count: 50 },
    "/tmp/new-few.js": { path: "/tmp/new-few.js", date: now, count: 1 },
    "/tmp/new-many.js": { path: "/tmp/new-many.js", date: now, count: 7 },
    "/tmp/new-b.js": { path: "/tmp/new-b.js", date: now, count: 7 }
});
assert.deepEqual(Array.from(ordered, entry => entry.path), ["/tmp/new-b.js", "/tmp/new-many.js", "/tmp/new-few.js", "/tmp/old.js"]);

// The cache keeps only its newest entries up to the bound, and removes the rest from the cache itself.
const bounded = {
    "/tmp/x1.js": { path: "/tmp/x1.js", date: now, count: 0 },
    "/tmp/x2.js": { path: "/tmp/x2.js", date: now - day, count: 0 },
    "/tmp/x3.js": { path: "/tmp/x3.js", date: now - 2 * day, count: 0 }
};
const keptEntries = cache.orderAndBound(bounded, 2);
assert.deepEqual(Array.from(keptEntries, entry => entry.path), ["/tmp/x1.js", "/tmp/x2.js"]);
assert.equal(bounded["/tmp/x3.js"], undefined, "an entry beyond the bound is removed from the cache");
assert.equal(Object.keys(bounded).length, 2);
