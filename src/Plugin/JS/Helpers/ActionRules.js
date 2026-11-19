// ActionRules.js - Describe result actions and format details for Dux surfaces.
.pragma library
.import "PathRules.js" as PathRules

// Offer each configured installation by alias and the appropriate desktop folder action.
function actions(item, providers) {
    if (!item || !item.path) return [];
    const remote = PathRules.resourceType(item.path) === "remote";
    const sources = Array.isArray(item.sourceProviders) ? item.sourceProviders : [];
    const choices = (providers || [])
        .filter(function (provider) {
            return !remote || sources.includes(provider.id);
        })
        .map(function (provider) {
            return { text: "Open with " + provider.name, icon: "code", operation: "provider", provider: provider.id };
        });
    if (remote)
        return choices.concat([
            { text: "Copy path", icon: "content_copy", operation: "copy" },
            { text: "Details", icon: "info", operation: "details" }
        ]);
    const isFolder = item.kind === "folder" || item.kind === "repository";
    return choices.concat([
        { text: "Open with system default", icon: "open_in_new", operation: "system" },
        {
            text: isFolder ? "Open folder" : "Open containing folder",
            icon: "folder_open",
            operation: "location",
            path: isFolder ? item.path : PathRules.parentDirectory(item.path)
        },
        { text: "Copy path", icon: "content_copy", operation: "copy" },
        { text: "Details", icon: "info", operation: "details" }
    ]);
}

// Format a valid UTC timestamp without letting damaged metadata break the details action.
function timestamp(value) {
    const milliseconds = Number(value);
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "Unavailable";
    const date = new Date(milliseconds);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "Unavailable";
}

// Show real file modification time separately from approximate IDE history recency.
function details(item, modifiedAt) {
    const sources = Array.isArray(item.sources) && item.sources.length ? item.sources.join(", ") : "Unknown";
    const modified = timestamp(modifiedAt);
    const providerHistoryDate = timestamp(item.openedAt);
    const recent = timestamp(item.recent);
    return (
        "Path: " +
        item.path +
        "\nSource: " +
        sources +
        "\nModified: " +
        modified +
        "\nProvider history date (approx.): " +
        providerHistoryDate +
        "\nLast recorded use (approx.): " +
        recent +
        "\nDev Launcher opens: " +
        (Number(item.count) || 0)
    );
}
