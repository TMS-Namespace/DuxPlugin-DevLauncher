// DataStorage.qml - The only plugin object that reads and writes saved Dux plugin settings.
// Rules: This is the only object that reads or writes saved plugin settings; damaged values are backed up before a save can overwrite them.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Storage/SettingsMigration.js" as SettingsMigration
import "../../JS/Helpers/SettingsIntegrity.js" as SettingsIntegrity
import QtQml
import qs.Common
pragma Singleton

// The one door to saved plugin settings: loads apply format migration and damage reports, and saves are checked by reading them back.
QtObject {
    property var pluginService: null
    // The keys whose damage was already reported, so each key is reported once until it is saved again.
    property var reportedDamage: ({})
    // Set once the folders saved in the earliest format have been converted to folder entries.
    property bool foldersMigrated: false

    // Attach the host service after it becomes available to any plugin surface.
    function configure(service) {
        if (service)
            pluginService = service;
        migrateFolders();
    }

    // Convert folders saved as plain path strings into folder entries, once, before any reader gets them. Each entry needs a
    // stable identifier, so the converted list is saved; converting on every load would give each load new identifiers.
    function migrateFolders() {
        if (foldersMigrated || !pluginService) return;
        const typeId = ProvidersManager.folderTypeId();
        if (!typeId) return;
        const value = pluginService.loadPluginData(Config.pluginId, "folders", undefined);
        if (!Array.isArray(value) || !value.some(function(item) { return typeof item === "string"; })) {
            foldersMigrated = true;
            return;
        }
        foldersMigrated = save("folders", SettingsMigration.folders(value, typeId));
    }

    // Return the declared default until Dux attaches its settings service.
    function load(key, defaultValue) {
        if (!pluginService) return defaultValue;
        const value = pluginService.loadPluginData(Config.pluginId, key, defaultValue);
        if (SettingsIntegrity.damaged(key, value) && !reportedDamage[key]) {
            reportedDamage[key] = true;
            ErrorHandler.report("storage", "Some saved " + key + " settings are invalid. A copy will be kept if you change them.");
        }
        // Older entries without an installation type get their provider's default here, so no reader ever sees the old format.
        return SettingsMigration.installations(key, value, function(typeId) { return ProvidersManager.defaultsFor(typeId).installationType; });
    }

    // Preserve the original value before replacing settings that normalization would discard.
    // The backup never refuses a save: an unexpected backup shape is kept under "unreadable" by SettingsIntegrity.withBackup.
    function preserveDamagedValue(key) {
        const current = SettingsData.getPluginSetting(Config.pluginId, key, undefined);
        if (!SettingsIntegrity.damaged(key, current)) return true;
        const previous = SettingsData.getPluginSetting(Config.pluginId, "damagedSettingsBackup", {});
        const backup = SettingsIntegrity.withBackup(previous, key, current);
        SettingsData.setPluginSetting(Config.pluginId, "damagedSettingsBackup", backup);
        return JSON.stringify(SettingsData.getPluginSetting(Config.pluginId, "damagedSettingsBackup", null)) === JSON.stringify(backup);
    }

    // Save through Dux settings without the launcher reload emitted by savePluginData.
    function save(key, value) {
        if (!pluginService) return false;
        try {
            if (!preserveDamagedValue(key)) {
                Logger.error("storage", "Could not preserve damaged settings before saving.");
                return false;
            }
            SettingsData.setPluginSetting(Config.pluginId, key, value);
            if (JSON.stringify(SettingsData.getPluginSetting(Config.pluginId, key, null)) !== JSON.stringify(value)) return false;
            // Usage counts and the group layout do not change scan or launcher results, so they announce no settings revision.
            if (key !== "usage" && key !== "expandedSettings") ScanState.announceSettingsChange(Date.now());
            delete reportedDamage[key];
            return true;
        } catch (caughtError) {
            Logger.error("storage", "Could not write the plugin setting: " + String(caughtError));
            return false;
        }
    }

}
