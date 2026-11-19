// OpenWithRules.js - Choose the IDE that opens an item: the one that launched it last, then the source with the latest date,
.pragma library
// then the default IDE. An empty answer means the system default opens it.

// Return the chosen IDE identifier, considering only the IDEs that can open items right now.
function choose(entry, openableIds, defaultProviderId) {
    if (entry.lastIde && openableIds.includes(entry.lastIde)) return entry.lastIde;
    const sources = entry.sources.slice().sort(function (left, right) {
        return (Number(right.openedAt) || 0) - (Number(left.openedAt) || 0);
    });
    for (const source of sources) {
        if (openableIds.includes(source.id)) return source.id;
    }
    if (defaultProviderId && openableIds.includes(defaultProviderId)) return defaultProviderId;
    return "";
}
