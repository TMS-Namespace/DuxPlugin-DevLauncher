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
    property var settings: ({
        "usage": {
        }
    })
    property var checks: null
    property var checkLoaderType: Qt.createComponent("file://" + root.pluginRoot + "/tests/Helpers/Harness/CheckLoader.qml")
    property var controller: null
    property var controllerComponent: null
    property var launcherComponent: null
    property var iconComponent: null
    property var iconService: null
    property var launcher: null
    property var globals: ({
    })
    readonly property alias testPluginService: pluginService

    // Report one failed expectation and stop the process so the runner sees the failure.
    function expect(condition, message) {
        if (condition)
            return true;

        console.warn("T:FAIL " + message);
        Qt.quit();
        return false;
    }

    Component.onCompleted: {
        HostCommon.SettingsData.pluginSettings = {
            "devLauncher": root.settings
        };
        root.controllerComponent = Qt.createComponent("file://" + root.pluginRoot + "/src/Plugin/QML/Helpers/SettingsController.qml");
        root.launcherComponent = Qt.createComponent("file://" + root.pluginRoot + "/src/Plugin/QML/Launcher.qml");
        root.iconComponent = Qt.createComponent("file://" + root.pluginRoot + "/src/Plugin/QML/Services/ResultItemIcon.qml");
        const components = [root.controllerComponent, root.launcherComponent, root.iconComponent];
        for (const component of components) {
            if (!expect(component.status === Component.Ready, "component load " + component.errorString()))
                return ;

        }
        // A fresh instance of the real icon service keeps the cache under test independent of the shared singleton.
        root.iconService = root.iconComponent.createObject(null);
        root.checks = checkLoaderType.createObject(root, {
            "fixture": root
        });
        if (!root.checks.load() || !root.checks.runSyncChecks())
            return ;

        root.checks.validatorChecks.startPathCheck(function() {
            root.checks.validatorChecks.startSnapCheck("vscode", function() {
                root.checks.validatorChecks.startSnapCheck("zed", function() {
                    root.checks.validatorChecks.startRiderCheck("native", function() {
                        root.checks.validatorChecks.startRiderCheck("snap", function() {
                            root.checks.refresherChecks.startRefresherCheck(function() {
                                root.checks.refreshChecks.startIdleCheck(function() {
                                    root.checks.zedChecks.start(function() {
                                        root.checks.riderChecks.start(function() {
                                            root.checks.neoVimChecks.start(function() {
                                                root.checks.localGitChecks.startReaderCheck();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
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
