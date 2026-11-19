// DTextField.qml - Match the Dux field editing signals in tests.
import QtQuick

Item {
    property string text: ""
    property string labelText: ""
    property string placeholderText: ""
    property bool inputFocused: false
    property var validator: null

    signal textEdited()
    signal editingFinished()
}
