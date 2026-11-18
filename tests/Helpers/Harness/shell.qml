// shell.qml - Exercise the real Quickshell Process and launcher item lifecycle offscreen.
import QtQuick
import QtQuick.Window
import Quickshell
import qs.DCommon.Common as DuxCommon
import qs.Common as HostCommon
import qs.Services as DuxServices

ShellRoot {
    id: root

    property bool finished: false
    property bool verifiedProvider: false
    property int validationPhase: 0
    property bool duplicateCheckPending: false
    property int argumentValidationPhase: 0
    property int iconWaitAttempts: 0
    property int pluginDataChanges: 0
    property int liveRefreshNotifications: 0
    property int notificationPhase: 0
    property real compactIdeHeight: 0
    property real compactIdeSectionHeight: 0
    property bool firstIdeCheckFinished: false
    property bool rankingVerified: false
    property var settings: ({
        "folders": [],
        "providers": [{ "id": "6a54e4b5-6173-46bf-8bd1-8f3960905460", "type": "vscode", "name": "VS Code", "config": Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/Code", "executable": Quickshell.env("DEV_LAUNCHER_CODE_PATH"), "shared": "", "extraArguments": ["--reuse-window", "--profile", "Work"] }],
        "defaultProvider": "6a54e4b5-6173-46bf-8bd1-8f3960905460",
        "usage": {
        }
    })
    property var globals: ({
    })
    property var launcher: null
    property var orchestrator: null
    property var settingsPage: null
    readonly property alias testWindowSurface: testWindow
    readonly property alias testPluginService: pluginService
    readonly property alias fileMetadataService: fileMetadata
    readonly property alias compositePreviewItem: compositePreview
    readonly property alias repositoryPreviewItem: repositoryPreview
    property var settingsChecks: null
    property var launcherChecks: null
    property var providerChecks: null
    property var orchestratorChecks: null

    Component.onCompleted: {
        HostCommon.SettingsData.pluginSettings = { devLauncher: root.settings };
        DuxCommon.Host.files = fileMetadata;
        const launcherComponent = Qt.createComponent("file://" + Quickshell.env("DEV_LAUNCHER_PLUGIN_ROOT") + "/src/QML/Launcher.qml");
        const orchestratorComponent = Qt.createComponent("file://" + Quickshell.env("DEV_LAUNCHER_PLUGIN_ROOT") + "/src/QML/Services/ScanOrchestrator.qml");
        const settingsComponent = Qt.createComponent("file://" + Quickshell.env("DEV_LAUNCHER_PLUGIN_ROOT") + "/src/QML/Settings.qml");
        if (launcherComponent.status !== Component.Ready || orchestratorComponent.status !== Component.Ready || settingsComponent.status !== Component.Ready) {
            console.warn("T:FAIL component load " + launcherComponent.errorString() + orchestratorComponent.errorString() + settingsComponent.errorString());
            Qt.quit();
            return ;
        }
        const checksRoot = "file://" + Quickshell.env("DEV_LAUNCHER_PLUGIN_ROOT") + "/tests/Integration/QML/";
        const checkPaths = ["SettingsPage.test.qml", "Launcher.test.qml", "Views/IdeSettings.test.qml", "Services/ScanOrchestrator.test.qml"];
        const checkComponents = checkPaths.map(function(relativePath) { return Qt.createComponent(checksRoot + relativePath); });
        if (checkComponents.some(function(component) { return component.status !== Component.Ready; })) {
            console.warn("T:FAIL check component load " + checkComponents.map(function(component) { return component.errorString(); }).join(" | "));
            Qt.quit();
            return;
        }
        settingsChecks = checkComponents[0].createObject(testWindow.contentItem, { fixture: root });
        launcherChecks = checkComponents[1].createObject(testWindow.contentItem, { fixture: root });
        providerChecks = checkComponents[2].createObject(testWindow.contentItem, { fixture: root });
        orchestratorChecks = checkComponents[3].createObject(testWindow.contentItem, { fixture: root });
        settingsPage = settingsComponent.createObject(testWindow.contentItem, { "width": 1000 });
        if (!settingsChecks.initialize(settingsComponent)) return;
        launcher = launcherComponent.createObject(testWindow.contentItem, {
            "pluginService": pluginService
        });
        orchestrator = orchestratorComponent.createObject(testWindow.contentItem, {
            "pluginService": pluginService
        });
        if (!orchestrator || orchestrator.scanRunning || root.globals.scannedAt !== undefined || orchestrator.notificationFolders.length !== 0) {
            console.warn("T:FAIL orchestrator started scanning without a search");
            Qt.quit();
            return;
        }
        launcher.getItems("sample");
        if (!orchestrator.scanRunning || !root.globals.refreshRequest) {
            console.warn("T:FAIL search did not start scan on demand");
            Qt.quit();
            return;
        }
        pluginService.setGlobalVar("devLauncher", "refreshRequest", Date.now());
        if (!orchestrator.scanRunning || orchestrator.rescanPending) {
            console.warn("T:FAIL duplicate refresh queued during active scan");
            Qt.quit();
        }
    }

    Window {
        id: testWindow

        visible: true
        width: 1
        height: 1
        Image { id: compositePreview; sourceSize.width: 64; sourceSize.height: 64 }
        Image { id: repositoryPreview; sourceSize.width: 64; sourceSize.height: 64 }
    }

    QtObject {
        id: fileMetadata
        property bool connected: true
        property int requests: 0
        property double modifiedAt: Date.now() - 2 * 3600000
        function stat(path, callback) {
            requests++;
            Qt.callLater(function() {
                if (path.endsWith("missing-project.js")) {
                    callback({ "error": "No such file or directory", "code": "ENOENT" });
                    return;
                }
                callback({ "entry": { "iconName": path.endsWith(".code-workspace") ? "missing-workspace-icon" : path.endsWith(".js") ? "text-x-javascript" : path.endsWith(".yaml") ? "text-x-yaml" : "folder-special", "mtimeMs": path.endsWith("old-project.js") ? Date.now() - 2 * 365 * 86400000 : modifiedAt } });
            });
        }
    }

    // Supply the same plugin service methods and signals that Dux passes to both surfaces.
    QtObject {
        id: pluginService

        signal pluginDataChanged(string pluginId)
        signal globalVarChanged(string pluginId, string name)

        function loadPluginData(pluginId, name, defaultValue) {
            return root.settings[name] !== undefined ? root.settings[name] : defaultValue;
        }

        function savePluginData(pluginId, name, value) {
            root.settings[name] = value;
            root.pluginDataChanges++;
            pluginDataChanged(pluginId);
            return true;
        }

        function getGlobalVar(pluginId, name, defaultValue) {
            return root.globals[name] !== undefined ? root.globals[name] : defaultValue;
        }

        function setGlobalVar(pluginId, name, value) {
            root.globals[name] = value;
            DuxServices.PluginService.setGlobalVar(pluginId, name, value);
            globalVarChanged(pluginId, name);
        }

    }

}
