// DDialog.qml - Preserve the Dux dialog's content and action slots in tests.
import QtQuick

Item {
    property string title: ""
    property bool embedded: true
    default property alias content: body.data
    property alias actions: actionRow.data

    signal rejected()

    Item {
        id: body

        anchors.fill: parent
    }

    Item {
        id: actionRow
    }

}
