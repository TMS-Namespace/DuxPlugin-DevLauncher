// CacheRules.js - Bound a cache object by dropping its oldest entries in place.
.pragma library

// Remove the first `excess` keys of a cache, which are its oldest entries, and return how many were removed.
// Keys are read in insertion order, so the cache is trimmed without making a copy of it.
function evictOldest(cache, excess) {
    let removed = 0;
    for (const key in cache) {
        if (removed >= excess) break;
        delete cache[key];
        removed++;
    }
    return removed;
}
