// HistoryDatabase.test.qml - Check that a history database whose path contains an apostrophe is still read.
import QtQuick
import Quickshell
import "../../../../../src/QML/Providers/VSCode" as Providers

QtObject {
    required property var fixture
    readonly property var historyDatabase: Providers.HistoryDatabase {}

    // The path is quoted for SQLite before ATTACH; an unquoted apostrophe would break the query and lose the history.
    function checkApostrophePathRead() {
        for (const directory of [fixture.fixtureRoot + "/it's", Quickshell.env("DEV_LAUNCHER_UNICODE_ROOT")]) {
            let value = "";
            try {
                value = historyDatabase.read(directory + "/state.vscdb", "history.recentlyOpenedPathsList");
            } catch (caughtError) {
                return fixture.expect(false, "a Unicode/quoted history path failed: " + String(caughtError));
            }
            if (!fixture.expect(value.includes("apostrophe-marker"), "a Unicode/quoted history path was not read: " + value)) return false;
        }
        return true;
    }
}
