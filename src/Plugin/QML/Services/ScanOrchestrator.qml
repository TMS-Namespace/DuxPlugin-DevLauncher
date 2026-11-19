// ScanOrchestrator.qml - Coordinate host-owned scans and write each source's answer into the shared recent-items cache.
// Every scan source is a provider: IDEs read their history, and each scanned folder is a folder provider.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/ConfigurationRules.js" as ConfigurationRules
import "../../JS/Helpers/RepositoryNotificationRules.js" as RepositoryNotificationRules
import "../BackgroundWorkers"
import QtQuick

Item {
    id: root

    property var pluginService: null
    property string pluginId: Config.pluginId
    property string activeConfiguration: ""
    property bool rescanPending: false
    property bool scanRunning: false
    // When the last scan finished, read from the shared scan state; zero until a scan has finished.
    readonly property double lastScanAt: ScanState.scannedAt
    property var pendingProviderIds: []
    property var providerNames: ({
    })
    // The sources of the previous scan; a source that disappears from settings is dropped from the cache.
    property var knownSourceIds: []
    property var providerErrors: []
    property var observedFolders: []
    property var pendingNewFolders: []
    property var notificationFolders: []

    // Compare settings without touching provider state or launching processes.
    function configuration() {
        return JSON.stringify(ConfigurationRules.scan(DataStorage.load("folders", Config.folders), DataStorage.load("providers", ProvidersManager.defaultConfigurations()), DataStorage.load("repositoryDepth", Config.defaultRepositoryDepth)));
    }

    // The identifiers of the saved scan folders, used to tell which folders were just added.
    function folderIds(scanSettings) {
        return scanSettings.folders.map(function(entry) {
            return entry.id;
        });
    }

    // Every configuration that becomes a provider in this scan: the IDEs, then each folder with the global depth.
    function scanConfigurations(scanSettings) {
        const folderConfigurations = scanSettings.folders.map(function(entry) {
            return Object.assign({
            }, entry, {
                "name": ConfigurationRules.folderName(entry),
                "depth": scanSettings.depth
            });
        });
        return scanSettings.providers.concat(folderConfigurations);
    }

    // Settings changes invalidate discovery; the next launcher request owns the work.
    function invalidate() {
        ScanState.invalidateScan();
    }

    // Start one bounded scan, leaving a changed configuration pending until it finishes.
    function refresh() {
        if (!pluginService)
            return ;

        const nextConfiguration = configuration();
        const scanSettings = JSON.parse(nextConfiguration);
        const currentFolderIds = folderIds(scanSettings);
        const newlyAdded = RepositoryNotificationRules.newlyAdded(observedFolders, currentFolderIds);
        pendingNewFolders = RepositoryNotificationRules.pending(pendingNewFolders, newlyAdded, currentFolderIds);
        observedFolders = currentFolderIds;
        if (scanRunning) {
            if (nextConfiguration !== activeConfiguration)
                rescanPending = true;

            return ;
        }
        activeConfiguration = nextConfiguration;
        notificationFolders = pendingNewFolders;
        pendingNewFolders = [];
        const scanConfigs = scanConfigurations(scanSettings);
        ProvidersManager.reload(scanConfigs);
        const names = {
        };
        for (const provider of scanConfigs) names[provider.id] = provider.name
        providerNames = names;
        Logger.debug("scan", "configured " + Object.keys(ProvidersManager.handlers).length + " sources and " + scanSettings.folders.length + " folders");
        pendingProviderIds = Object.keys(ProvidersManager.handlers);
        const removedSourceIds = knownSourceIds.filter(function(id) {
            return !pendingProviderIds.includes(id);
        });
        RecentItemsCache.dropSources(removedSourceIds, Date.now());
        // A copy: the pending list is emptied as each source is asked, and the known list must keep every source of this scan.
        knownSourceIds = pendingProviderIds.slice();
        providerErrors = [];
        scanRunning = true;
        mountScanner.read(function(mounts) {
            if (!root)
                return ;

            RecentItemsCache.mounts = mounts;
            nextProvider();
        });
    }

    // Ask each source for its normalized recents. A source failure is kept per source and shown in its settings row;
    // it is never toasted on every scan.
    function nextProvider() {
        if (!pendingProviderIds.length) {
            refreshDates();
            return ;
        }
        const providerId = pendingProviderIds.shift();
        const providerName = providerNames[providerId] || "IDE";
        const handler = ProvidersManager.handlerFor(providerId);
        if (!handler) {
            recordProviderError(providerId, "Provider is unavailable.");
            nextProvider();
            return ;
        }
        try {
            const started = handler.recents(function(recentItems, message, details, answerSucceeded) {
                // A source may answer after this orchestrator was destroyed; then there is nothing left to publish.
                if (!root)
                    return ;

                // A failed answer keeps what the cache already holds for this source; a successful one replaces it.
                // A partial answer (for example a folder that hit its time limit) carries succeeded = false explicitly.
                const succeeded = answerSucceeded === undefined ? !message : answerSucceeded;
                RecentItemsCache.reconcileSource(providerId, providerName, recentItems || [], succeeded, Date.now());
                // The raw provider detail goes to the log only; the settings row shows the friendly message.
                if (details)
                    Logger.error("scan", providerName + ": " + details);

                if (message)
                    recordProviderError(providerId, message);

                nextProvider();
            });
            if (started)
                return ;

            recordProviderError(providerId, "Could not start the history read.");
        } catch (caughtError) {
            Logger.error("scan", String(caughtError));
            recordProviderError(providerId, caughtError.userMessage || "Could not read recent items.");
        }
        nextProvider();
    }

    // Finish this requested scan with bounded date checks, then publish the ordered snapshot once.
    function refreshDates() {
        const stale = RecentItemsCache.stalePaths(Date.now());
        if (!stale.length) {
            publish();
            return ;
        }
        dateRefresher.refresh(stale, function(modifiedByPath, missing) {
            if (!root)
                return ;

            RecentItemsCache.applyModifiedTimes(modifiedByPath, missing, Date.now(), false);
            publish();
        });
    }

    // Keep one error record for a source; the list is replaced on every scan.
    function recordProviderError(providerId, message) {
        providerErrors = providerErrors.concat([{
            "providerId": providerId,
            "message": message
        }]);
    }

    // Publish one complete snapshot for deduplication and icon checks in the launcher.
    function publish() {
        scanRunning = false;
        RecentItemsCache.commit();
        // Scan errors of every source are published for the settings page, which shows each one on its own row.
        const loadFailures = ProvidersManager.loadErrors.map(function(error) {
            return {
                "providerId": error.providerId,
                "message": error.userMessage
            };
        });
        const sourceErrors = providerErrors.concat(loadFailures);
        ScanState.publishScan(Date.now(), sourceErrors);
        // Only a folder added since the last scan can produce a toast. Every other error stays in the settings page,
        // because a scan runs again and again and a repeated toast would spam the user.
        const newlyAddedErrors = RepositoryNotificationRules.messages(sourceErrors, notificationFolders);
        if (newlyAddedErrors.length)
            ErrorHandler.report("scan", newlyAddedErrors.join("\n"));

        Logger.debug("scan", "finished with " + RecentItemsCache.ordered.length + " cached items");
        if (rescanPending || configuration() !== activeConfiguration) {
            rescanPending = false;
            invalidate();
        }
    }

    Component.onCompleted: {
        DataStorage.configure(pluginService);
        RecentItemsCache.start();
        if (pluginService)
            observedFolders = folderIds({
            "folders": ConfigurationRules.folderEntries(DataStorage.load("folders", Config.folders))
        });

    }
    onPluginServiceChanged: {
        DataStorage.configure(pluginService);
        RecentItemsCache.start();
        if (pluginService)
            observedFolders = folderIds({
            "folders": ConfigurationRules.folderEntries(DataStorage.load("folders", Config.folders))
        });

    }

    Connections {
        function onPluginDataChanged(changedPluginId) {
            if (changedPluginId === root.pluginId && root.configuration() !== root.activeConfiguration)
                root.invalidate();

        }

        target: root.pluginService
        enabled: root.pluginService !== null
    }

    // A refresh request from the launcher starts a scan; a saved setting that changed the configuration invalidates the last scan.
    Connections {
        function onRefreshRequested() {
            // A destroyed orchestrator may still receive the signal; it must not start a scan then.
            if (!root)
                return ;

            root.refresh();
        }

        function onSettingsChanged() {
            if (!root)
                return ;

            if (root.configuration() !== root.activeConfiguration)
                root.invalidate();

        }

        target: ScanState
    }

    MountScanner {
        id: mountScanner
    }

    DateRefresher {
        id: dateRefresher
    }

}
