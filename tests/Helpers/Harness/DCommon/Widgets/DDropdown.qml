// DDropdown.qml - Match the Dux dropdown properties and choice signal in tests.
import QtQuick

Item {
    property string text: ""
    property string description: ""
    property var options: []
    property var optionValues: []
    property string currentValue: ""
    property string emptyText: ""
    property bool showLabel: true
    property int dropdownWidth: 200

    signal valueChanged(string value)

    width: text === "" && description === "" ? dropdownWidth : parent ? parent.width : dropdownWidth
}
