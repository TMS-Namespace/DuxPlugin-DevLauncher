// LauncherRefresh.test.qml - A redraw reads the cache; throttled discovery never schedules work for later.
import QtQuick
import "../../../src/QML/Services" as Services
import "../../../src/JS/Helpers/Config.js" as Config

QtObject {
    id: checks
    required property var fixture
    property var launcher: null
    property var nextCheck: null
    property var expectedRequest: null
    property int expectedSortCount: 0
    property string existingPath: ""

    // Pretend a throttle interval is about to expire, then redraw a stale cache without changing the query.
    function startIdleCheck(next) {
        nextCheck = next;
        existingPath = fixture.fixtureRoot + "/example.js";
        Services.RecentItemsCache.entries = ({});
        Services.RecentItemsCache.ordered = [];
        Services.RecentItemsCache.reconcileSource(fixture.thirdIdentifier, "Idle", [{ path: existingPath, kind: "file", openedAt: Date.now() }], true, Date.now());
        Services.RecentItemsCache.commit();
        launcher = fixture.launcherComponent.createObject(null, { pluginService: fixture.testPluginService });
        fixture.testPluginService.setGlobalVar(Config.pluginId, "scannedAt", Date.now());
        launcher.getItems("example");
        fixture.testPluginService.setGlobalVar(Config.pluginId, "scannedAt", Date.now() - Config.refreshMilliseconds - 1);
        launcher.lastRequest = Date.now() - Config.refreshMilliseconds + 50;
        launcher.getItems("example typed");
        expectedRequest = fixture.globals.refreshRequest;
        expectedSortCount = Services.RecentItemsCache.sortCount;
        idleCheck.start();
    }

    property Timer idleCheck: Timer {
        interval: 150
        repeat: false
        onTriggered: {
            // Expired throttles do nothing by themselves, including when Dux redraws an unchanged query.
            checks.launcher.lastRequest = 0;
            checks.launcher.getItems("example typed");
            const cached = Services.RecentItemsCache.entries[checks.existingPath];
            if (!checks.fixture.expect(checks.fixture.globals.refreshRequest === checks.expectedRequest && cached.statAt === 0 && Services.RecentItemsCache.sortCount === checks.expectedSortCount,
                "an idle redraw or expired throttle started discovery, queried dates, or reordered results")) return;
            // A search starts with the empty query: a stale scan is requested then, even when the throttle has expired.
            checks.launcher.lastRequest = 0;
            checks.launcher.getItems("");
            const startRequest = checks.fixture.globals.refreshRequest;
            if (!checks.fixture.expect(startRequest !== checks.expectedRequest,
                "a new search with a stale scan did not request discovery")) return;
            // Typing does not start a scan for each character: the throttle is recent, and the expired throttle below is not used.
            checks.launcher.getItems("e");
            checks.launcher.getItems("ex");
            checks.launcher.lastRequest = 0;
            checks.launcher.getItems("exa");
            if (!checks.fixture.expect(checks.fixture.globals.refreshRequest === startRequest,
                "typing characters during a search requested discovery again")) return;
            checks.launcher.destroy();
            checks.launcher = null;
            checks.nextCheck();
        }
    }
}
