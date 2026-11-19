// RecentCacheRules.js - Keep one cache entry per path, reconcile each source's answer into it, and order the entries by date.
.pragma library
.import "PathRules.js" as PathRules
.import "RecentCacheDates.js" as Dates
.import "RecentCacheUsage.js" as Usage
// Rules: Pure cache reconciliation: changes only the cache object it is given; no I/O, QML types or logging.
// The saved usage map is the only store of launch counts; entries mirror it and never keep their own copy.

// The last path segment, which is the name shown for an item; a root shows its whole path.
function baseName(path) {
    const name = String(path).split("/").pop() || String(path);
    try {
        return PathRules.resourceType(path) === "remote" ? decodeURIComponent(name) : name;
    } catch (error) {
        return name;
    }
}

// Build the entry for a path that no source has reported yet, starting from its saved launch activity.
function newEntry(path, kind, usage) {
    const entry = {
        path: path,
        name: baseName(path),
        kind: kind,
        sources: [],
        modifiedAt: 0,
        statAt: 0,
        date: 0,
        datedAt: 0,
        scannedAt: 0,
        count: 0,
        launchedAt: 0,
        lastIde: ""
    };
    return Usage.applyUsage(entry, usage);
}

// Record one source's date for an entry, keeping one record per source.
function setSource(entry, sourceId, sourceName, openedAt) {
    entry.sources = entry.sources.filter(function (source) {
        return source.id !== sourceId;
    });
    entry.sources.push({ id: sourceId, name: sourceName, openedAt: Number(openedAt) || 0 });
}

// Apply one successful answer from one source. Entries the source no longer reports lose that source, and an entry with no
// source left is removed. Reported entries keep their other sources and get the scan time. A failed answer must not reach here.
function reconcile(cache, sourceId, sourceName, items, usage, now) {
    const reported = {};
    for (const item of items || []) {
        const path = PathRules.resourcePath(item.path);
        if (path) reported[path] = Object.assign({}, item, { path: path });
    }
    for (const path of Object.keys(cache)) {
        const entry = cache[path];
        if (
            reported[path] ||
            !entry.sources.some(function (source) {
                return source.id === sourceId;
            })
        )
            continue;
        entry.sources = entry.sources.filter(function (source) {
            return source.id !== sourceId;
        });
        if (entry.sources.length === 0) delete cache[path];
        else Dates.refreshDate(entry, now, true);
    }
    for (const path of Object.keys(reported)) {
        const item = reported[path];
        const isNew = !Object.prototype.hasOwnProperty.call(cache, path);
        if (isNew) cache[path] = newEntry(path, item.kind, usage);
        const entry = cache[path];
        const latestBefore = Dates.latestSourceDate(entry);
        if (item.kind === "repository") entry.kind = "repository";
        setSource(entry, sourceId, sourceName, item.openedAt);
        entry.scannedAt = now;
        // A newer date from any source is applied at once; the threshold only delays recomputation when no date changed.
        Dates.refreshDate(entry, now, isNew || Dates.latestSourceDate(entry) !== latestBefore);
    }
    return cache;
}

// Drop the given sources, for example the IDEs and folders removed from settings, and recompute the dates they touched.
function dropSources(cache, sourceIds, now) {
    for (const path of Object.keys(cache)) {
        const entry = cache[path];
        const kept = entry.sources.filter(function (source) {
            return !sourceIds.includes(source.id);
        });
        if (kept.length === entry.sources.length) continue;
        entry.sources = kept;
        if (kept.length === 0) delete cache[path];
        else Dates.refreshDate(entry, now, true);
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
        Dates.refreshDate(cache[path], now, true);
    }
    return cache;
}
