// RecentCacheDates.js - Compute an entry's display date from the dates its sources reported and its launches.
.pragma library
.import "AgeFilterRules.js" as AgeFilterRules
.import "Config.js" as Config
// Rules: Pure date arithmetic: returns new values and changes only the entry it is given; no I/O, QML types or logging.

// The latest date any source reported for an entry; a source that reported none contributes nothing.
function latestSourceDate(entry) {
    let latest = 0;
    for (const source of entry.sources) latest = Math.max(latest, Number(source.openedAt) || 0);
    return latest;
}

function ageRecord(entry) {
    return { openedAt: latestSourceDate(entry), modifiedAt: entry.modifiedAt, launchedAt: entry.launchedAt };
}

// Recompute the entry's date when it was never computed, when forced, or when the last computation is older than the threshold.
function refreshDate(entry, now, forced) {
    if (forced || entry.datedAt === 0 || now - entry.datedAt >= Config.redateMilliseconds) {
        entry.date = AgeFilterRules.itemAge(ageRecord(entry), now).date;
        entry.datedAt = now;
    }
    return entry;
}
