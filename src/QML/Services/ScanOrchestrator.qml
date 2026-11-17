// ScanOrchestrator.qml - Coordinate host-owned scans and publish unified launcher records.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/ConfigurationRules.js" as ConfigurationRules
import "../../JS/Helpers/RepositoryNotificationRules.js" as RepositoryNotificationRules
import "../BackgroundWorkers"
import QtQuick
import qs.Common

Item {
    id: root

    property var pluginService: null
    property string pluginId: Config.pluginId
    property string activeConfiguration: ""
    property bool rescanPending: false
    property bool ready: false
    property bool scanRunning: false
    property var pendingProviderIds: []
    property var providerNames: ({})
    property var records: []
    property var errors: []
    property var folderErrors: []
    property var observedFolders: []
    property var pendingNewFolders: []
    property var notificationFolders: []
    readonly property bool startupScanPending: startupScanTimer.running

    // Compare settings without touching provider state or launching processes.
    function configuration() {
        return JSON.stringify(ConfigurationRules.scan(DataStorage.load("folders", Config.folders), DataStorage.load("providers", ProvidersManager.defaultConfigurations()), DataStorage.load("repositoryDepth", Config.defaultRepositoryDepth)));
    }

    // Defer the automatic scan until the shell has had time to finish starting.
    function scheduleStartup() {
        if (ready && pluginService && !scanRunning && !startupScanTimer.running)
            startupScanTimer.start();
    }

    // Start one bounded scan, leaving a changed configuration pending until it finishes.
    function refresh() {
        if (!pluginService)
            return ;

        startupScanTimer.stop();
        const nextConfiguration = configuration();
        const scanSettings = JSON.parse(nextConfiguration);
        const newlyAdded = RepositoryNotificationRules.newlyAdded(observedFolders, scanSettings.folders);
        pendingNewFolders = RepositoryNotificationRules.pending(pendingNewFolders, newlyAdded, scanSettings.folders);
        observedFolders = scanSettings.folders;
        if (scanRunning) {
            if (nextConfiguration !== activeConfiguration) rescanPending = true;
            return ;
        }
        activeConfiguration = nextConfiguration;
        notificationFolders = pendingNewFolders;
        pendingNewFolders = [];
        ProvidersManager.reload(scanSettings.providers);
        const names = {};
        for (const provider of scanSettings.providers) names[provider.id] = provider.name;
        providerNames = names;
        Logger.debug("scan", "configured " + Object.keys(ProvidersManager.handlers).length + " IDEs and " + scanSettings.folders.length + " folders");
        pendingProviderIds = Object.keys(ProvidersManager.handlers);
        records = [];
        errors = [];
        folderErrors = [];
        scanRunning = true;
        repositoryScanner.start(scanSettings.folders, scanSettings.depth);
    }

    // Collect repository results before asking each provider for normalized recents.
    function acceptSnapshot(snapshot) {
        records = snapshot.repositories || [];
        folderErrors = snapshot.errors || [];
        for (const failure of folderErrors) Logger.error("scan", failure.message);
        nextProvider();
    }

    // Providers own every read and return only common local path records.
    function nextProvider() {
        if (!pendingProviderIds.length) {
            publish();
            return;
        }
        const providerId = pendingProviderIds.shift();
        const providerName = providerNames[providerId] || "IDE";
        const handler = ProvidersManager.handlerFor(providerId);
        if (!handler) {
            errors = errors.concat([providerName + ": Provider is unavailable."]);
            nextProvider();
            return;
        }
        try {
            const started = handler.recents(function(recentItems, message, details) {
                records = records.concat(recentItems || []);
                // The raw provider detail goes to the log only; the user sees the friendly message in the settings list.
                if (details) Logger.error("scan", providerName + ": " + details);
                if (message) errors = errors.concat([providerName + ": " + message]);
                nextProvider();
            });
            if (started) return;
            errors = errors.concat([providerName + ": Could not start IDE history read."]);
        } catch (caughtError) {
            Logger.error("scan", String(caughtError));
            errors = errors.concat([providerName + ": " + (caughtError.userMessage || "Could not read IDE history.")]);
        }
        nextProvider();
    }

    // Publish one complete snapshot for deduplication and icon checks in the launcher.
    function publish() {
        scanRunning = false;
        pluginService.setGlobalVar(pluginId, "records", records);
        pluginService.setGlobalVar(pluginId, "scannedAt", Date.now());
        // The current Dux launcher refreshes active searches through this host signal.
        SettingsData.launcherPluginVisibilityChanged();
        // Folder scan errors are published for the settings folder list, which shows them next to each folder.
        pluginService.setGlobalVar(pluginId, "folderErrors", folderErrors);
        // Only folders added since the last scan can produce a toast; all other folder errors stay in the settings list.
        const newlyAddedErrors = RepositoryNotificationRules.messages(folderErrors, notificationFolders);
        const allErrors = newlyAddedErrors.concat(errors, ProvidersManager.loadErrors.map(function(error) {
            return error.name + ": " + error.userMessage;
        }));
        if (allErrors.length)
            ErrorHandler.report("scan", allErrors.join("\n"));

        Logger.debug("scan", "finished with " + records.length + " records");
        if (rescanPending) {
            rescanPending = false;
            Qt.callLater(refresh);
        }
    }

    Component.onCompleted: {
        ready = true;
        DataStorage.configure(pluginService);
        if (pluginService) observedFolders = ConfigurationRules.folders(DataStorage.load("folders", Config.folders));
        scheduleStartup();
    }
    onPluginServiceChanged: {
        DataStorage.configure(pluginService);
        if (ready && pluginService) {
            observedFolders = ConfigurationRules.folders(DataStorage.load("folders", Config.folders));
            scheduleStartup();
        }

    }

    Connections {
        function onPluginDataChanged(changedPluginId) {
            if (changedPluginId === root.pluginId && root.configuration() !== root.activeConfiguration)
                root.refresh();

        }

        function onGlobalVarChanged(changedPluginId, name) {
            if (changedPluginId === root.pluginId && name === "refreshRequest")
                root.refresh();
            if (changedPluginId === root.pluginId && name === "settingsRevision" && root.configuration() !== root.activeConfiguration)
                root.refresh();

        }

        target: root.pluginService
        enabled: root.pluginService !== null
    }

    Timer {
        id: startupScanTimer
        interval: Config.startupScanDelayMilliseconds
        repeat: false
        onTriggered: root.refresh()
    }

    RepositoryScanner {
        id: repositoryScanner

        onFinished: (snapshot) => {
            return root.acceptSnapshot(snapshot);
        }
    }

}
