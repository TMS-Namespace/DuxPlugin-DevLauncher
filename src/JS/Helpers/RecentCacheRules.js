// RecentCacheRules.js - Keep one cache entry per path, reconcile each source's answer into it, and order the entries by date.
// The saved usage map is the only store of launch counts; entries mirror it and never keep their own copy.
.pragma library
.import "AgeFilterRules.js" as AgeFilterRules
.import "Config.js" as Config

// The last path segment, which is the name shown for an item; a root shows its whole path.
function baseName(path) { return String(path).split("/").pop() || String(path); }

// Copy the saved launch activity of an entry's path from the usage map; a path the map no longer holds has none.
function applyUsage(entry, usage) {
    const activity = (usage || {})[entry.path] || {};
    entry.count = Number(activity.count) || 0;
    entry.launchedAt = Number(activity.recent) || 0;
    entry.lastIde = String(activity.ide || "");
    return entry;
}

// Build the entry for a path that no source has reported yet, starting from its saved launch activity.
function newEntry(path, kind, usage) {
    const entry = { path: path, name: baseName(path), kind: kind, sources: [], modifiedAt: 0, statAt: 0, date: 0, datedAt: 0, scannedAt: 0,
        count: 0, launchedAt: 0, lastIde: "" };
    return applyUsage(entry, usage);
}

// The latest date any source reported for an entry; a source that reported none contributes nothing.
function latestSourceDate(entry) {
    let latest = 0;
    for (const source of entry.sources) latest = Math.max(latest, Number(source.openedAt) || 0);
    return latest;
}

// The record shape the age rule reads: the latest source date, the file date, and the last launch.
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

// Record one source's date for an entry, keeping one record per source.
function setSource(entry, sourceId, sourceName, openedAt) {
    entry.sources = entry.sources.filter(function(source) { return source.id !== sourceId; });
    entry.sources.push({ id: sourceId, name: sourceName, openedAt: Number(openedAt) || 0 });
}

// Apply one successful answer from one source. Entries the source no longer reports lose that source, and an entry with no
// source left is removed. Reported entries keep their other sources and get the scan time. A failed answer must not reach here.
function reconcile(cache, sourceId, sourceName, items, usage, now) {
    const reported = {};
    for (const item of items || []) reported[item.path] = item;
    for (const path of Object.keys(cache)) {
        const entry = cache[path];
        if (reported[path] || !entry.sources.some(function(source) { return source.id === sourceId; })) continue;
        entry.sources = entry.sources.filter(function(source) { return source.id !== sourceId; });
        if (entry.sources.length === 0) delete cache[path];
        else refreshDate(entry, now, true);
    }
    for (const path of Object.keys(reported)) {
        const item = reported[path];
        const isNew = !Object.prototype.hasOwnProperty.call(cache, path);
        if (isNew) cache[path] = newEntry(path, item.kind, usage);
        const entry = cache[path];
        const latestBefore = latestSourceDate(entry);
        if (item.kind === "repository") entry.kind = "repository";
        setSource(entry, sourceId, sourceName, item.openedAt);
        entry.scannedAt = now;
        // A newer date from any source is applied at once; the threshold only delays recomputation when no date changed.
        refreshDate(entry, now, isNew || latestSourceDate(entry) !== latestBefore);
    }
    return cache;
}

// Drop the given sources, for example the IDEs and folders removed from settings, and recompute the dates they touched.
function dropSources(cache, sourceIds, now) {
    for (const path of Object.keys(cache)) {
        const entry = cache[path];
        const kept = entry.sources.filter(function(source) { return !sourceIds.includes(source.id); });
        if (kept.length === entry.sources.length) continue;
        entry.sources = kept;
        if (kept.length === 0) delete cache[path];
        else refreshDate(entry, now, true);
    }
    return cache;
}

// Record one launch after the usage map was updated: the entry takes the saved activity and its date is recomputed at once.
// An item the cache no longer holds has no source, so a launch never creates an entry for it.
function recordLaunch(cache, path, usage, now) {
    if (!Object.prototype.hasOwnProperty.call(cache, path)) return cache;
    applyUsage(cache[path], usage);
    refreshDate(cache[path], now, true);
    return cache;
}

// Make every entry show the saved launch activity. The usage map is trimmed to a bounded size, so an entry whose saved
// activity was trimmed shows none, and its date follows the change at once.
function syncUsage(cache, usage, now) {
    for (const path of Object.keys(cache)) {
        const entry = cache[path];
        const launchedBefore = entry.launchedAt;
        applyUsage(entry, usage);
        if (entry.launchedAt !== launchedBefore) refreshDate(entry, now, true);
    }
    return cache;
}

// Store the modification times read by a stat refresh; a path that did not answer is missing and is removed.
function applyModifiedTimes(cache, modifiedByPath, missingPaths, now) {
    for (const path of missingPaths || []) delete cache[path];
    for (const path of Object.keys(modifiedByPath || {})) {
        if (!Object.prototype.hasOwnProperty.call(cache, path)) continue;
        cache[path].modifiedAt = Number(modifiedByPath[path]) || 0;
        cache[path].statAt = now;
        refreshDate(cache[path], now, true);
    }
    return cache;
}

// The paths that have never been read for a modification time, or whose read is older than the threshold.
function stalePaths(cache, now) {
    return Object.keys(cache).filter(function(path) { return cache[path].statAt === 0 || now - cache[path].statAt >= Config.redateMilliseconds; });
}

// The entries ordered for searching: newest date first, then the most launches, then the path.
function sortEntries(cache) {
    return Object.keys(cache).map(function(path) { return cache[path]; }).sort(function(left, right) {
        if (right.date !== left.date) return right.date - left.date;
        if (right.count !== left.count) return right.count - left.count;
        return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
    });
}
