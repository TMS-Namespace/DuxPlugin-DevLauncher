// DButton.qml - Match the Dux button properties used by settings tests.
import QtQuick

Item {
    property string text: ""
    property string iconName: ""
    property string variant: "filled"
    property string shape: "round"
    property bool danger: false

    signal clicked()

    implicitWidth: 120
    implicitHeight: 40
}
