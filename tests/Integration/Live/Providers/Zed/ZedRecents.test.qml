// ZedRecents.test.qml - Opt-in read of local Zed Flatpak history without printing paths.
// Rules: Opt-in live check in the offscreen shell; it fails when no dated history is read, and on failure it also prints the error text.
import QtQuick
import Quickshell

ShellRoot {
    Component.onCompleted: {
        const component = Qt.createComponent("file://" + Quickshell.env("DEV_LAUNCHER_PLUGIN_ROOT") + "/src/QML/Providers/Zed/ZedRecents.qml");
        if (component.status !== Component.Ready) {
            console.warn("T:FAIL live Zed component " + component.errorString());
            exitTimer.start();
            return;
        }
        try {
            const reader = component.createObject(null);
            const rows = reader.readDatabase(Quickshell.env("DEV_LAUNCHER_LIVE_ZED_HISTORY"));
            if (!rows.length || !rows.some(function(row) { return !!row.timestamp; })) throw new Error("No dated local Zed history");
            console.warn("T:PASS live Zed history entries=" + rows.length);
            reader.destroy();
        } catch (caughtError) {
            console.warn("T:FAIL live Zed history " + String(caughtError));
        }
        exitTimer.start();
    }
    Timer { id: exitTimer; interval: 100; repeat: false; onTriggered: Qt.quit(); }
}
