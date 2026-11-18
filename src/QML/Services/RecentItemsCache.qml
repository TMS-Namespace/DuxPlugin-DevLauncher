// RecentItemsCache.qml - The cache of recent items, shared by the scan and the launcher: one entry per path, kept ordered for searching.
// The scan changes the entries and orders them once when it finishes; a search only reads the ordered list.
pragma Singleton
import QtQml
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/LauncherRules.js" as LauncherRules
import "../../JS/Helpers/RecentCacheRules.js" as RecentCacheRules

QtObject {
    id: root
    // The entries by path, changed in place. The ordered list is rebuilt only by commit().
    property var entries: ({})
    property var ordered: []
    // The saved launch counts, loaded once when the plugin starts. This map is the only stored source of launch activity.
    property var usage: ({})
    property bool started: false
    // Counts how often the list was ordered, so a check can show that searching never orders it again.
    property int sortCount: 0
    signal changed()

    // Load the saved launch counts once the plugin's storage is attached.
    function start() {
        if (started || !DataStorage.pluginService) return;
        usage = DataStorage.load("usage", {});
        started = true;
    }

    // Apply one source's answer. A failed answer leaves that source's entries as they are.
    function reconcileSource(sourceId, sourceName, items, succeeded, now) {
        if (!succeeded) return;
        RecentCacheRules.reconcile(entries, sourceId, sourceName, items, usage, now);
    }

    // Remove the given sources, such as an IDE or folder removed from settings, so their items disappear at once.
    function dropSources(sourceIds, now) {
        RecentCacheRules.dropSources(entries, sourceIds, now);
    }

    // Make the entries show the saved launch activity, order them once, and tell the launcher that the list changed.
    function commit() {
        RecentCacheRules.syncUsage(entries, usage, Date.now());
        ordered = RecentCacheRules.sortEntries(entries);
        sortCount++;
        changed();
    }

    // Record one launch: update the saved counts first, save them, then let the entry take them and move to its new place.
    function recordLaunch(path, ideId, now) {
        usage = LauncherRules.recordLaunch(usage, path, ideId, now, Config.maxUsageEntries);
        RecentCacheRules.recordLaunch(entries, path, usage, now);
        if (DataStorage.save("usage", usage) !== true)
            ErrorHandler.report("launch", "Could not save launch history.");
        commit();
    }

    // The paths whose modification time must be read again.
    function stalePaths(now) {
        return RecentCacheRules.stalePaths(entries, now);
    }

    // Store read times and remove confirmed missing paths; a scan defers publication until its final snapshot.
    function applyModifiedTimes(modifiedByPath, missingPaths, now, publish) {
        RecentCacheRules.applyModifiedTimes(entries, modifiedByPath, missingPaths, now);
        if (publish !== false) commit();
    }
}
