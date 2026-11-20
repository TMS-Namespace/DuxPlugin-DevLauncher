// RecentCacheOrdering.js - Order cache entries for searching, bound the cache, and list the paths that need a fresh stat read.
.pragma library
.import "Constants.js" as Constants
.import "PathRules.js" as PathRules
// Rules: Pure ordering and bounding: changes only the cache object it is given; no I/O, QML types or logging.

// The entries ordered for searching: newest date first, then the most launches, then the path.
function sortEntries(cache) {
    return Object.keys(cache)
        .map(function (path) {
            return cache[path];
        })
        .sort(function (left, right) {
            if (right.date !== left.date) return right.date - left.date;
            if (right.count !== left.count) return right.count - left.count;
            return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
        });
}

// Order the entries, then remove every entry beyond the bound from the cache itself. The cache keeps only its newest
// entries, so it never grows without limit; a removed entry comes back with the next scan that reports it.
function orderAndBound(cache, bound) {
    const ordered = sortEntries(cache);
    for (const entry of ordered.slice(bound)) delete cache[entry.path];
    return ordered.slice(0, bound);
}

// The paths that have never been read for a modification time, or whose read is older than the threshold.
function stalePaths(cache, now) {
    return Object.keys(cache).filter(function (path) {
        return (
            PathRules.resourceType(path) !== "remote" &&
            (cache[path].statAt === 0 || now - cache[path].statAt >= Constants.redateMilliseconds)
        );
    });
}
