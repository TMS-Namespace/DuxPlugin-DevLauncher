// Theme.qml - Supply the host theme properties used by this settings page.
pragma Singleton

import QtQuick

QtObject {
    property real iconSizeLarge: 32
    property color surfaceText: "white"
    property color surfaceVariantText: "gray"
    property color surfaceContainerHigh: "#303030"
    property color surfaceContainerHighest: "#404040"
    property int fontSizeLarge: 18
    property int fontSizeMedium: 14
    property int fontSizeSmall: 12
    property int spacingS: 8
    property int spacingM: 12
    property int spacingXS: 4
    property int cornerRadiusS: 8
    property color error: "red"
}
