// ErrorHandler.qml - Rate-limit friendly failure notifications from all plugin surfaces.
import "../../JS/Helpers/Config.js" as Config
import QtQml
import qs.Services
pragma Singleton

QtObject {
    property double lastNotificationAt: 0

    // Report one user-facing message. Raw provider or process details go only to the log, never to the toast.
    function report(scope, message, details) {
        Logger.error(scope, details ? message + " Details: " + String(details) : message);
        const now = Date.now();
        if (now - lastNotificationAt < Config.errorNotificationInterval)
            return ;

        lastNotificationAt = now;
        ToastService.showError("Dev Launcher", message);
    }

    // Report a failure caused by the user's own action, such as a launch. It is shown every time, never throttled,
    // because the user asked for the action and needs to know that it did not happen.
    function reportAlways(scope, message, details) {
        Logger.error(scope, details ? message + " Details: " + String(details) : message);
        lastNotificationAt = Date.now();
        ToastService.showError("Dev Launcher", message);
    }

}
