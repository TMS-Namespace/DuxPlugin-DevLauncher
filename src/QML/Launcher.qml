// Launcher.qml - Search the ordered recent-items cache and launch the chosen item in the IDE that should open it.
import "../JS/Helpers/Config.js" as Config
import "../JS/Helpers/LauncherRules.js" as Rules
import "../JS/Helpers/ConfigurationRules.js" as ConfigurationRules
import "../JS/Helpers/ResultRules.js" as ResultRules
import "../JS/Helpers/ActionRules.js" as ActionRules
import "../JS/Helpers/AgeFilterRules.js" as AgeFilterRules
import "./Services"
import "./Views"
import QtQuick
import Quickshell
import qs.Common

Item {
    id: root

    property var pluginService: null
    property string trigger: Config.trigger
    property double lastRequest: 0
    // Dux also calls getItems for redraws. An unchanged query must only read the cache.
    property var lastQuery: null
    readonly property alias detailsPanel: detailsModal

    signal itemsChanged()

    // Return only configured IDEs whose provider facades loaded and that can open items.
    function availableProviders() {
        return ConfigurationRules.providers(DataStorage.load("providers", ProvidersManager.defaultConfigurations())).filter(function(provider) {
            return ProvidersManager.handlerFor(provider.id) !== null && ProvidersManager.descriptorFor(provider.type).launchable === true;
        });
    }

    // Read the ordered cache, filter it for the query, and present the results. Nothing is sorted or merged here.
    function getItems(query) {
        if (!pluginService)
            return [];

        RecentItemsCache.start();
        const queryChanged = query !== lastQuery;
        // A search starts with an empty query (the launcher opening) or with the first character typed after it.
        // Only those moments check the scan age, so typing further characters never requests another scan.
        const searchStarts = !query || !lastQuery;
        lastQuery = query;
        const now = Date.now();
        const scannedAt = pluginService.getGlobalVar(Config.pluginId, "scannedAt", 0);
        if (searchStarts && now - scannedAt > Config.refreshMilliseconds && now - lastRequest > Config.refreshMilliseconds) {
            lastRequest = now;
            pluginService.setGlobalVar(Config.pluginId, "refreshRequest", lastRequest);
        }
        const providers = availableProviders();
        const defaultProvider = ConfigurationRules.defaultProvider(DataStorage.load("defaultProvider", ProvidersManager.defaultProviderId()), providers);
        const resultsLimit = ResultRules.limit(DataStorage.load("resultsLimit", Config.defaultResultsLimit));
        const searchPaths = DataStorage.load("searchPaths", Config.searchPaths) === true;
        const cutoff = AgeFilterRules.cutoff(AgeFilterRules.normalize(DataStorage.load("ageFilter", Config.defaultAgeFilter)), now);
        const found = Rules.items(RecentItemsCache.ordered, query, { limit: resultsLimit, providers: providers, defaultProvider: defaultProvider, cutoff: cutoff, searchPaths: searchPaths, now: now });
        FileMetadataService.request(found, queryChanged);
        return found.map(function(item) {
            const description = item.comment + (item.ageLabel ? " · " + item.ageLabel : "");
            return Object.assign({}, item, { comment: description }, ResultItemIcon.iconFor(item));
        });
    }

    // Supply the buttons shown by Dux after Tab or a result's context menu opens.
    function getContextMenuActions(item) {
        return ActionRules.actions(item, availableProviders()).map(function(choice) {
            return {
                text: choice.text,
                icon: choice.icon,
                closeLauncher: choice.operation !== "details",
                action: function() { root.executeChoice(item, choice); }
            };
        });
    }

    // Route each result action to its provider, the desktop file browser, or details.
    function executeChoice(item, choice) {
        if (!item || !choice) return;
        if (choice.operation === "provider") executeItem(Object.assign({}, item, { provider: choice.provider }));
        else if (choice.operation === "system") executeItem(Object.assign({}, item, { provider: "" }));
        else if (choice.operation === "location") {
            const folder = choice.path;
            if (folder) SystemOpener.launch(folder);
        } else if (choice.operation === "copy") Quickshell.clipboardText = item.path;
        else if (choice.operation === "details") showDetails(item);
    }

    // Ask Dux for the real modification time only when someone requests details.
    function showDetails(item) {
        detailsModal.showDetails(item, ActionRules.details(item, 0));
        FileMetadataService.modifiedAt(item.path, function(modifiedAt) {
            if (detailsModal.shouldBeVisible && detailsModal.entry.path === item.path)
                detailsModal.detailsText = ActionRules.details(item, modifiedAt);
        });
    }

    // Launch with separate arguments, then record the launch and the IDE that performed it.
    function executeItem(item) {
        if (!item || !item.path || !item.path.startsWith("/"))
            return ;

        const handler = item.provider ? ProvidersManager.handlerFor(item.provider) : SystemOpener;
        if (!handler) {
            // The IDE's facade was released by a reload, so the user must be told the launch did not happen.
            ErrorHandler.reportAlways("launch", "The selected IDE is not available. Check its settings in Dev Launcher and try again.");
            return;
        }

        try {
            handler.launch(item.path);
        } catch (caughtError) {
            // The toast shows only the friendly message; the raw exception goes to the log.
            ErrorHandler.reportAlways("launch", caughtError.userMessage || "Could not open this item in the selected IDE.", caughtError.details || String(caughtError));
            return;
        }
        RecentItemsCache.recordLaunch(item.path, item.provider, Date.now());

        itemsChanged();
    }

    onPluginServiceChanged: {
        DataStorage.configure(pluginService);
        if (pluginService)
            trigger = DataStorage.load("trigger", Config.trigger);

    }

    Connections {
        function onPluginDataChanged(changedPluginId) {
            if (changedPluginId === Config.pluginId)
                root.trigger = DataStorage.load("trigger", Config.trigger);

        }

        target: root.pluginService
        enabled: root.pluginService !== null
    }

    Connections {
        target: root.pluginService
        enabled: root.pluginService !== null
        function onGlobalVarChanged(changedPluginId, name) {
            if (changedPluginId !== Config.pluginId || name !== "settingsRevision") return;
            root.trigger = DataStorage.load("trigger", Config.trigger);
            root.lastQuery = null;
            SettingsData.launcherPluginVisibilityChanged();
        }
    }

    // The scan published new items: an open launcher searches again.
    Connections {
        target: RecentItemsCache
        function onChanged() { SettingsData.launcherPluginVisibilityChanged(); }
    }

    Connections {
        target: FileMetadataService
        function onMetadataChanged() { SettingsData.launcherPluginVisibilityChanged(); }
    }

    Connections {
        target: ResultItemIcon
        function onIconsChanged() { SettingsData.launcherPluginVisibilityChanged(); }
    }

    DetailsModal { id: detailsModal }

}
