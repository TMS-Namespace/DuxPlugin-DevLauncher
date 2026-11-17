// StringSetting.qml - Represent a host string control without drawing it.
import QtQuick

Item {
    required property string settingKey
    required property string label
    property string description: ""
    property string placeholder: ""
    property string defaultValue: ""
}
