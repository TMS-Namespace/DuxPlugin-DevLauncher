// Launcher.test.qml - Exercise icons, details, item dates, and result ordering.
// Rules: Runs in the offscreen shell; icons, details, date caps, and result order must match, and the first failed check prints T:FAIL and quits.
import "../../../../src/Plugin/QML/Services" as Services
import QtQuick
import Quickshell
import qs.Common as HostCommon

Item {
    id: checks

    required property var fixture
    readonly property var root: fixture
    readonly property string fixturePath: Quickshell.env("DEV_LAUNCHER_FIXTURE")
    readonly property var fileMetadata: fixture.fileMetadataService
    readonly property var compositePreview: fixture.compositePreviewItem
    readonly property var repositoryPreview: fixture.repositoryPreviewItem
    // Each injected record belongs to the test source named by its provider. Every call adds to that source's answer,
    // so earlier injections stay, and then the cache is ordered as a scan would order it.
    property var injectedBySource: ({
    })

    // Starts the timer that runs the main launcher checks (icons, details, missing items, and ordering).
    function startLaunchCheck() {
        launchCheck.start();
    }

    // Adds the given records to their sources' answers, re-publishes each source, and then commits the cache order.
    function injectRecords(records) {
        for (const record of records) {
            const sourceId = record.provider;
            const answer = (injectedBySource[sourceId] || []).concat([record]);
            injectedBySource[sourceId] = answer;
            Services.RecentItemsCache.reconcileSource(sourceId, record.providerName || "Test source", answer, true, Date.now());
        }
        Services.RecentItemsCache.commit();
    }

    // A missing path is removed once its modification time has been read, which takes a short stat process; poll until it is gone.
    Timer {
        id: missingCheck

        property int attempts: 0

        interval: 100
        repeat: false
        onTriggered: {
            if (root.launcher.getItems("missing-project").length !== 0) {
                if (attempts++ < 40) {
                    restart();
                    return ;
                }
                console.warn("T:FAIL missing result still displayed");
                Qt.quit();
            }
        }
    }

    Timer {
        id: launchCheck

        interval: 150
        repeat: false
        onTriggered: {
            const repositoryIcon = root.launcher.getItems("sample")[0];
            const fileIcon = root.launcher.getItems("example")[0];
            const providerIcon = root.settingsPage.ideSettingsView.providerRows.itemAt(0).iconRenderer.iconValue;
            if (fileIcon && !fileIcon.icon.startsWith("svg:data:image/svg+xml,") && root.iconWaitAttempts++ < 5) {
                launchCheck.restart();
                return ;
            }
            // Four Dux stat requests: three icon lookups, and the stat of the VS Code history file that dates its entries. None is retried.
            const repositorySvg = repositoryIcon ? decodeURIComponent(repositoryIcon.icon.slice(4)) : "";
            const fileSvg = fileIcon ? decodeURIComponent(fileIcon.icon.slice(4)) : "";
            if (!repositoryIcon || !repositoryIcon.icon.startsWith("svg:data:image/svg+xml,") || !repositorySvg.includes('fill="#2277bb"') || !repositorySvg.includes('fill="#1188dd"') || !repositorySvg.includes('rx="6"') || !repositorySvg.includes('d="M42 44v11') || repositorySvg.includes("<circle") || repositoryIcon.iconType !== "image" || !fileIcon || !fileIcon.icon.startsWith("svg:data:image/svg+xml,") || !fileSvg.includes('fill="#ddaa11"') || !fileSvg.includes('fill="#1188dd"') || !fileSvg.includes('rx="6"') || fileSvg.includes("<circle") || fileIcon.iconType !== "image" || !fileIcon.comment.endsWith(" · " + fileIcon.path) || !/^(just now|\d+[mhdwoy] ago) · /.test(fileIcon.comment) || fileIcon.comment.includes("Modified") || fileIcon.comment.includes("Open with") || !providerIcon.startsWith("image:") || fileMetadata.requests !== 4 || root.liveRefreshNotifications < 1) {
                console.warn("T:FAIL themed file icon or executable badge: " + JSON.stringify({
                    "file": fileIcon ? [fileIcon.comment, fileIcon.iconType, fileIcon.icon.slice(0, 30)] : null,
                    "requests": fileMetadata.requests,
                    "provider": providerIcon,
                    "live": root.liveRefreshNotifications,
                    "repo": repositoryIcon ? repositoryIcon.icon.slice(0, 30) : null
                }));
                Qt.quit();
                return ;
            }
            root.settingsPage.showBadgesToggle.toggled(false);
            const plainFile = root.launcher.getItems("example")[0];
            const plainRepository = root.launcher.getItems("sample")[0];
            if (root.settings.showBadges !== false || root.settingsPage.controller.showBadges || plainFile.icon.startsWith("svg:data:") || plainRepository.icon.startsWith("svg:data:")) {
                console.warn("T:FAIL disabling result badges");
                Qt.quit();
                return ;
            }
            root.settingsPage.showBadgesToggle.toggled(true);
            if (!root.settingsPage.controller.showBadges || root.settings.showBadges !== true || root.launcher.getItems("example")[0].icon !== fileIcon.icon) {
                console.warn("T:FAIL enabling result badges");
                Qt.quit();
                return ;
            }
            compositePreview.source = fileIcon.icon.slice(4);
            repositoryPreview.source = repositoryIcon.icon.slice(4);
            compositeCheck.start();
            checks.injectRecords([{
                "path": checks.fixturePath + "/second-example.js",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": 0
            }]);
            // The new file costs one request, and its icon is the same as the shared type's. Requests are counted per step, because the VS Code reader also stats on refresh.
            const sameTypeBefore = fileMetadata.requests;
            const sameTypeIcon = root.launcher.getItems("second-example")[0];
            if (!sameTypeIcon || sameTypeIcon.icon !== fileIcon.icon || fileMetadata.requests - sameTypeBefore !== 1) {
                console.warn("T:FAIL file type icon cache");
                Qt.quit();
                return ;
            }
            const sharedTypeBefore = fileMetadata.requests;
            checks.injectRecords([{
                "path": checks.fixturePath + "/icon-fixture-one.yaml",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": 0
            }, {
                "path": checks.fixturePath + "/icon-fixture-two.yaml",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": 0
            }]);
            // Each new file path costs one Dux stat request, even when the files share one icon type.
            if (root.launcher.getItems("icon-fixture").length !== 2 || fileMetadata.requests - sharedTypeBefore !== 2) {
                console.warn("T:FAIL path checks for shared file type");
                Qt.quit();
                return ;
            }
            root.launcher.getContextMenuActions(fileIcon).find(function(choice) {
                return choice.text === "Details";
            }).action();
            if (!root.launcher.detailsPanel.shouldBeVisible || !root.launcher.detailsPanel.dialog.embedded || !root.launcher.detailsPanel.detailsText.includes("Source: VS Code") || !root.launcher.detailsPanel.detailsText.includes("Modified: " + new Date(fileMetadata.modifiedAt).toISOString())) {
                console.warn("T:FAIL visible result details");
                Qt.quit();
                return ;
            }
            root.launcher.detailsPanel.close();
            if (root.launcher.detailsPanel.shouldBeVisible) {
                console.warn("T:FAIL result details modal did not close");
                Qt.quit();
                return ;
            }
            const copyAction = root.launcher.getContextMenuActions(fileIcon).find(function(choice) {
                return choice.text === "Copy path";
            });
            if (!copyAction) {
                console.warn("T:FAIL copy path action is missing");
                Qt.quit();
                return ;
            }
            copyAction.action();
            if (Quickshell.clipboardText !== fileIcon.path) {
                console.warn("T:FAIL copy path did not update the clipboard");
                Qt.quit();
                return ;
            }
            const folderAction = root.launcher.getContextMenuActions(repositoryIcon).find(function(choice) {
                return choice.text === "Open folder";
            });
            if (!folderAction) {
                console.warn("T:FAIL repository result has no Open folder action");
                Qt.quit();
                return ;
            }
            folderAction.action();
            const missingBefore = fileMetadata.requests;
            checks.injectRecords([{
                "path": "/tmp/missing-project.js",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": 0
            }]);
            if (root.launcher.getItems("missing-project").length !== 1 || fileMetadata.requests - missingBefore !== 1) {
                console.warn("T:FAIL initial missing-path check");
                Qt.quit();
                return ;
            }
            missingCheck.attempts = 0;
            missingCheck.start();
            checks.injectRecords([{
                "path": checks.fixturePath + "/history-capped.js",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": Date.now(),
                "openedAt": Date.now() - 10 * 86400000
            }, {
                "path": checks.fixturePath + "/history-expired.js",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": Date.now(),
                "openedAt": Date.now() - 2 * 365 * 86400000
            }]);
            const historyCapped = root.launcher.getItems("history-capped")[0];
            if (!historyCapped || !historyCapped.comment.startsWith("1w ago · ") || root.launcher.getItems("history-expired").length !== 0) {
                console.warn("T:FAIL provider history date cap");
                Qt.quit();
                return ;
            }
            checks.injectRecords([{
                "path": checks.fixturePath + "/sort-older.js",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": Date.now(),
                "openedAt": Date.now() - 8 * 86400000
            }, {
                "path": checks.fixturePath + "/sort-newer.js",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": Date.now() - 3600000,
                "openedAt": Date.now() - 6 * 86400000
            }]);
            root.launcher.getItems("sort-");
            rankingCheck.start();
            checks.injectRecords([{
                "path": checks.fixturePath + "/workspace.code-workspace",
                "kind": "workspace",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": 0
            }]);
            root.launcher.getItems("workspace.code-workspace");
            root.providerChecks.startWorkspaceCheck();
            checks.injectRecords([{
                "path": "/tmp/old-project.js",
                "kind": "file",
                "provider": root.settings.providers[0].id,
                "providerName": "VS Code",
                "recent": 0
            }]);
            if (root.launcher.getItems("old-project").length !== 1) {
                console.warn("T:FAIL initial old item visibility");
                Qt.quit();
                return ;
            }
            // Complete one discovery transaction for all records injected above.
            root.orchestrator.refreshDates();
            oldItemCheck.start();
        }
    }

    Timer {
        id: rankingCheck

        interval: 150
        repeat: false
        onTriggered: {
            const results = root.launcher.getItems("sort-");
            if (results.length !== 2 || results[0].path !== checks.fixturePath + "/sort-newer.js" || results[1].path !== checks.fixturePath + "/sort-older.js" || results[0].recent <= results[1].recent) {
                console.warn("T:FAIL launcher order differs from displayed age");
                Qt.quit();
                return ;
            }
            root.rankingVerified = true;
        }
    }

    // An old item disappears once its modification time has been read; poll until then.
    Timer {
        id: oldItemCheck

        property int attempts: 0

        interval: 100
        repeat: false
        onTriggered: {
            if (root.launcher.getItems("old-project").length !== 0) {
                if (attempts++ < 40) {
                    restart();
                    return ;
                }
                console.warn("T:FAIL old item still displayed");
                Qt.quit();
            }
        }
    }

    Timer {
        id: compositeCheck

        interval: 100
        repeat: false
        onTriggered: {
            if (compositePreview.status !== Image.Ready || repositoryPreview.status !== Image.Ready) {
                console.warn("T:FAIL rounded badge composite did not render");
                Qt.quit();
            }
        }
    }

}
