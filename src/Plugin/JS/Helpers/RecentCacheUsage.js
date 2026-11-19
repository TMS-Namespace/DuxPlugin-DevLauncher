// RecentCacheUsage.js - Show the saved launch activity on cache entries, and record launches and trims in the cache.
.pragma library
.import "RecentCacheDates.js" as Dates
// Rules: Pure cache updates: changes only the cache object it is given; no I/O, QML types or logging.

// Copy the saved launch activity of an entry's path from the usage map; a path the map no longer holds has none.
function applyUsage(entry, usage) {
    const activity = (usage || {})[entry.path] || {};
    entry.count = Number(activity.count) || 0;
    entry.launchedAt = Number(activity.recent) || 0;
    entry.lastIde = String(activity.ide || "");
    return entry;
}

// Record one launch after the usage map was updated: the entry takes the saved activity and its date is recomputed at once.
// An item the cache no longer holds has no source, so a launch never creates an entry for it.
function recordLaunch(cache, path, usage, now) {
    if (!Object.prototype.hasOwnProperty.call(cache, path)) return cache;
    applyUsage(cache[path], usage);
    Dates.refreshDate(cache[path], now, true);
    return cache;
}

// Make every entry show the saved launch activity. The usage map is trimmed to a bounded size, so an entry whose saved
// activity was trimmed shows none, and its date follows the change at once.
function syncUsage(cache, usage, now) {
    for (const path of Object.keys(cache)) {
        const entry = cache[path];
        const launchedBefore = entry.launchedAt;
        applyUsage(entry, usage);
        if (entry.launchedAt !== launchedBefore) Dates.refreshDate(entry, now, true);
    }
    return cache;
}
