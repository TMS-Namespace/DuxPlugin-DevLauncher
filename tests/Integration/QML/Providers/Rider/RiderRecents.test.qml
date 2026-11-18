// RiderRecents.test.qml - Exercise versioned Rider XML discovery with real processes.
// Rules: Runs in the offscreen shell against fixture XML; a damaged history must report failure, and one damaged version must not hide a readable one.
import QtQuick
import "../../../../../src/QML/Providers/Rider/Integration" as Entry
import "../../../../../src/JS/Providers/Rider/RiderApi.js" as Api
import "../../../../../src/JS/Providers/Rider/RiderProperties.js" as Properties

QtObject {
    id: checks
    required property var fixture
    readonly property var entry: Entry.RiderProvider {}
    property var reader: null

    // A valid history preserves dates and Unicode; a damaged source reports failure rather than clearing the cache.
    function start(next) {
        reader = entry.readerType.createObject(null);
        const properties = Properties.create({ installationType: "native", id: fixture.thirdIdentifier, name: "Rider", executable: "rider", config: fixture.fixtureRoot + "/RiderConfigs", extraArguments: [] });
        reader.read(Api.create(), properties, function(records, message, details, succeeded) {
            if (!checks.fixture.expect(succeeded && records.length === 2 && records.some(function(record) { return record.path === "/tmp/Rider & 日本語" && record.openedAt === 1700000000000; }) && records.some(function(record) { return record.path.endsWith("/project.sln") && record.kind === "file"; }), "Rider history read failed: " + message + " " + details + " " + JSON.stringify(records))) return;
            const broken = Properties.create({ installationType: "native", id: checks.fixture.thirdIdentifier, name: "Rider", executable: "rider", config: checks.fixture.fixtureRoot + "/BrokenRider", extraArguments: [] });
            checks.reader.read(Api.create(), broken, function(ignored, error, detail, success) {
                if (!checks.fixture.expect(!success && !!error, "damaged Rider history looked successful")) return;
                checks.reader.destroy();
                checks.reader = null;
                checks.checkMixedVersions(next);
            });
        });
    }

    // One damaged version folder is reported and skipped; the readable version still supplies its items and the read succeeds.
    function checkMixedVersions(next) {
        const mixed = Properties.create({ installationType: "native", id: fixture.thirdIdentifier, name: "Rider", executable: "rider", config: fixture.fixtureRoot + "/RiderMixed", extraArguments: [] });
        const mixedReader = entry.readerType.createObject(null);
        mixedReader.read(Api.create(), mixed, function(records, message, details, succeeded) {
            mixedReader.destroy();
            if (!fixture.expect(succeeded && message === "" && records.some(function(record) { return record.path.endsWith("/project.sln"); }) && !!details,
                "a damaged version folder discarded the readable one: " + message + " " + details + " " + JSON.stringify(records))) return;
            next();
        });
    }
}
