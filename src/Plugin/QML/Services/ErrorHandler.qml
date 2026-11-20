// ErrorHandler.qml - Rate-limit friendly failure notifications from all plugin surfaces.
pragma Singleton

import "../../JS/Helpers/Constants.js" as Constants
import QtQml
import qs.Services

QtObject {
    // The time each message was last shown, so only a repeat of the same message is throttled; a different error is always shown.
    property var lastNotificationTimes: ({
    })

    // Report one user-facing message. Raw provider or process details go only to the log, never to the toast.
    function report(scope, message, details) {
        Logger.error(scope, details ? message + " Details: " + String(details) : message);
        const now = Date.now();
        if (now - (lastNotificationTimes[message] || 0) < Constants.errorNotificationInterval)
            return ;

        showToast(message, now);
    }

    // Report a failure caused by the user's own action, such as a launch. It is shown every time, never throttled,
    // because the user asked for the action and needs to know that it did not happen.
    function reportAlways(scope, message, details) {
        Logger.error(scope, details ? message + " Details: " + String(details) : message);
        showToast(message, Date.now());
    }

    // Show the message with the plugin name in its text, because the toast shows only the message. Remember when it was shown.
    function showToast(message, shownAt) {
        lastNotificationTimes[message] = shownAt;
        ToastService.showError("Dev Launcher: " + message);
    }

}
