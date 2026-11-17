// RepositoryScanner.test.qml - Check repository cap and skipped-folder error.
import QtQuick

QtObject {
    id: checks
    required property var fixture
    readonly property var root: fixture
    readonly property var expect: fixture.expect

    // Scan one repository-heavy folder and then a second folder that the cap prevents from being scanned.
    function startScannerCheck() {
        root.scanner = root.scannerComponent.createObject(null);
        root.scanner.finished.connect(checks.handleScanFinished);
        const manyRoot = root.fixtureRoot + "/many-root";
        const otherRoot = root.fixtureRoot + "/other-root";
        if (!expect(root.scanner.start([manyRoot, otherRoot], 3), "scanner did not start")) return;
    }

    // Check that the skipped folder is reported and the capped folder kept its 500 repositories.
    function handleScanFinished(snapshot) {
        const otherRoot = root.fixtureRoot + "/other-root";
        const skipped = snapshot.errors.filter(function(error) { return error.path === otherRoot; });
        if (!expect(snapshot.repositories.length === 500, "scanner did not keep the 500 capped repositories: " + snapshot.repositories.length)) return;
        if (!expect(snapshot.errors.length === 1 && skipped.length === 1 && skipped[0].message.includes("limit of 500"),
            "scanner did not report the folder skipped by the cap: " + JSON.stringify(snapshot.errors))) return;
        console.warn("T:PASS regression fixes");
        Qt.quit();
    }
}
