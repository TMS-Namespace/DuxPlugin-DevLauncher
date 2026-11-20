// ErrorHandler.test.qml - Check that raw failure details go to the log while the toast shows only the friendly message.
import "../../../../../src/Plugin/QML/Services" as Services
import QtQuick
import qs.Services as HostServices

QtObject {
    required property var fixture

    // Capture the log through the logger's sink, then confirm the details never reach the toast.
    function checkDetailsStayOutOfToast() {
        const previousSink = Services.Logger.sink;
        const logged = [];
        Services.Logger.configure({
            "isDevMode": true,
            "sink": function(level, scope, message) {
                logged.push(message);
            }
        });
        Services.ErrorHandler.lastNotificationTimes = ({
        });
        Services.ErrorHandler.report("launch", "Friendly message.", "raw /internal/detail");
        Services.Logger.configure({
            "isDevMode": false,
            "sink": previousSink
        });
        const toasts = HostServices.ToastService.messages;
        const toast = toasts.length ? toasts[toasts.length - 1] : "";
        Services.ErrorHandler.lastNotificationTimes = ({
        });
        return fixture.expect(logged.length === 1 && logged[0].includes("raw /internal/detail") && logged[0].includes("Friendly message."), "details were not written to the log: " + logged.join(" | ")) && fixture.expect(toast.includes("Friendly message.") && !toast.includes("raw /internal/detail"), "details reached the toast: " + toast);
    }

    // A failure of the user's own action, such as a launch, is shown every time, even inside the throttle window.
    function checkLaunchErrorsAlwaysShown() {
        const toastsBefore = HostServices.ToastService.messages.length;
        Services.ErrorHandler.reportAlways("launch", "First launch failed.");
        Services.ErrorHandler.reportAlways("launch", "First launch failed.");
        const shown = HostServices.ToastService.messages.length - toastsBefore;
        Services.ErrorHandler.lastNotificationTimes = ({
        });
        return fixture.expect(shown === 2, "launch failures were throttled: " + shown + " shown");
    }

    // A different error reported while another is recent is still shown; only a repeat of the same message is throttled.
    function checkDifferentErrorsNotDropped() {
        Services.ErrorHandler.lastNotificationTimes = ({
        });
        const toastsBefore = HostServices.ToastService.messages.length;
        Services.ErrorHandler.report("scan", "First problem.");
        Services.ErrorHandler.report("scan", "Second problem.");
        Services.ErrorHandler.report("scan", "First problem.");
        const shown = HostServices.ToastService.messages.length - toastsBefore;
        const texts = HostServices.ToastService.messages.slice(toastsBefore);
        Services.ErrorHandler.lastNotificationTimes = ({
        });
        return fixture.expect(shown === 2 && texts[0] === "Dev Launcher: First problem." && texts[1] === "Dev Launcher: Second problem.", "a different error was dropped: " + JSON.stringify(texts));
    }

}
