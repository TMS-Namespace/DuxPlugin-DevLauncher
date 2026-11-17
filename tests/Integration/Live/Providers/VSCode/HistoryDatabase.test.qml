// HistoryDatabase.test.qml - Opt-in check that the production SQLite reader sees live VS Code history.
import QtQuick
import Quickshell

ShellRoot {
    Component.onCompleted: {
        const component = Qt.createComponent("file://" + Quickshell.env("DEV_LAUNCHER_PLUGIN_ROOT") + "/src/QML/Providers/VSCode/HistoryDatabase.qml");
        if (component.status !== Component.Ready) {
            console.warn("T:FAIL live database component " + component.errorString());
            exitTimer.start();
            return;
        }
        try {
            const reader = component.createObject(null);
            const path = Quickshell.env("DEV_LAUNCHER_LIVE_HISTORY") || Quickshell.env("HOME") + "/.vscode-shared/sharedStorage/state.vscdb";
            const history = JSON.parse(reader.read(path, "history.recentlyOpenedPathsList"));
            if (!Array.isArray(history.entries) || !history.entries.length) throw new Error("No recent entries");
            console.warn("T:PASS live VS Code history entries=" + history.entries.length);
            reader.destroy();
        } catch (caughtError) {
            console.warn("T:FAIL live VS Code history " + caughtError);
        }
        exitTimer.start();
    }
    Timer { id: exitTimer; interval: 100; repeat: false; onTriggered: Qt.quit(); }
}
