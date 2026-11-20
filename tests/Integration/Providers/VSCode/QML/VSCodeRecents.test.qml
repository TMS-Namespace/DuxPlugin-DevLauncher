// VSCodeRecents.test.qml - Check that a history read whose process never answers moves on to the next location, and that
// the read ends with one failed answer once no location is left.
// Rules: Runs in the offscreen shell with a history process that never answers; the read must move through each location and finish once.
import "../../../../../src/Plugin/QML/Services" as Services
import "../../../../../src/Providers/VSCode/JS/VSCodeApi.js" as VSCodeApi
import "../../../../../src/Providers/VSCode/JS/VSCodeProperties.js" as VSCodeProperties
import "../../../../../src/Providers/VSCode/QML" as Providers
import QtQuick

QtObject {
    required property var fixture
    property var reader

    // The default configuration has two history locations. Abandoning the first moves on to the second; abandoning the
    // second ends the read with one message that is marked as a failure, so the caller keeps its earlier items.
    function checkStuckReadMovesOnThenEnds() {
        const properties = VSCodeProperties.create({
            "installationType": "native",
            "id": fixture.firstIdentifier,
            "name": "Stuck",
            "config": fixture.fixtureRoot + "/Code",
            "executable": "code",
            "shared": "",
            "extraArguments": []
        });
        const results = [];
        // The stat for the database location never answers, like the history process the read is meant to abandon.
        const started = reader.read(VSCodeApi.create(), properties, function(records, message, details, succeeded) {
            results.push({
                "count": records.length,
                "message": message,
                "succeeded": succeeded
            });
        }, function() {
        });
        if (!fixture.expect(started && reader.running, "the history read did not start"))
            return false;

        reader.abandonRead();
        if (!fixture.expect(reader.running && results.length === 0, "abandoning one location did not move on to the next: " + JSON.stringify(results)))
            return false;

        reader.abandonRead();
        if (!fixture.expect(!reader.running && results.length === 1 && results[0].message.includes("did not finish") && results[0].succeeded === false, "the last abandoned location did not end the read as a failure: " + JSON.stringify(results)))
            return false;

        return fixture.expect(!reader.watchdog.running, "the watchdog kept running after the read ended");
    }

    // A cleared recent-history list is a successful answer that removes the IDE's previous cached entries.
    function checkClearedHistoryRemovesItems() {
        const id = fixture.secondIdentifier;
        const path = fixture.fixtureRoot + "/cleared-history-item";
        const properties = VSCodeProperties.create({
            "installationType": "native",
            "id": id,
            "name": "Cleared",
            "config": fixture.fixtureRoot + "/Code",
            "executable": "code",
            "shared": "",
            "extraArguments": []
        });
        Services.RecentItemsCache.reconcileSource(id, "Cleared", [{
            "path": path,
            "kind": "file",
            "openedAt": Date.now()
        }], true, Date.now());
        let answer = null;
        reader.read(VSCodeApi.create(), properties, function(records, message, details, succeeded) {
            answer = {
                "count": records.length,
                "message": message,
                "succeeded": succeeded
            };
            Services.RecentItemsCache.reconcileSource(id, "Cleared", records, succeeded, Date.now());
        });
        // A readable empty location is not final: the other location is tried first, and when it fails too the empty answer stands.
        reader.finishHistory({
            "entries": []
        }, Date.now());
        reader.abandonRead();
        return fixture.expect(answer && answer.count === 0 && answer.message === "" && answer.succeeded && !Services.RecentItemsCache.entries[path], "cleared history retained its cached items");
    }

    reader: Providers.VSCodeRecents {
    }

}
