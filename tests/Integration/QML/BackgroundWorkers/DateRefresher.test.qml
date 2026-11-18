// DateRefresher.test.qml - Check that a refresh reads real modification times and reports the paths that do not exist.
import QtQuick
import Quickshell
import "../../../../src/QML/BackgroundWorkers" as Workers

QtObject {
    id: checks
    required property var fixture
    readonly property var refresher: Workers.DateRefresher {}
    // Refresh one existing file and one absent file; the callback runs once the batch has been read, and then continues.
    function startRefresherCheck(next) {
        const existing = fixture.fixtureRoot + "/example.js";
        const absent = fixture.fixtureRoot + "/missing-project.js";
        const unicodeBackup = fixture.fixtureRoot + "/backup.02：30：01Z.gzip.sql";
        const unicodeShare = fixture.fixtureRoot + "/share$/Värmland.tsv";
        const unicodeExisting = Quickshell.env("DEV_LAUNCHER_UNICODE_ROOT") + "/file\nname\t ";
        const inaccessible = fixture.fixtureRoot + "/private-stat/file";
        refresher.refresh([existing, unicodeExisting, absent, unicodeBackup, unicodeShare, unicodeExisting + "-absent", inaccessible], function(modifiedByPath, missing) {
            if (!fixture.expect(modifiedByPath[existing] > 0 && modifiedByPath[unicodeExisting] > 0 && missing.length === 4 && [absent, unicodeBackup, unicodeShare, unicodeExisting + "-absent"].every(function(path) { return missing.includes(path); }),
                "the refresh did not distinguish absent and unreadable paths: " + JSON.stringify(modifiedByPath) + " " + JSON.stringify(missing))) return;
            next();
        });
    }

}
