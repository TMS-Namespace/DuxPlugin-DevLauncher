// ZedRecents.test.qml - Read actual SQLite workspace, editor, and navigation data through the provider entry point.
// Rules: Runs in the offscreen shell against a fixture SQLite database; a missing database must fail rather than look successful.
import QtQuick
import "../../../../../src/Providers/Zed/QML/Integration" as Entry
import "../../../../../src/Providers/Zed/JS/ZedApi.js" as Api
import "../../../../../src/Providers/Zed/JS/ZedProperties.js" as Properties

QtObject {
    id: checks
    required property var fixture
    readonly property var entry: Entry.ZedProvider {}
    property var reader: null

    // A real database supplies timestamps and file/folder records; failed reads retain cached results.
    function start(next) {
        reader = entry.readerType.createObject(null);
        const properties = Properties.create({ installationType: "flatpak", id: fixture.thirdIdentifier, name: "Zed", executable: "/usr/bin/flatpak", config: fixture.fixtureRoot + "/Zed", extraArguments: [] });
        reader.read(Api.create(), properties, function(records, message, details, succeeded) {
            if (!checks.fixture.expect(succeeded && records.some(function(record) { return record.path === "/tmp/zed-project" && record.kind === "folder" && record.openedAt > 0; }) && records.some(function(record) { return record.path === "/tmp/zed-project/日本語.js" && record.kind === "file"; }), "Zed history read failed: " + message + " " + details + " " + JSON.stringify(records))) return;
            const missing = Properties.create({ installationType: "flatpak", id: checks.fixture.thirdIdentifier, name: "Zed", executable: "/usr/bin/flatpak", config: checks.fixture.fixtureRoot + "/absent", extraArguments: [] });
            checks.reader.read(Api.create(), missing, function(ignored, error, detail, success) {
                if (!checks.fixture.expect(!success && !!error, "missing Zed database looked successful")) return;
                checks.reader.destroy();
                checks.reader = null;
                next();
            });
        });
    }
}
