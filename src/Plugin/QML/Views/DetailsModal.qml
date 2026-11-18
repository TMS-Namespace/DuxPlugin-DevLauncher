// DetailsModal.qml - Show result details in a stacked Dux launcher modal.
pragma ComponentBehavior: Bound
import QtQuick
import qs.Common
import qs.DCommon.Widgets
import qs.Modals.Common

DModal {
    id: root
    property var entry: ({})
    property string detailsText: ""

    layerNamespace: "dms:dev-launcher-details"
    allowStacking: true
    useOverlayLayer: true
    shouldBeVisible: false
    modalWidth: 640
    modalHeight: 360
    onBackgroundClicked: close()

    // Show the details first, then let the launcher fill in file metadata asynchronously.
    function showDetails(item, text) {
        entry = item;
        detailsText = text;
        open();
    }

    content: Component {
        DDialog {
            anchors.fill: parent
            title: root.entry.name || "Item details"
            embedded: true
            StyledText {
                text: root.detailsText
                color: Theme.surfaceText
                wrapMode: Text.WrapAnywhere
                width: parent.width
            }
            actions: [
                DButton { text: "Close"; onClicked: root.close() }
            ]
            onRejected: root.close()
        }
    }
}
