// HistoryDatabase.test.qml - Check that a history database whose path contains an apostrophe is still read.
import QtQuick
import "../../../../../src/QML/Providers/VSCode" as Providers

QtObject {
    required property var fixture
    readonly property var historyDatabase: Providers.HistoryDatabase {}

    // The path is quoted for SQLite before ATTACH; an unquoted apostrophe would break the query and lose the history.
    function checkApostrophePathRead() {
        let value = "";
        try {
            value = historyDatabase.read(fixture.fixtureRoot + "/it's/state.vscdb", "history.recentlyOpenedPathsList");
        } catch (caughtError) {
            return fixture.expect(false, "a history path with an apostrophe failed to query: " + String(caughtError));
        }
        return fixture.expect(value.includes("apostrophe-marker"), "a history path with an apostrophe was not read: " + value);
    }
}
