// DFloatingWindow.qml - Stand-in for Dux's floating window surface: a FloatingWindow that takes its children as content.
// Rules: Mirrors the installed DFloatingWindow's content property only; no blur, theme, or surface painting is reproduced.
import QtQuick
import Quickshell

FloatingWindow {
    id: root

    // Children are placed in the content item, as the installed window does.
    default property alias content: contentItem.data

    Item {
        id: contentItem

        anchors.fill: parent
    }

}
