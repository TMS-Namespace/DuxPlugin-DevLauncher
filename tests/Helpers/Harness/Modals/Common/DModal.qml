// DModal.qml - Keep Dux modal visibility and content behavior testable offscreen.
import QtQuick

Item {
    id: root
    property string layerNamespace: ""
    property bool allowStacking: false
    property bool useOverlayLayer: false
    property bool shouldBeVisible: false
    property real modalWidth: 400
    property real modalHeight: 300
    property Component content: null
    readonly property alias contentLoader: contentLoader
    signal backgroundClicked

    function open() { shouldBeVisible = true; }
    function close() { shouldBeVisible = false; }

    Loader {
        id: contentLoader
        sourceComponent: root.content
        width: root.modalWidth
        height: root.modalHeight
    }
}
