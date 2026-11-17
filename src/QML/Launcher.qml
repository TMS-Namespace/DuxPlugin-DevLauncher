// Launcher.qml - Return deduplicated local paths and launch them in a configured IDE.
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
    readonly property alias detailsPanel: detailsModal

    signal itemsChanged()

    // Return only configured IDEs whose provider facades loaded successfully.
    function availableProviders() {
        return ConfigurationRules.providers(DataStorage.load("providers", ProvidersManager.defaultConfigurations())).filter(function(provider) {
            return ProvidersManager.handlerFor(provider.id) !== null;
        });
    }

    // Read the orchestrator's snapshot and request a fresh one when it is old.
    function getItems(query) {
        if (!pluginService)
            return [];

        const scannedAt = pluginService.getGlobalVar(Config.pluginId, "scannedAt", 0);
        if (Date.now() - scannedAt > Config.refreshMilliseconds && Date.now() - lastRequest > Config.refreshMilliseconds) {
            lastRequest = Date.now();
            pluginService.setGlobalVar(Config.pluginId, "refreshRequest", lastRequest);
        }
        const records = pluginService.getGlobalVar(Config.pluginId, "records", []);
        const usage = DataStorage.load("usage", {
        });
        const providers = availableProviders();
        const defaultProvider = ConfigurationRules.defaultProvider(DataStorage.load("defaultProvider", ProvidersManager.defaultProviderId()), providers);
        const resultsLimit = ResultRules.limit(DataStorage.load("resultsLimit", Config.defaultResultsLimit));
        const searchPaths = DataStorage.load("searchPaths", Config.searchPaths) === true;
        const availableRecords = Rules.merge(records, usage).filter(function(record) { return FileMetadataService.available(record.path); });
        const now = Date.now();
        const rankedRecords = Rules.rank(availableRecords.map(function(record) {
            const status = FileMetadataService.statusFor(record.path);
            return Object.assign({}, record, { modifiedAt: status ? status.modifiedAt : 0 });
        }), now);
        const ageFilter = AgeFilterRules.normalize(DataStorage.load("ageFilter", Config.defaultAgeFilter));
        const cutoff = AgeFilterRules.cutoff(ageFilter, now);
        const needsMetadata = [];
        const items = Rules.items(rankedRecords, query, resultsLimit, providers, defaultProvider, function(record) {
            if (AgeFilterRules.olderThan(record.effectiveRecent, cutoff)) return false;
            if (!FileMetadataService.statusFor(record.path)) needsMetadata.push(record);
            return true;
        }, searchPaths);
        FileMetadataService.request(needsMetadata);
        return items.map(function(item) {
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

    // Launch with separate arguments and record the request for ranking.
    function executeItem(item) {
        if (!item || !item.path || !item.path.startsWith("/"))
            return ;

        const handler = item.provider ? ProvidersManager.handlerFor(item.provider) : SystemOpener;
        if (!handler) {
            // The IDE's facade was released by a reload, so the user must be told the launch did not happen.
            ErrorHandler.report("launch", "The selected IDE is not available. Check its settings in Dev Launcher and try again.");
            return;
        }

        try {
            handler.launch(item.path);
        } catch (caughtError) {
            // The toast shows only the friendly message; the raw exception goes to the log.
            ErrorHandler.report("launch", caughtError.userMessage || "Could not open this item in the selected IDE.", caughtError.details || String(caughtError));
            return;
        }
        const usage = Rules.recordLaunch(DataStorage.load("usage", {
        }), item.path, Date.now(), Config.maxUsageEntries);
        if (DataStorage.save("usage", usage) !== true)
            ErrorHandler.report("launch", "Could not save launch history.");

        itemsChanged();
        SettingsData.launcherPluginVisibilityChanged();
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
            SettingsData.launcherPluginVisibilityChanged();
        }
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
