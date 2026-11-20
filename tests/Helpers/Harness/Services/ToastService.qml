// ToastService.qml - Fail the fixture when the plugin reports an unexpected error.
pragma Singleton

import QtQuick

QtObject {
    property var messages: []

    // The same parameters as Dux's ToastService.showError; only the message is kept for the checks.
    function showError(message, details, command, category) {
        messages = messages.concat([message]);
    }

}
