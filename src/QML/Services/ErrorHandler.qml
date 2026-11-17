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

}
