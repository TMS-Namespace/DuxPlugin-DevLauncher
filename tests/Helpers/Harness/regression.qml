// regression.qml - Check the settings, launcher, folder-source, and icon-cache fixes against the real QML components.
import QtQuick
import Quickshell
import qs.Common as HostCommon
import qs.Services as DuxServices

ShellRoot {
    id: root

    readonly property string pluginRoot: Quickshell.env("DEV_LAUNCHER_PLUGIN_ROOT")
    readonly property string fixtureRoot: Quickshell.env("DEV_LAUNCHER_FIXTURE")
    readonly property string firstIdentifier: "6a54e4b5-6173-46bf-8bd1-8f3960905460"
    readonly property string secondIdentifier: "7b65f5c6-7284-47cf-9ce2-9a4a71a16571"
    readonly property string thirdIdentifier: "8c76a6d7-8395-48d0-8df3-ab5b82b27682"
    readonly property string unknownIdentifier: "9d87b7e8-94a6-49e1-9e04-bc6c93c3a793"
    readonly property string savedArgumentsWarning: "Saved command arguments are invalid. Enter them again before saving."

    property var settings: ({ "usage": {} })
    property var controller: null
    property var controllerComponent: null
    property var launcherComponent: null
    property var iconComponent: null
    property var iconService: null
    property var launcher: null
    property var globals: ({})
    readonly property alias testPluginService: pluginService
    property var settingsChecks: null
    property var launcherChecks: null
    property var iconChecks: null
    property var localGitChecks: null
    property var storageChecks: null
    property var validatorChecks: null
    property var providersChecks: null
    property var errorChecks: null
    property var databaseChecks: null
    property var folderViewChecks: null
    property var readerChecks: null
    property var orchestratorChecks: null
    property var refresherChecks: null
    property var refreshChecks: null
    property var metadataChecks: null
    property var zedChecks: null
    property var riderChecks: null

    // Report one failed expectation and stop the process so the runner sees the failure.
    function expect(condition, message) {
        if (condition) return true;
        console.warn("T:FAIL " + message);
        Qt.quit();
        return false;
    }

    // Run focused regression checks before the asynchronous folder-source case.
    function runSyncChecks() {
        if (!storageChecks.checkDamagedSettings() || !storageChecks.checkCorruptBackupIsKept() || !storageChecks.checkInstallationDefaultsOnLoad()) return false;
        if (!providersChecks.checkDuplicateIdentifierRefused() || !providersChecks.checkValidationPathsMatchFacade() || !providersChecks.checkDefaultsSeedDeclaredIdeOnly() || !errorChecks.checkDetailsStayOutOfToast() || !databaseChecks.checkApostrophePathRead() || !folderViewChecks.checkFolderRowShowsScanError() || !errorChecks.checkLaunchErrorsAlwaysShown()) return false;
        if (!readerChecks.checkStuckReadMovesOnThenEnds() || !readerChecks.checkClearedHistoryRemovesItems() || !orchestratorChecks.checkProviderErrorsStayOutOfToast() || !orchestratorChecks.checkFailedReadKeepsItems() || !orchestratorChecks.checkKnownSourcesSurviveScan()) return false;
        if (!metadataChecks.checkRedrawKeepsCachedMetadata()) return false;
        if (!validatorChecks.checkUnavailableProvider()) return false;
        if (!settingsChecks.checkRemovalAboveEditor() || !settingsChecks.checkRemovalOfEditedRow() || !settingsChecks.checkInvalidSavedArguments() || !settingsChecks.checkErrorFieldRouting() || !settingsChecks.checkTextEditsWaitForCommit() || !settingsChecks.checkBrokenInstallationComparison() || !settingsChecks.checkCancelEdit() || !settingsChecks.checkFolderScanErrorShown() || !settingsChecks.checkDependentFieldsFromDescriptor() || !settingsChecks.checkProviderErrorShown()) return false;
        if (!launcherChecks.checkMissingIdeLaunch() || !launcherChecks.checkRankingIsCached() || !launcherChecks.checkIdeAliasActions() || !iconChecks.checkIconMissCache() || !iconChecks.checkMultipleSources() || !iconChecks.checkBadgeMemoInvalidates()) return false;
        if (root.controller) root.controller.destroy();
        if (root.launcher) root.launcher.destroy();
        root.controller = null;
        root.launcher = null;
        return true;
    }

    Component.onCompleted: {
        HostCommon.SettingsData.pluginSettings = { devLauncher: root.settings };
        root.controllerComponent = Qt.createComponent("file://" + root.pluginRoot + "/src/QML/Helpers/SettingsController.qml");
        root.launcherComponent = Qt.createComponent("file://" + root.pluginRoot + "/src/QML/Launcher.qml");
        root.iconComponent = Qt.createComponent("file://" + root.pluginRoot + "/src/QML/Services/ResultItemIcon.qml");
        const components = [root.controllerComponent, root.launcherComponent, root.iconComponent];
        for (const component of components) {
            if (!expect(component.status === Component.Ready, "component load " + component.errorString())) return;
        }
        // A fresh instance of the real icon service keeps the cache under test independent of the shared singleton.
        root.iconService = root.iconComponent.createObject(null);
        const checksRoot = "file://" + root.pluginRoot + "/tests/Integration/QML/";
        const paths = ["Helpers/SettingsController.test.qml", "LauncherLaunch.test.qml", "Services/ResultItemIcon.test.qml", "Providers/LocalGit/LocalGitRecents.test.qml", "Services/DataStorage.test.qml", "BackgroundWorkers/ProviderValidator.test.qml", "Services/ProvidersManager.test.qml", "Services/ErrorHandler.test.qml", "Providers/VSCode/HistoryDatabase.test.qml", "Views/FolderSettings.test.qml", "Providers/VSCode/VSCodeRecents.test.qml", "Services/ScanOrchestratorErrors.test.qml", "BackgroundWorkers/DateRefresher.test.qml", "LauncherRefresh.test.qml", "Services/FileMetadataService.test.qml", "Providers/Zed/ZedRecents.test.qml", "Providers/Rider/RiderRecents.test.qml"];
        const checkComponents = paths.map(function(relativePath) { return Qt.createComponent(checksRoot + relativePath); });
        for (const component of checkComponents) if (!expect(component.status === Component.Ready, "check load " + component.errorString())) return;
        settingsChecks = checkComponents[0].createObject(null, { fixture: root });
        launcherChecks = checkComponents[1].createObject(null, { fixture: root });
        iconChecks = checkComponents[2].createObject(null, { fixture: root });
        localGitChecks = checkComponents[3].createObject(null, { fixture: root });
        storageChecks = checkComponents[4].createObject(null, { fixture: root });
        validatorChecks = checkComponents[5].createObject(null, { fixture: root });
        providersChecks = checkComponents[6].createObject(null, { fixture: root });
        errorChecks = checkComponents[7].createObject(null, { fixture: root });
        databaseChecks = checkComponents[8].createObject(null, { fixture: root });
        folderViewChecks = checkComponents[9].createObject(null, { fixture: root });
        readerChecks = checkComponents[10].createObject(null, { fixture: root });
        orchestratorChecks = checkComponents[11].createObject(null, { fixture: root });
        refresherChecks = checkComponents[12].createObject(null, { fixture: root });
        refreshChecks = checkComponents[13].createObject(null, { fixture: root });
        metadataChecks = checkComponents[14].createObject(null, { fixture: root });
        zedChecks = checkComponents[15].createObject(null, { fixture: root });
        riderChecks = checkComponents[16].createObject(null, { fixture: root });
        if (!runSyncChecks()) return;
        validatorChecks.startPathCheck(function() { validatorChecks.startSnapCheck("vscode", function() { validatorChecks.startSnapCheck("zed", function() { validatorChecks.startRiderCheck("native", function() { validatorChecks.startRiderCheck("snap", function() { refresherChecks.startRefresherCheck(function() { refreshChecks.startIdleCheck(function() { zedChecks.start(function() { riderChecks.start(function() { localGitChecks.startReaderCheck(); }); }); }); }); }); }); }); }); });
    }

    QtObject {
        id: pluginService

        signal pluginDataChanged(string pluginId)
        signal globalVarChanged(string pluginId, string name)

        // Returns the saved value for the given setting name from the test settings, or the default when none is saved.
        function loadPluginData(pluginId, name, defaultValue) {
            return root.settings[name] !== undefined ? root.settings[name] : defaultValue;
        }

        // Stores the value under the given setting name in the test settings and signals that plugin data changed.
        function savePluginData(pluginId, name, value) {
            root.settings[name] = value;
            pluginDataChanged(pluginId);
            return true;
        }

        // Returns the global variable with the given name, or the default when it has not been set.
        function getGlobalVar(pluginId, name, defaultValue) {
            return root.globals[name] !== undefined ? root.globals[name] : defaultValue;
        }

        // Stores a global variable under the given name and signals that it changed.
        function setGlobalVar(pluginId, name, value) {
            root.globals[name] = value;
            globalVarChanged(pluginId, name);
        }
    }

    Timer {
        interval: 9000
        running: true
        repeat: false
        onTriggered: {
            console.warn("T:FAIL regression checks timed out");
            Qt.quit();
        }
    }
}
