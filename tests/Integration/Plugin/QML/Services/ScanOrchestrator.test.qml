// ScanOrchestrator.test.qml - Exercise on-demand scanning, refresh, and warning delivery.
import QtQuick
import Quickshell
import qs.Common as HostCommon
import qs.Services as DuxServices
import "../../../../../src/Plugin/QML/Services" as Services

Item {
    id: checks
    required property var fixture
    readonly property var root: fixture
    readonly property var pluginService: fixture.testPluginService
    readonly property var settingsPage: fixture.settingsPage
    readonly property var launcher: fixture.launcher

    function startSystemLaunchCheck() { systemLaunchCheck.start(); }

    Connections {
        target: HostCommon.SettingsData
        function onLauncherPluginVisibilityChanged() {
            if (Services.ScanState.scannedAt) root.liveRefreshNotifications++;
        }
    }

    Connections {
        function onScanPublished() {
            if (!Services.ScanState.scannedAt) return;
            if (root.notificationPhase > 0) {
                const completedPhase = root.notificationPhase;
                Qt.callLater(function() {
                    const messages = DuxServices.ToastService.messages;
                    const blockedPath = Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/blocked-root";
                    if (completedPhase === 1) {
                        if (messages.length !== 1 || !messages[0].includes(blockedPath) || !messages[0].includes("permission denied")) {
                            console.warn("T:FAIL new repository folder warning");
                            Qt.quit();
                            return;
                        }
                        root.notificationPhase = 2;
                        root.orchestrator.refresh();
                    } else if (messages.length !== 1) {
                        console.warn("T:FAIL repository warning repeated on rescan");
                        Qt.quit();
                    } else {
                        root.verifiedProvider = true;
                        console.warn("T:PASS QML entry points");
                        Qt.quit();
                    }
                });
                return;
            }
            if (root.finished) return;
            if (Services.RecentItemsCache.sortCount !== 1 || Services.RecentItemsCache.ordered.some(function(entry) { return entry.statAt === 0; })) {
                console.warn("T:FAIL discovery published before its date checks, or sorted more than once");
                Qt.quit();
                return;
            }

            if (!settingsPage.controller.setResultsLimit("25") || launcher.getItems("").length !== 3 || root.settings.resultsLimit !== 25 || settingsPage.controller.setResultsLimit("30") || !settingsPage.controller.setResultsLimit("100") || root.pluginDataChanges !== 0 || !settingsPage.globalSettingsGroup.expanded) {
                console.warn("T:FAIL global result limit setting");
                Qt.quit();
                return;
            }
            if (launcher.getItems("dev-launcher-").length !== 0) {
                console.warn("T:FAIL path matched with path search off");
                Qt.quit();
                return;
            }
            settingsPage.searchPathsToggle.toggled(true);
            if (!settingsPage.controller.searchPaths || launcher.getItems("dev-launcher-").length === 0 || root.pluginDataChanges !== 0 || !settingsPage.globalSettingsGroup.expanded) {
                console.warn("T:FAIL path search toggle on");
                Qt.quit();
                return;
            }
            settingsPage.searchPathsToggle.toggled(false);
            if (settingsPage.controller.searchPaths || launcher.getItems("dev-launcher-").length !== 0) {
                console.warn("T:FAIL path search toggle off");
                Qt.quit();
                return;
            }
            const items = launcher.getItems("sample");
            const primaryItem = items.find(function(item) { return item.name === "sample"; });
            const fileItems = launcher.getItems("example");
            const secondItems = launcher.getItems("second-sample");
            const fileActions = launcher.getContextMenuActions(fileItems[0]);
            root.finished = true;
            if (items.length !== 2 || secondItems.length !== 1 || fileItems.length !== 1 || !primaryItem || primaryItem.provider !== root.settings.providers[0].id || !Services.RecentItemsCache.ordered.some(function(entry) { return entry.path.endsWith("/sample") && entry.sources.some(function(source) { return source.id === root.settings.providers[0].id; }); }) || !fileActions.some(function(choice) { return choice.text === "Open with VS Code"; }) || !fileActions.some(function(choice) { return choice.text === "Open with system default"; }) || !fileActions.some(function(choice) { return choice.text === "Open containing folder"; }) || !fileActions.some(function(choice) { return choice.text === "Details"; }) || settingsPage.saveValue("trigger", "`") !== true) {
                console.warn("T:FAIL unexpected launcher items " + JSON.stringify({ items: items, secondCount: secondItems.length, fileCount: fileItems.length, sources: Services.RecentItemsCache.ordered.map(function(entry) { return { path: entry.path, sources: entry.sources }; }), actions: fileActions.map(function(action) { return action.text; }) }));
                Qt.quit();
                return ;
            }
            fileActions.find(function(choice) { return choice.text === "Open containing folder"; }).action();
            launcher.executeItem(primaryItem);
            root.launcherChecks.startLaunchCheck();
        }

        target: Services.ScanState
    }

    Timer {
        id: systemLaunchCheck
        interval: 150
        repeat: false
        onTriggered: {
            if (DuxServices.ToastService.messages.length !== 0) {
                console.warn("T:FAIL repository warning on startup");
                Qt.quit();
                return;
            }
            root.notificationPhase = 1;
            root.settingsPage.controller.addFolder(Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/blocked-root");
            if (root.orchestrator.scanRunning) {
                console.warn("T:FAIL saving a folder started discovery without a search");
                Qt.quit();
                return;
            }
            root.launcher.lastRequest = 0;
            root.launcher.getItems("new scan folder");
        }
    }

    Timer {
        interval: 9000
        running: true
        repeat: false
        onTriggered: {
            if (!root.finished || !root.verifiedProvider || !root.rankingVerified)
                console.warn("T:FAIL scan or provider validation timed out");

            Qt.quit();
        }
    }

}
