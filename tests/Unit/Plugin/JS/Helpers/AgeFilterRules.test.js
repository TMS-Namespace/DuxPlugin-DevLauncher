// AgeFilterRules.test.js - Check shared effective dates, cutoff, and labels.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const ageFilter = source("Helpers/AgeFilterRules.js");
assert.equal(ageFilter.itemAge({}, 10000000).label, "");
assert.equal(ageFilter.itemAge({ modifiedAt: 10000000 - 2 * 3600000 }, 10000000).label, "2h ago");
assert.equal(ageFilter.itemAge({ modifiedAt: 10000000000 - 2 * 7 * 86400000 }, 10000000000).label, "2w ago");
const ageUnits = source("Contracts/AgeUnit.js");
assert.deepEqual(Array.from(ageUnits.values), ["days", "weeks", "months", "years"]);
assert.deepEqual({ ...ageFilter.normalize(null) }, { value: 3, unit: "months" });
assert.deepEqual({ ...ageFilter.normalize({ value: null, unit: "bogus" }) }, { value: 3, unit: "months" });
assert.deepEqual({ ...ageFilter.normalize({ value: "2", unit: "weeks" }) }, { value: 2, unit: "weeks" });
assert.deepEqual({ ...ageFilter.normalize({ value: 0, unit: "weeks" }) }, { value: 3, unit: "weeks" });
const now = Date.UTC(2026, 4, 31, 12);
assert.equal(ageFilter.cutoff({ value: 3, unit: "months" }, now), Date.UTC(2026, 1, 28, 12));
assert.equal(ageFilter.cutoff({ value: 1, unit: "years" }, now), Date.UTC(2025, 4, 31, 12));
assert.equal(ageFilter.cutoff({ value: 2, unit: "weeks" }, now), now - 14 * 86400000);
assert.equal(ageFilter.cutoff({ value: 5, unit: "days" }, now), now - 5 * 86400000);
assert.equal(ageFilter.cutoff({ value: 0, unit: "days" }, now), now - 3 * 86400000);
assert.equal(ageFilter.olderThan(Date.UTC(2026, 1, 27, 12), ageFilter.cutoff({ value: 3, unit: "months" }, now)), true);
assert.equal(
    ageFilter.olderThan(Date.UTC(2026, 1, 28, 12), ageFilter.cutoff({ value: 3, unit: "months" }, now)),
    false
);
assert.equal(ageFilter.olderThan(0, now), false);
assert.equal(ageFilter.itemAge({ modifiedAt: now, openedAt: now - 7 * 86400000 }, now).date, now - 7 * 86400000);
assert.equal(ageFilter.itemAge({ modifiedAt: now - 7 * 86400000, openedAt: now }, now).date, now - 7 * 86400000);
assert.equal(ageFilter.itemAge({ modifiedAt: 0, openedAt: now }, now).date, now);
assert.equal(ageFilter.itemAge({ modifiedAt: now, openedAt: 0 }, now).date, now);
assert.equal(ageFilter.itemAge({ modifiedAt: 0, openedAt: 0 }, now).date, 0);
assert.deepEqual(
    { ...ageFilter.itemAge({ modifiedAt: now - 7 * 86400000, openedAt: now, launchedAt: now }, now) },
    { date: now, label: "just now" }
);
const calendarNow = Date.UTC(2026, 10, 17, 12);
const calendarLimit = ageFilter.cutoff({ value: 3, unit: "months" }, calendarNow);
assert.equal(ageFilter.olderThan(calendarLimit, calendarLimit), false);
assert.equal(ageFilter.itemAge({ modifiedAt: calendarLimit }, calendarNow).label, "3mo ago");
assert.equal(ageFilter.itemAge({ modifiedAt: Date.UTC(2026, 7, 18, 12) }, calendarNow).label, "2mo ago");
assert.equal(ageFilter.itemAge({ modifiedAt: Date.UTC(2026, 9, 17, 12) }, calendarNow).label, "1mo ago");
assert.equal(ageFilter.itemAge({ modifiedAt: Date.UTC(2026, 9, 18, 12) }, calendarNow).label, "4w ago");
