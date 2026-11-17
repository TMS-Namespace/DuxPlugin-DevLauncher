// DIcon.qml - Expose themed group icon properties to the settings integration test.
import QtQuick
Item {
    property string name: ""
    property int size: 0
    property color color: "white"
    implicitWidth: size
    implicitHeight: size
}
