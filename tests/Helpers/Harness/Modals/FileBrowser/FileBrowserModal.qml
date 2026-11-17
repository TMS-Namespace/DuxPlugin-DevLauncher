// FileBrowserModal.qml - Stand in for Dux's built-in folder and file picker.
import QtQuick
Item {
    property string browserTitle: ""
    property string mode: "open"
    property bool showHiddenFiles: false
    property bool opened: false
    signal accepted(var paths)
    function open() { opened = true; }
}
