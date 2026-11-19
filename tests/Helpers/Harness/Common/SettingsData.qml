// SettingsData.qml - Minimal host signal used to refresh an active search.
pragma Singleton

import QtQuick

QtObject {
    property var launcherPluginVisibility: ({
    })
    property var pluginSettings: ({
    })
    property string failingKey: ""

    function setPluginSetting(pluginId, key, value) {
        if (key === failingKey)
            throw new Error("simulated settings write failure");

        pluginSettings[pluginId][key] = value;
    }

    function getPluginSetting(pluginId, key, defaultValue) {
        const settings = pluginSettings[pluginId] || {
        };
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }

}
