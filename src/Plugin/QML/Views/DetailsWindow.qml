// DetailsWindow.qml - Show one result's details in a Dux floating window that the launcher creates on first use.
// Rules: The window holds no data of its own; the launcher fills it, and closing it only hides it, so it can be shown again.
pragma ComponentBehavior: Bound
import QtQuick
import qs.Common
import qs.DCommon.Widgets
import qs.Widgets

DFloatingWindow {
    id: root

    // The item whose details are shown, and the text the launcher built for it.
    property var entry: ({
    })
    property string detailsText: ""
    // The dialog that presents the details, exposed for the launcher's checks.
    readonly property alias dialog: detailsDialog
    // The launcher's intent to show the window. The window follows it, and a close by the window manager clears it.
    property bool shown: false
    readonly property bool shouldBeVisible: shown

    // Show the details first, then let the launcher fill in file metadata asynchronously.
    function showDetails(item, text) {
        entry = item;
        detailsText = text;
        open();
    }

    // Show the window, keeping the details already set.
    function open() {
        shown = true;
    }

    // Hide the window; its details remain for the next showDetails call.
    function close() {
        shown = false;
    }

    visible: shown
    onVisibleChanged: {
        if (!visible)
            shown = false;

    }
    implicitWidth: 640
    implicitHeight: 360

    DDialog {
        id: detailsDialog

        anchors.fill: parent
        title: root.entry.name || "Item details"
        embedded: true
        onRejected: root.close()
        actions: [
            DButton {
                text: "Close"
                onClicked: root.close()
            }
        ]

        StyledText {
            text: root.detailsText
            color: Theme.surfaceText
            wrapMode: Text.WrapAnywhere
            width: parent.width
        }

    }

}
