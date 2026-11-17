import QtQuick
// ToastService.qml - Fail the fixture when the plugin reports an unexpected error.
pragma Singleton

QtObject {
    property var messages: []
    function showError(title, message) {
        messages = messages.concat([title + ": " + message]);
    }

}
