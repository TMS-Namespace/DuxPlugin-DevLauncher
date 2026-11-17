// LauncherRules.js - Rank unique launcher entries and select the launch provider.
.pragma library
.import "PathRules.js" as PathRules
.import "AgeFilterRules.js" as AgeFilterRules
.import "Config.js" as Config

// Merge path duplicates and apply saved launch activity.
function merge(records, usage) {
    const unique = {};
    const sourcesByPath = {};
    for (const record of records || []) {
        const path = PathRules.localPath(record.path);
        if (!path) continue;
        const source = record.kind === "repository" ? "Git repository scan" : String(record.providerName || "");
        if (!sourcesByPath[path]) sourcesByPath[path] = [];
        if (source && !sourcesByPath[path].includes(source)) sourcesByPath[path].push(source);
        const existing = unique[path];
        if (!existing || record.recent > existing.recent)
            unique[path] = Object.assign({}, record, { path: path });
        if (existing && (existing.kind === "repository" || record.kind === "repository"))
            unique[path].kind = "repository";
    }
    return Object.keys(unique).map(function(path) {
        const record = unique[path];
        const activity = usage && usage[path] || {};
        record.sources = sourcesByPath[path];
        record.recent = Math.max(Number(record.recent) || 0, Number(activity.recent) || 0);
        record.launchedAt = Number(activity.recent) || 0;
        record.count = Number(activity.count) || 0;
        return record;
    }).sort(function(left, right) {
        return right.recent - left.recent || right.count - left.count || left.path.localeCompare(right.path);
    });
}

// Rank by the same effective use date shown in the result subtitle.
function rank(records, now) {
    return (records || []).map(function(record) {
        const age = AgeFilterRules.itemAge(record, now);
        return Object.assign({}, record, { effectiveRecent: age.date, ageLabel: age.label });
    }).sort(function(left, right) {
        return right.effectiveRecent - left.effectiveRecent || right.count - left.count
            || right.recent - left.recent || left.path.localeCompare(right.path);
    });
}

// Filter by typed terms and select the source IDE or an explicit @IDE override.
function items(records, query, limit, providers, defaultProvider, eligible, searchPaths) {
    const words = String(query || "").trim().split(/\s+/).filter(Boolean);
    const override = words.find(function(word) { return word.startsWith("@"); });
    const selectedOverride = override ? providers.find(function(provider) { return provider.name.toLowerCase().replace(/[^a-z0-9]/g, "") === override.slice(1).toLowerCase().replace(/[^a-z0-9]/g, ""); }) : null;
    if (override && !selectedOverride) return [];
    const phrase = words.filter(function(word) { return word !== override; }).join(" ").toLowerCase();
    const matches = (records || []).filter(function(record) {
        const name = String(record.path).split("/").pop();
        const haystack = searchPaths ? String(record.path).toLowerCase() : name.toLowerCase();
        return haystack.includes(phrase);
    });
    const visible = [];
    for (const record of matches) {
        if (eligible && !eligible(record)) continue;
        visible.push(record);
        if (visible.length >= limit) break;
    }
    return visible.map(function(record, index) {
        const selected = selectedOverride || providers.find(function(provider) { return provider.id === record.provider; }) || providers.find(function(provider) { return provider.id === defaultProvider; }) || null;
        const providerId = selected ? selected.id : "";
        return { id: record.path, name: record.path.split("/").pop() || record.path, kind: record.kind, comment: record.path, action: "open:" + record.path, path: record.path, provider: providerId, sourceProvider: record.provider || "", sources: record.sources || [], recent: record.effectiveRecent !== undefined ? record.effectiveRecent : record.recent, ageLabel: record.ageLabel || "", openedAt: record.openedAt || 0, count: record.count, categories: ["Dev Launcher"], _preScored: Config.launcherInitialScore - index };
    }).filter(Boolean);
}

// Keep a bounded usage map with UTC launch timestamps.
function recordLaunch(usage, path, now, limit) {
    const updated = Object.assign({}, usage || {});
    const previous = updated[path] || {};
    updated[path] = { count: (Number(previous.count) || 0) + 1, recent: now };
    const paths = Object.keys(updated).sort(function(left, right) { return updated[right].recent - updated[left].recent; });
    for (const oldPath of paths.slice(limit)) delete updated[oldPath];
    return updated;
}
