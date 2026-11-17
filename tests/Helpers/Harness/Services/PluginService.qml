// PluginService.qml - Preserve Dux in-memory settings state across test page reloads.
import QtQuick
pragma Singleton

QtObject {
    property var globalVars: ({})
    property var pluginTriggersById: ({ "anotherPlugin": "!", "devLauncher": "`" })

    function getLauncherPlugins() { return { "anotherPlugin": {}, "devLauncher": {} }; }
    function getPluginTrigger(pluginId) { return pluginTriggersById[pluginId] || ""; }

    function getGlobalVar(pluginId, name, defaultValue) {
        const values = globalVars[pluginId] || {};
        return name in values ? values[name] : defaultValue;
    }

    function setGlobalVar(pluginId, name, value) {
        const updated = Object.assign({}, globalVars);
        updated[pluginId] = Object.assign({}, updated[pluginId] || {}, { [name]: value });
        globalVars = updated;
    }
}
