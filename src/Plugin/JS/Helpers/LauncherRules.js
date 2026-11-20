// LauncherRules.js - Filter the ordered cache for one query and present each entry as a launcher item.
.pragma library
.import "AgeFilterRules.js" as AgeFilterRules
.import "Constants.js" as Constants
.import "OpenWithRules.js" as OpenWithRules
.import "RecentCacheDates.js" as RecentCacheDates
.import "PathRules.js" as PathRules
// Rules: Pure filtering and presentation: keeps the cache order and never sorts it; no QML types or logging.

// Keep only the entries that match the typed terms and the age cutoff, stop at the limit, and present each one.
// The entries arrive already ordered by date, so the first matches are the newest ones; nothing is sorted here.
function items(entries, query, options) {
    const words = String(query || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const override = words.find(function (word) {
        return word.startsWith("@");
    });
    const selectedOverride = override
        ? options.providers.find(function (provider) {
              return (
                  provider.name.toLowerCase().replace(/[^a-z0-9]/g, "") ===
                  override
                      .slice(1)
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "")
              );
          })
        : null;
    if (override && !selectedOverride) return [];
    const phrase = words
        .filter(function (word) {
            return word !== override;
        })
        .join(" ")
        .toLowerCase();
    const openableIds = options.providers.map(function (provider) {
        return provider.id;
    });
    const visible = [];
    for (const entry of entries) {
        const haystack = options.searchPaths ? entry.path.toLowerCase() : entry.name.toLowerCase();
        if (!haystack.includes(phrase)) continue;
        const remote = PathRules.resourceType(entry.path) === "remote";
        if (!remote && AgeFilterRules.olderThan(entry.date, options.cutoff)) continue;
        if (
            remote &&
            !entry.sources.some(function (source) {
                return openableIds.includes(source.id) && (!selectedOverride || selectedOverride.id === source.id);
            })
        )
            continue;
        visible.push(entry);
        if (visible.length >= options.limit) break;
    }
    return visible.map(function (entry, index) {
        const reporting = entry.sources
            .filter(function (source) {
                return openableIds.includes(source.id);
            })
            .map(function (source) {
                return source.id;
            });
        const eligible = PathRules.resourceType(entry.path) === "remote" ? reporting : openableIds;
        const chosenId = selectedOverride
            ? selectedOverride.id
            : OpenWithRules.choose(entry, eligible, options.defaultProvider);
        const age = AgeFilterRules.itemAge({ modifiedAt: entry.date }, options.now);
        return {
            id: entry.path,
            name: entry.name,
            kind: entry.kind,
            comment: entry.path,
            action: "open:" + entry.path,
            path: entry.path,
            provider: chosenId,
            sourceProviders: reporting,
            sourceProvider: reporting[0] || "",
            sources: entry.sources.map(function (source) {
                return source.name;
            }),
            recent: entry.date,
            ageLabel: age.label,
            openedAt: RecentCacheDates.latestSourceDate(entry),
            count: entry.count,
            primaryAction: { name: "Launch", icon: "rocket_launch", action: "execute" },
            categories: ["Dev Launcher"],
            _preScored: Constants.launcherInitialScore - index
        };
    });
}

// Keep a bounded usage map of launch counts, the last launch time, and the IDE that launched the item.
function recordLaunch(usage, path, ideId, now, limit) {
    const updated = Object.assign({}, usage || {});
    const previous = updated[path] || {};
    updated[path] = { count: (Number(previous.count) || 0) + 1, recent: now, ide: String(ideId || "") };
    const paths = Object.keys(updated).sort(function (left, right) {
        return updated[right].recent - updated[left].recent;
    });
    for (const oldPath of paths.slice(limit)) delete updated[oldPath];
    return updated;
}
