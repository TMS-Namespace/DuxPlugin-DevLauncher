// Launcher.test.qml - Exercise icons, details, item dates, and result ordering.
import QtQuick
import Quickshell
import qs.Common as HostCommon

Item {
    id: checks
    required property var fixture
    readonly property var root: fixture
    readonly property var fileMetadata: fixture.fileMetadataService
    readonly property var compositePreview: fixture.compositePreviewItem
    readonly property var repositoryPreview: fixture.repositoryPreviewItem

    function startLaunchCheck() { launchCheck.start(); }

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
                return;
            }
            const repositorySvg = repositoryIcon ? decodeURIComponent(repositoryIcon.icon.slice(4)) : "";
            const fileSvg = fileIcon ? decodeURIComponent(fileIcon.icon.slice(4)) : "";
            if (!repositoryIcon || !repositoryIcon.icon.startsWith("svg:data:image/svg+xml,") || !repositorySvg.includes('fill="#2277bb"') || !repositorySvg.includes('fill="#1188dd"') || !repositorySvg.includes('rx="6"') || !repositorySvg.includes('d="M42 44v11') || repositorySvg.includes("<circle") || repositoryIcon.iconType !== "image" || !fileIcon || !fileIcon.icon.startsWith("svg:data:image/svg+xml,") || !fileSvg.includes('fill="#ddaa11"') || !fileSvg.includes('fill="#1188dd"') || !fileSvg.includes('rx="6"') || fileSvg.includes("<circle") || fileIcon.iconType !== "image" || !fileIcon.comment.startsWith(fileIcon.path + " · ") || !/\d+[mhdwoy] ago$/.test(fileIcon.comment) || fileIcon.comment.includes("Modified") || fileIcon.comment.includes("Open with") || !providerIcon.startsWith("image:") || fileMetadata.requests !== 3 || root.liveRefreshNotifications < 1) {
                console.warn("T:FAIL themed file icon or executable badge");
                Qt.quit();
                return;
            }
            compositePreview.source = fileIcon.icon.slice(4);
            repositoryPreview.source = repositoryIcon.icon.slice(4);
            compositeCheck.start();
            root.globals.records = root.globals.records.concat([{ path: "/tmp/second-example.js", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: 0 }]);
            const sameTypeIcon = root.launcher.getItems("second-example")[0];
            if (!sameTypeIcon || sameTypeIcon.icon !== fileIcon.icon || fileMetadata.requests !== 4) {
                console.warn("T:FAIL file type icon cache");
                Qt.quit();
                return;
            }
            root.globals.records = root.globals.records.concat([
                { path: "/tmp/icon-fixture-one.yaml", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: 0 },
                { path: "/tmp/icon-fixture-two.yaml", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: 0 }
            ]);
            if (root.launcher.getItems("icon-fixture").length !== 2 || fileMetadata.requests !== 6) {
                console.warn("T:FAIL path checks for shared file type");
                Qt.quit();
                return;
            }
            root.launcher.getContextMenuActions(fileIcon).find(function(choice) { return choice.text === "Details"; }).action();
            if (!root.launcher.detailsPanel.shouldBeVisible || !root.launcher.detailsPanel.allowStacking || !root.launcher.detailsPanel.useOverlayLayer || !root.launcher.detailsPanel.contentLoader.item || !root.launcher.detailsPanel.contentLoader.item.embedded || !root.launcher.detailsPanel.detailsText.includes("Source: VS Code") || !root.launcher.detailsPanel.detailsText.includes("Modified: " + new Date(fileMetadata.modifiedAt).toISOString())) {
                console.warn("T:FAIL visible result details");
                Qt.quit();
                return;
            }
            root.launcher.detailsPanel.close();
            if (root.launcher.detailsPanel.shouldBeVisible) {
                console.warn("T:FAIL result details modal did not close");
                Qt.quit();
                return;
            }
            const copyAction = root.launcher.getContextMenuActions(fileIcon).find(function(choice) { return choice.text === "Copy path"; });
            if (!copyAction) {
                console.warn("T:FAIL copy path action is missing");
                Qt.quit();
                return;
            }
            copyAction.action();
            if (Quickshell.clipboardText !== fileIcon.path) {
                console.warn("T:FAIL copy path did not update the clipboard");
                Qt.quit();
                return;
            }
            const folderAction = root.launcher.getContextMenuActions(repositoryIcon).find(function(choice) { return choice.text === "Open folder"; });
            if (!folderAction) {
                console.warn("T:FAIL repository result has no Open folder action");
                Qt.quit();
                return;
            }
            folderAction.action();
            root.globals.records = root.globals.records.concat([{ path: "/tmp/missing-project.js", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: 0 }]);
            if (root.launcher.getItems("missing-project").length !== 1 || fileMetadata.requests !== 7) {
                console.warn("T:FAIL initial missing-path check");
                Qt.quit();
                return;
            }
            Qt.callLater(function() {
                if (root.launcher.getItems("missing-project").length !== 0) {
                    console.warn("T:FAIL missing result still displayed");
                    Qt.quit();
                }
            });
            root.globals.records = root.globals.records.concat([
                { path: "/tmp/history-capped.js", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: Date.now(), openedAt: Date.now() - 10 * 86400000 },
                { path: "/tmp/history-expired.js", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: Date.now(), openedAt: Date.now() - 2 * 365 * 86400000 }
            ]);
            const historyCapped = root.launcher.getItems("history-capped")[0];
            if (!historyCapped || !historyCapped.comment.endsWith("1w ago") || root.launcher.getItems("history-expired").length !== 0) {
                console.warn("T:FAIL provider history date cap");
                Qt.quit();
                return;
            }
            root.globals.records = root.globals.records.concat([
                { path: "/tmp/sort-older.js", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: Date.now(), openedAt: Date.now() - 8 * 86400000 },
                { path: "/tmp/sort-newer.js", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: Date.now() - 3600000, openedAt: Date.now() - 6 * 86400000 }
            ]);
            root.launcher.getItems("sort-");
            rankingCheck.start();
            root.globals.records = root.globals.records.concat([{ path: "/tmp/workspace.code-workspace", kind: "workspace", provider: root.settings.providers[0].id, providerName: "VS Code", recent: 0 }]);
            root.launcher.getItems("workspace.code-workspace");
            root.providerChecks.startWorkspaceCheck();
            root.globals.records = root.globals.records.concat([{ path: "/tmp/old-project.js", kind: "file", provider: root.settings.providers[0].id, providerName: "VS Code", recent: 0 }]);
            if (root.launcher.getItems("old-project").length !== 1) {
                console.warn("T:FAIL initial old item visibility");
                Qt.quit();
                return;
            }
            oldItemCheck.start();
        }
    }

    Timer {
        id: rankingCheck
        interval: 150
        repeat: false
        onTriggered: {
            const results = root.launcher.getItems("sort-");
            if (results.length !== 2 || results[0].path !== "/tmp/sort-newer.js" || results[1].path !== "/tmp/sort-older.js" || results[0].recent <= results[1].recent) {
                console.warn("T:FAIL launcher order differs from displayed age");
                Qt.quit();
                return;
            }
            root.rankingVerified = true;
        }
    }

    Timer {
        id: oldItemCheck
        interval: 150
        repeat: false
        onTriggered: {
            if (root.launcher.getItems("old-project").length !== 0) {
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
