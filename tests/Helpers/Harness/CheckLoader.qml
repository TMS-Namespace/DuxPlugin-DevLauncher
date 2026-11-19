// CheckLoader.qml - Load every integration check once, and run the synchronous checks in their fixed order.
// Rules: The regression harness owns the fixture and the asynchronous chain; this loader only creates the checks and reports failures through the fixture.
import QtQml
import QtQuick

QtObject {
    id: loader

    // The regression harness that owns the fixture, its expectation reporter, and the controller and launcher under test.
    required property var fixture
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
    property var neoVimChecks: null

    // Create every integration check from its file, so the regression chain can start each one later.
    function load() {
        const checksRoot = "file://" + fixture.pluginRoot + "/tests/Integration/Plugin/QML/";
        const paths = ["Helpers/SettingsController.test.qml", "LauncherLaunch.test.qml", "Services/ResultItemIcon.test.qml", "../../Providers/LocalGit/QML/LocalGitRecents.test.qml", "Services/DataStorage.test.qml", "BackgroundWorkers/ProviderValidator.test.qml", "Services/ProvidersManager.test.qml", "Services/ErrorHandler.test.qml", "../../Providers/VSCode/QML/HistoryDatabase.test.qml", "Views/FolderSettings.test.qml", "../../Providers/VSCode/QML/VSCodeRecents.test.qml", "Services/ScanOrchestratorErrors.test.qml", "BackgroundWorkers/DateRefresher.test.qml", "LauncherRefresh.test.qml", "Services/FileMetadataService.test.qml", "../../Providers/Zed/QML/ZedRecents.test.qml", "../../Providers/Rider/QML/RiderRecents.test.qml", "../../Providers/NeoVim/QML/NeoVimRecents.test.qml"];
        const checkComponents = paths.map(function(relativePath) {
            return Qt.createComponent(checksRoot + relativePath);
        });
        for (const component of checkComponents) if (!fixture.expect(component.status === Component.Ready, "check load " + component.errorString())) {
            return ;
        }
        settingsChecks = checkComponents[0].createObject(null, {
            "fixture": fixture
        });
        launcherChecks = checkComponents[1].createObject(null, {
            "fixture": fixture
        });
        iconChecks = checkComponents[2].createObject(null, {
            "fixture": fixture
        });
        localGitChecks = checkComponents[3].createObject(null, {
            "fixture": fixture
        });
        storageChecks = checkComponents[4].createObject(null, {
            "fixture": fixture
        });
        validatorChecks = checkComponents[5].createObject(null, {
            "fixture": fixture
        });
        providersChecks = checkComponents[6].createObject(null, {
            "fixture": fixture
        });
        errorChecks = checkComponents[7].createObject(null, {
            "fixture": fixture
        });
        databaseChecks = checkComponents[8].createObject(null, {
            "fixture": fixture
        });
        folderViewChecks = checkComponents[9].createObject(null, {
            "fixture": fixture
        });
        readerChecks = checkComponents[10].createObject(null, {
            "fixture": fixture
        });
        orchestratorChecks = checkComponents[11].createObject(null, {
            "fixture": fixture
        });
        refresherChecks = checkComponents[12].createObject(null, {
            "fixture": fixture
        });
        refreshChecks = checkComponents[13].createObject(null, {
            "fixture": fixture
        });
        metadataChecks = checkComponents[14].createObject(null, {
            "fixture": fixture
        });
        zedChecks = checkComponents[15].createObject(null, {
            "fixture": fixture
        });
        riderChecks = checkComponents[16].createObject(null, {
            "fixture": fixture
        });
        neoVimChecks = checkComponents[17].createObject(null, {
            "fixture": fixture
        });
        return true;
    }

    // Run focused regression checks before the asynchronous folder-source case.
    function runSyncChecks() {
        if (!storageChecks.checkDamagedSettings() || !storageChecks.checkCorruptBackupIsKept() || !storageChecks.checkInstallationDefaultsOnLoad())
            return false;

        if (!providersChecks.checkDuplicateIdentifierRefused() || !providersChecks.checkValidationPathsMatchFacade() || !providersChecks.checkDefaultsSeedDeclaredIdeOnly() || !errorChecks.checkDetailsStayOutOfToast() || !databaseChecks.checkApostrophePathRead() || !folderViewChecks.checkFolderRowShowsScanError() || !errorChecks.checkLaunchErrorsAlwaysShown())
            return false;

        if (!readerChecks.checkStuckReadMovesOnThenEnds() || !readerChecks.checkClearedHistoryRemovesItems() || !orchestratorChecks.checkProviderErrorsStayOutOfToast() || !orchestratorChecks.checkFailedReadKeepsItems() || !orchestratorChecks.checkKnownSourcesSurviveScan())
            return false;

        if (!metadataChecks.checkRedrawKeepsCachedMetadata())
            return false;

        if (!validatorChecks.checkUnavailableProvider())
            return false;

        if (!settingsChecks.checkAliasUniqueness() || !settingsChecks.checkRemovalAboveEditor() || !settingsChecks.checkRemovalOfEditedRow() || !settingsChecks.checkInvalidSavedArguments() || !settingsChecks.checkErrorFieldRouting() || !settingsChecks.checkTextEditsWaitForCommit() || !settingsChecks.checkBrokenInstallationComparison() || !settingsChecks.checkCancelEdit() || !settingsChecks.checkFolderScanErrorShown() || !settingsChecks.checkDependentFieldsFromDescriptor() || !settingsChecks.checkProviderErrorShown())
            return false;

        if (!launcherChecks.checkMissingIdeLaunch() || !launcherChecks.checkRankingIsCached() || !launcherChecks.checkIdeAliasActions() || !iconChecks.checkIconMissCache() || !iconChecks.checkMultipleSources() || !iconChecks.checkBadgeMemoInvalidates())
            return false;

        if (fixture.controller)
            fixture.controller.destroy();

        if (fixture.launcher)
            fixture.launcher.destroy();

        fixture.controller = null;
        fixture.launcher = null;
        return true;
    }

}
