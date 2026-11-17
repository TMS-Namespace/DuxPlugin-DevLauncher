// PluginSettings.qml - Keep the host's late service attachment and visual content contract.
import QtQuick

Item {
    id: root

    required property string pluginId
    property var pluginService: null
    default property alias content: settingsColumn.data

    Column {
        id: settingsColumn

        width: root.width
    }

}
