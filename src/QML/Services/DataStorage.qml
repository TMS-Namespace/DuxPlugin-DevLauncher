// DataStorage.qml - The only plugin object that reads and writes saved Dux plugin settings.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/SettingsIntegrity.js" as SettingsIntegrity
import QtQml
import qs.Common
pragma Singleton

QtObject {
    property var pluginService: null
    property var reportedDamage: ({})

    // Attach the host service after it becomes available to any plugin surface.
    function configure(service) {
        if (service)
            pluginService = service;

    }

    // Return the declared default until Dux attaches its settings service.
    function load(key, defaultValue) {
        if (!pluginService) return defaultValue;
        const value = pluginService.loadPluginData(Config.pluginId, key, defaultValue);
        if (SettingsIntegrity.damaged(key, value) && !reportedDamage[key]) {
            reportedDamage[key] = true;
            ErrorHandler.report("storage", "Some saved " + key + " settings are invalid. A copy will be kept if you change them.");
        }
        return value;
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
            if (key !== "usage") pluginService.setGlobalVar(Config.pluginId, "settingsRevision", Date.now());
            delete reportedDamage[key];
            return true;
        } catch (caughtError) {
            Logger.error("storage", "Could not write the plugin setting: " + String(caughtError));
            return false;
        }
    }

}
