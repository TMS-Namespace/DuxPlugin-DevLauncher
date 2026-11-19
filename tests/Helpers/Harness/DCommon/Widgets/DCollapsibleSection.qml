// DCollapsibleSection.qml - Keep Dux group content and layout behavior in tests.
import QtQuick
import QtQuick.Layouts

ColumnLayout {
    property string title: ""
    property string description: ""
    property bool expanded: false
    default property alias content: groupContent.data

    ColumnLayout {
        id: groupContent

        Layout.fillWidth: true
    }

}
