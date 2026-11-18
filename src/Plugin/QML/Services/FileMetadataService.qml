// FileMetadataService.qml - Verify result paths and cache Dux file metadata by path and type.
pragma Singleton
import QtQuick
import QtQml
import qs.DCommon.Common
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/FileMetadataRules.js" as FileMetadataRules
import "../../JS/Helpers/FileStatusRules.js" as FileStatusRules
import "../../JS/Helpers/CacheRules.js" as CacheRules

QtObject {
    id: root
    property var cache: ({})
    property var pathCache: ({})
    property var pending: ({})
    property var wanted: ({})
    property var queue: []
    property int activeLookups: 0
    property int connectionChecks: 0
    // Entry counts kept beside the caches, so trimming never has to count keys.
    property int pathCount: 0
    property int iconCount: 0
    property Component timeoutType: Component { Timer { repeat: false } }
    signal metadataChanged()

    // Verify displayed paths while sharing icons by type. Redraws may load new paths but cannot retry cached ones.
    function request(items, refreshCached) {
        const visible = {};
        for (const item of items.slice(0, Config.maxResults)) visible[item.path] = true;
        wanted = visible;
        const remaining = [];
        for (const task of queue) {
            if (visible[task.path]) remaining.push(task);
            else delete pending[task.path];
        }
        queue = remaining;
        if (!Host.files || !Host.files.connected || typeof Host.files.stat !== "function") {
            if (!connectionTimer.running && connectionChecks < Config.maxFileServiceReconnectAttempts) connectionTimer.start();
            return;
        }
        connectionChecks = 0;
        const now = Date.now();
        for (const item of items.slice(0, Config.maxResults)) {
            const path = item.path;
            if ((pathCache[path] && (refreshCached === false || pathCache[path].expiresAt > now)) || pending[path] || queue.length + activeLookups >= Config.maxIconQueue) continue;
            pending[path] = true;
            queue = queue.concat([{ path: path, kind: item.kind }]);
        }
        startNext();
    }

    // Query a few paths at a time and publish confirmed missing paths.
    function startNext() {
        if (!Host.files || !Host.files.connected) return;
        while (activeLookups < Config.maxIconLookups && queue.length) {
            const task = queue.shift();
            const path = task.path;
            const key = FileMetadataRules.cacheKey(path, task.kind);
            activeLookups++;
            let settled = false;
            const timeout = timeoutType.createObject(root, { "interval": Config.iconLookupTimeoutMilliseconds });
            // A missing backend answer must not occupy a queue slot forever.
            function complete(result) {
                if (settled) return;
                settled = true;
                timeout.stop();
                timeout.destroy();
                activeLookups = Math.max(0, activeLookups - 1);
                delete pending[path];
                const entry = result && !result.error ? (result.entry || result) : null;
                const isMissing = FileStatusRules.missing(result);
                const now = Date.now();
                // The cache is updated in place and trimmed by evicting its oldest entries, so no copy is made per lookup.
                const isNewPath = !Object.prototype.hasOwnProperty.call(pathCache, path);
                pathCache[path] = { exists: !isMissing, modifiedAt: entry ? Number(entry.mtimeMs) || 0 : 0, expiresAt: now + (isMissing ? Config.missingPathRetryMilliseconds : entry ? Config.iconCacheMilliseconds : Config.iconLookupTimeoutMilliseconds) };
                if (isNewPath) pathCount++;
                if (pathCount > Config.maxMetadataEntries) pathCount -= CacheRules.evictOldest(pathCache, pathCount - Config.maxMetadataEntries);
                if (entry) {
                    const iconName = String(entry.iconName || "");
                    if (!cache[key] || cache[key].expiresAt <= now) {
                        const isNewIcon = !Object.prototype.hasOwnProperty.call(cache, key);
                        cache[key] = { iconName: iconName, expiresAt: now + (iconName ? Config.iconCacheMilliseconds : Config.iconLookupTimeoutMilliseconds) };
                        if (isNewIcon) iconCount++;
                        if (iconCount > Config.maxIconEntries) iconCount -= CacheRules.evictOldest(cache, iconCount - Config.maxIconEntries);
                    }
                }
                if (wanted[path]) refreshTimer.restart();
                startNext();
            }
            timeout.triggered.connect(function() { complete({ "error": "timeout" }); });
            timeout.start();
            try { Host.files.stat(path, complete); }
            catch (caughtError) {
                // An unavailable host file service leaves the item usable with its fallback icon.
                Logger.error("metadata", "Could not read file metadata: " + String(caughtError));
                complete({ "error": "unavailable" });
            }
        }
    }

    // Return a cached icon name; result icon composition lives in ResultItemIcon.
    function iconNameFor(path, kind) {
        const cached = cache[FileMetadataRules.cacheKey(path, kind)];
        return cached && cached.expiresAt > Date.now() ? cached.iconName : "";
    }

    // Read one path's actual modification time for the result details action.
    function modifiedAt(path, callback) {
        const status = pathCache[path];
        if (status && status.expiresAt > Date.now()) {
            callback(status.modifiedAt);
            return;
        }
        if (!Host.files || !Host.files.connected || typeof Host.files.stat !== "function") {
            callback(0);
            return;
        }
        try {
            Host.files.stat(path, function(result) {
                const entry = result && (result.entry || result);
                callback(result && !result.error && entry ? Number(entry.mtimeMs) || 0 : 0);
            });
        } catch (caughtError) {
            // Details remain available when the Dux file service cannot answer.
            Logger.error("metadata", "Could not read file metadata: " + String(caughtError));
            callback(0);
        }
    }

    property Timer refreshTimer: Timer { interval: Config.iconRefreshDebounceMilliseconds; repeat: false; onTriggered: root.metadataChanged() }
    // Retry a few times when Dux's file service connects after the launcher opens.
    property Timer connectionTimer: Timer {
        interval: Config.fileServiceReconnectMilliseconds
        repeat: false
        onTriggered: {
            if (Host.files && Host.files.connected) {
                root.connectionChecks = 0;
                root.metadataChanged();
            } else if (++root.connectionChecks < Config.maxFileServiceReconnectAttempts) restart();
        }
    }
}
