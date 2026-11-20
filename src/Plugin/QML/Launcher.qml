// Launcher.qml - Search the ordered recent-items cache and launch the chosen item in the IDE that should open it.
// Rules: Searches read only the ordered cache, and a launch is recorded only after its launch call returns without an error. The root is a QtObject; its details window is created on first use.
import "../JS/Helpers/ActionRules.js" as ActionRules
import "../JS/Helpers/AgeFilterRules.js" as AgeFilterRules
import "../JS/Helpers/ConfigurationRules.js" as ConfigurationRules
import "../JS/Helpers/Constants.js" as Constants
import "../JS/Helpers/LauncherRules.js" as Rules
import "../JS/Helpers/PathRules.js" as PathRules
import "../JS/Helpers/ResultRules.js" as ResultRules
import "./Services"
import "./Views"
import QtQml
import Quickshell

// The launcher root: it answers searches from the cache and runs the chosen action, launch or details.
QtObject {
    id: root

    property var pluginService: null
    // The plugin id that Dux uses to route launcher refresh requests back to this launcher.
    property string pluginId: Constants.pluginId
    property string trigger: Constants.trigger
    // The time of the last refresh request, so the request is not repeated within the refresh interval.
    property double lastRequest: 0
    // Dux also calls getItems for redraws. An unchanged query must only read the cache.
    property var lastQuery: null
    // The details window type, and the one window created from it on first use; a QtObject root holds no visual items.
    property Component detailsWindowType
    property var detailsPanel: null
    // Return only configured IDEs whose provider facades loaded and that can open items.
    // The settings a search reads, loaded once and dropped whenever a saved value changes, instead of once per keystroke.
    property var settingsSnapshot: null
    // Reloads the trigger when the plugin's saved data changes.
    property Connections pluginDataWatcher
    // Reloads the trigger, forgets the last query, and refreshes the launcher whenever a setting affecting results is saved.
    property Connections settingsWatcher
    // The scan published new items: an open launcher searches again.
    property Connections cacheWatcher
    // Asks the launcher to search again when file metadata changes.
    property Connections metadataWatcher
    // Asks the launcher to search again when icons finish loading.
    property Connections iconWatcher

    signal itemsChanged()

    function snapshot() {
        if (!settingsSnapshot)
            settingsSnapshot = {
            "providers": DataStorage.load("providers", ProvidersManager.defaultConfigurations()),
            "defaultProvider": DataStorage.load("defaultProvider", ProvidersManager.defaultProviderId()),
            "resultsLimit": DataStorage.load("resultsLimit", Constants.defaultResultsLimit),
            "searchPaths": DataStorage.load("searchPaths", Constants.searchPaths),
            "showBadges": DataStorage.load("showBadges", Constants.showBadges),
            "ageFilter": DataStorage.load("ageFilter", Constants.defaultAgeFilter)
        };

        return settingsSnapshot;
    }

    function availableProviders() {
        return ConfigurationRules.providers(snapshot().providers).filter(function(provider) {
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
        const scannedAt = ScanState.scannedAt;
        if (searchStarts && now - scannedAt > Constants.refreshMilliseconds && now - lastRequest > Constants.refreshMilliseconds) {
            lastRequest = now;
            ScanState.requestRefresh(lastRequest);
        }
        const providers = availableProviders();
        // The badges in use are checked once per search; only a badge that is new to the providers is built.
        ResultItemIcon.refreshBadges();
        const saved = snapshot();
        const defaultProvider = ConfigurationRules.defaultProvider(saved.defaultProvider, providers);
        const resultsLimit = ResultRules.limit(saved.resultsLimit);
        const searchPaths = saved.searchPaths === true;
        const showBadges = saved.showBadges !== false;
        const cutoff = AgeFilterRules.cutoff(AgeFilterRules.normalize(saved.ageFilter), now);
        const found = Rules.items(RecentItemsCache.ordered, query, {
            "limit": resultsLimit,
            "providers": providers,
            "defaultProvider": defaultProvider,
            "cutoff": cutoff,
            "searchPaths": searchPaths,
            "now": now
        });
        FileMetadataService.request(found, queryChanged);
        return found.map(function(item) {
            const description = item.ageLabel ? item.ageLabel + " · " + item.comment : item.comment;
            return Object.assign({
            }, item, {
                "comment": description
            }, ResultItemIcon.iconFor(item, showBadges));
        });
    }

    // Supply the buttons shown by Dux after Tab or a result's context menu opens.
    function getContextMenuActions(item) {
        return ActionRules.actions(item, availableProviders()).map(function(choice) {
            return {
                "text": choice.text,
                "icon": choice.icon,
                "closeLauncher": choice.operation !== "details",
                "action": function() {
                    root.executeChoice(item, choice);
                }
            };
        });
    }

    // Route each result action to its provider, the desktop file browser, or details.
    function executeChoice(item, choice) {
        if (!item || !choice)
            return ;

        if (choice.operation === "provider") {
            executeItem(Object.assign({
            }, item, {
                "provider": choice.provider
            }));
        } else if (choice.operation === "system") {
            executeItem(Object.assign({
            }, item, {
                "provider": ""
            }));
        } else if (choice.operation === "location") {
            const folder = choice.path;
            if (folder)
                SystemOpener.launch(folder);

        } else if (choice.operation === "copy")
            Quickshell.clipboardText = item.path;
        else if (choice.operation === "details")
            showDetails(item);
    }

    // Create the details window on first use; later requests reuse it.
    function ensureDetailsPanel() {
        if (!detailsPanel)
            detailsPanel = detailsWindowType.createObject(root);

        return detailsPanel;
    }

    // Ask Dux for the real modification time only when someone requests details.
    function showDetails(item) {
        const panel = ensureDetailsPanel();
        panel.showDetails(item, ActionRules.details(item, 0));
        FileMetadataService.modifiedAt(item.path, function(modifiedAt) {
            if (panel.shouldBeVisible && panel.entry.path === item.path)
                panel.detailsText = ActionRules.details(item, modifiedAt);

        });
    }

    // Launch with separate arguments, then record the launch and the IDE that performed it.
    function executeItem(item) {
        if (!item || !item.path || !PathRules.resourcePath(item.path))
            return ;

        if (PathRules.resourceType(item.path) === "remote" && (!item.provider || !Array.isArray(item.sourceProviders) || !item.sourceProviders.includes(item.provider))) {
            ErrorHandler.reportAlways("launch", "Open this remote item using an IDE that reported it.");
            return ;
        }
        const handler = item.provider ? ProvidersManager.handlerFor(item.provider) : SystemOpener;
        if (!handler) {
            // The IDE's facade was released by a reload, so the user must be told the launch did not happen.
            ErrorHandler.reportAlways("launch", "The selected IDE is not available. Check its settings in Dev Launcher and try again.");
            return ;
        }
        try {
            handler.launch(item.path, item.kind);
        } catch (caughtError) {
            // The toast shows only the friendly message; the raw exception goes to the log.
            ErrorHandler.reportAlways("launch", caughtError.userMessage || "Could not open this item in the selected IDE.", caughtError.details || String(caughtError));
            return ;
        }
        RecentItemsCache.recordLaunch(item.path, item.provider, Date.now());
        itemsChanged();
    }

    // Ask Dux to search again with the current query, so results that changed in the background appear.
    function requestLauncherUpdate() {
        if (pluginService)
            pluginService.requestLauncherUpdate(pluginId);

    }

    // Attaches the new plugin service to storage and reloads the trigger from saved settings.
    onPluginServiceChanged: {
        DataStorage.configure(pluginService);
        if (pluginService)
            trigger = DataStorage.load("trigger", Constants.trigger);

    }

    detailsWindowType: Component {
        DetailsWindow {
        }

    }

    pluginDataWatcher: Connections {
        // Reloads the trigger when this plugin's saved data changes, and ignores other plugins.
        function onPluginDataChanged(changedPluginId) {
            if (changedPluginId === root.pluginId) {
                root.trigger = DataStorage.load("trigger", Constants.trigger);
                root.settingsSnapshot = null;
            }
        }

        target: root.pluginService
        enabled: root.pluginService !== null
    }

    settingsWatcher: Connections {
        function onSettingsChanged() {
            root.trigger = DataStorage.load("trigger", Constants.trigger);
            root.settingsSnapshot = null;
            root.lastQuery = null;
            root.requestLauncherUpdate();
        }

        target: ScanState
    }

    cacheWatcher: Connections {
        // Asks the launcher to search again when the cache changes.
        function onChanged() {
            root.requestLauncherUpdate();
        }

        target: RecentItemsCache
    }

    metadataWatcher: Connections {
        // Asks the launcher to search again when file metadata changes.
        function onMetadataChanged() {
            root.requestLauncherUpdate();
        }

        target: FileMetadataService
    }

    iconWatcher: Connections {
        // Asks the launcher to search again when icons change.
        function onIconsChanged() {
            root.requestLauncherUpdate();
        }

        target: ResultItemIcon
    }

}
