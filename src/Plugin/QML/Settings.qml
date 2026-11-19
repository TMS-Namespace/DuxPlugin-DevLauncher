// Settings.qml - Compose grouped launcher, repository, and IDE settings.
// Rules: Setting changes go to the settings controller, and the page only composes sections, file pickers, and its saved group layout through DataStorage.
import "../JS/Helpers/Config.js" as Config
import "./Helpers"
import "./Services"
import "./Views"
import QtQuick
import QtQuick.Layouts
import qs.Common
import qs.DCommon.Widgets
import qs.Modals.FileBrowser
import qs.Modules.Plugins
import qs.Services as HostServices

// The settings page: it composes the grouped sections and file pickers, and it sends its setting changes to the controller.
PluginSettings {
    id: root

    readonly property alias controller: settingsController
    readonly property alias folderPicker: folderBrowser
    readonly property alias executablePicker: executableBrowser
    readonly property alias iconPicker: iconBrowser
    readonly property alias dataFolderPicker: dataFolderBrowser
    readonly property alias sharedFolderPicker: sharedFolderBrowser
    readonly property alias defaultIdeDropdown: defaultIdeSelect
    readonly property alias resultsLimitDropdown: resultsLimitSelect
    readonly property alias searchPathsToggle: searchPathsControl
    readonly property alias showBadgesToggle: showBadgesControl
    readonly property alias ageFilterStepper: ageLimitRow.amountStepper
    readonly property alias ageUnitDropdown: ageLimitRow.unitDropdown
    readonly property alias ageFilterRow: ageLimitRow
    readonly property alias globalSettingsGroup: globalSettingsSection
    readonly property alias globalSettingsIcon: globalSectionIcon
    readonly property alias repositorySettingsGroup: repositorySettingsSection
    readonly property alias repositorySettingsIcon: repositorySectionIcon
    readonly property alias repositoryDepthSlider: repositoryDepthControl
    readonly property alias repositoryDepthValueLabel: repositoryDepthValue
    readonly property alias ideSettingsGroup: ideSettingsSection
    readonly property alias ideSettingsIcon: ideSectionIcon
    readonly property alias ideSettingsView: ideSettingsView
    readonly property alias folderSettingsView: folderSettingsView
    readonly property alias triggerErrorLabel: triggerFieldRow.errorLabel
    readonly property alias triggerFieldRow: triggerFieldRow
    readonly property alias introText: introText
    // The open or closed state of each settings group, loaded from the saved plugin settings when the page is created.
    property var initialExpanded: ({
    })
    // The open or closed state last loaded or saved, so an unchanged state is never written again.
    property var savedExpanded: ({
    })
    // True while the saved state is being applied, so applying it is never saved back as a user change.
    property bool restoringExpanded: false

    // Save the open groups through the storage object, so they survive a reload of this page. Applying the saved state is skipped.
    function rememberExpanded() {
        if (restoringExpanded)
            return ;

        const expanded = {
            "global": globalSettingsSection.expanded,
            "repositories": repositorySettingsSection.expanded,
            "ides": ideSettingsSection.expanded
        };
        if (JSON.stringify(expanded) === JSON.stringify(savedExpanded))
            return ;

        if (DataStorage.save("expandedSettings", expanded))
            savedExpanded = expanded;

    }

    // Dux settings controls call these methods on their page.
    function loadValue(key, defaultValue) {
        return DataStorage.load(key, defaultValue);
    }

    // Read every loaded launcher plugin directly so duplicate map entries cannot hide a conflict.
    function activeLauncherTriggers() {
        const owners = {
        };
        const launchers = HostServices.PluginService.getLauncherPlugins();
        for (const pluginId of Object.keys(launchers)) {
            if (pluginId === Config.pluginId)
                continue;

            const trigger = HostServices.PluginService.getPluginTrigger(pluginId);
            if (trigger)
                owners[trigger] = pluginId;

        }
        return owners;
    }

    // Sends the trigger through its own rules and every other key straight to the controller.
    function saveValue(key, value) {
        if (key === "trigger")
            return settingsController.setTrigger(value, root.activeLauncherTriggers(), HostServices.AppSearchService.getBuiltInLauncherTriggers());

        return settingsController.saveValue(key, value);
    }

    pluginId: Config.pluginId
    // Load the saved open groups through the storage object once the host service is attached to the page.
    Component.onCompleted: {
        DataStorage.configure(root.pluginService);
        restoringExpanded = true;
        savedExpanded = DataStorage.load("expandedSettings", ({
        }));
        initialExpanded = savedExpanded;
        restoringExpanded = false;
    }

    // The controller that owns this page's folder and IDE lists and saves them.
    SettingsController {
        id: settingsController

        pluginService: root.pluginService
    }

    StyledText {
        text: "Dev Launcher"
        color: Theme.surfaceText
        font.pixelSize: Theme.fontSizeLarge
        font.weight: Font.Bold
        width: parent.width
    }

    StyledText {
        id: introText

        text: "Search recent IDE items and local Git repositories."
        color: Theme.surfaceVariantText
        font.pixelSize: Theme.fontSizeSmall
        wrapMode: Text.WordWrap
        width: parent.width
    }

    Column {
        width: parent.width
        spacing: Theme.spacingS

        // Dux sections have no leading icon slot; title spacing leaves room for the overlaid icon.
        Item {
            width: parent.width
            height: globalSettingsSection.implicitHeight

            DCollapsibleSection {
                id: globalSettingsSection

                title: "\u2003\u2003Global settings"
                expanded: root.initialExpanded.global === true
                onExpandedChanged: root.rememberExpanded()
                width: parent.width

                Column {
                    Layout.fillWidth: true
                    spacing: Theme.spacingS

                    LabeledFieldRow {
                        id: triggerFieldRow

                        label: "Launcher trigger"
                        description: "Type this prefix to search Dev Launcher."
                        text: settingsController.trigger
                        placeholder: "`"
                        fieldWidth: defaultIdeSelect.dropdownWidth
                        errorText: settingsController.triggerError
                        onEditingFinished: function(value) {
                            root.saveValue("trigger", value);
                        }
                    }

                    DDropdown {
                        id: resultsLimitSelect

                        text: "Maximum results shown"
                        description: "Search checks every discovered item before limiting the displayed results."
                        options: Config.resultLimitOptions.map(function(count) {
                            return count.toString();
                        })
                        optionValues: options
                        currentValue: settingsController.resultsLimit.toString()
                        width: parent.width
                        onValueChanged: function(value) {
                            settingsController.setResultsLimit(value);
                        }
                    }

                    RowLayout {
                        width: parent.width
                        spacing: Theme.spacingM

                        Column {
                            Layout.fillWidth: true
                            spacing: Theme.spacingXS

                            StyledText {
                                text: "Include paths in search"
                                color: Theme.surfaceText
                                font.pixelSize: Theme.fontSizeMedium
                                font.weight: Font.Medium
                            }

                            StyledText {
                                text: "Also match folder paths; when off, search matches item names only."
                                color: Theme.surfaceVariantText
                                font.pixelSize: Theme.fontSizeSmall
                                wrapMode: Text.WordWrap
                                width: parent.width
                            }

                        }

                        DToggle {
                            id: searchPathsControl

                            checked: settingsController.searchPaths
                            onToggled: function(checked) {
                                settingsController.setSearchPaths(checked);
                            }
                        }

                    }

                    RowLayout {
                        width: parent.width
                        spacing: Theme.spacingM

                        Column {
                            Layout.fillWidth: true
                            spacing: Theme.spacingXS

                            StyledText {
                                text: "Show result badges"
                                color: Theme.surfaceText
                                font.pixelSize: Theme.fontSizeMedium
                                font.weight: Font.Medium
                            }

                            StyledText {
                                text: "Show IDE and Git badges on result icons."
                                color: Theme.surfaceVariantText
                                font.pixelSize: Theme.fontSizeSmall
                                wrapMode: Text.WordWrap
                                width: parent.width
                            }

                        }

                        DToggle {
                            id: showBadgesControl

                            checked: settingsController.showBadges
                            onToggled: function(checked) {
                                settingsController.setShowBadges(checked);
                            }
                        }

                    }

                    AgeFilterRow {
                        id: ageLimitRow

                        ageValue: settingsController.ageFilterValue
                        ageUnit: settingsController.ageFilterUnit
                        unitDropdownWidth: defaultIdeSelect.dropdownWidth
                        onAmountEdited: function(value) {
                            settingsController.setAgeFilterValue(value);
                        }
                        onUnitSelected: function(value) {
                            settingsController.setAgeFilterUnit(value);
                        }
                    }

                    DDropdown {
                        id: defaultIdeSelect

                        text: "Default IDE"
                        description: "Used for scanned repositories. System default uses your desktop's file association."
                        options: ["System default"].concat(settingsController.providers.map(function(provider) {
                            return provider.name;
                        }))
                        optionValues: [""].concat(settingsController.providers.map(function(provider) {
                            return provider.id;
                        }))
                        currentValue: settingsController.defaultProvider
                        emptyText: "No IDE configured"
                        enabled: settingsController.providers.length > 0
                        width: parent.width
                        onValueChanged: function(value) {
                            settingsController.setDefault(value);
                        }
                    }

                }

            }

            SettingsGroupIcon {
                id: globalSectionIcon

                iconName: "tune"
            }

        }

        Item {
            width: parent.width
            height: repositorySettingsSection.implicitHeight

            DCollapsibleSection {
                id: repositorySettingsSection

                title: "\u2003\u2003Scanning folders with Git repositories"
                expanded: root.initialExpanded.repositories === true
                onExpandedChanged: root.rememberExpanded()
                width: parent.width

                Column {
                    Layout.fillWidth: true
                    spacing: Theme.spacingXS

                    StyledText {
                        text: "Max depth to scan"
                        color: Theme.surfaceText
                        font.pixelSize: Theme.fontSizeMedium
                        font.weight: Font.Medium
                    }

                    StyledText {
                        text: "How many directory levels under each selected folder to search for Git repositories."
                        color: Theme.surfaceVariantText
                        font.pixelSize: Theme.fontSizeSmall
                        wrapMode: Text.WordWrap
                        width: parent.width
                    }

                    StyledText {
                        id: repositoryDepthValue

                        text: settingsController.repositoryDepth + " levels"
                        color: Theme.surfaceText
                        font.pixelSize: Theme.fontSizeMedium
                        horizontalAlignment: Text.AlignRight
                        width: parent.width
                    }

                    DSlider {
                        id: repositoryDepthControl

                        width: parent.width
                        minimum: Config.minRepositoryDepth
                        maximum: Config.maxRepositoryDepth
                        value: settingsController.repositoryDepth
                        wheelEnabled: false
                        onSliderValueChanged: function(value) {
                            settingsController.setRepositoryDepth(value);
                        }
                    }

                }

                FolderSettings {
                    id: folderSettingsView

                    controller: settingsController
                    Layout.fillWidth: true
                    onBrowseRequested: folderBrowser.open()
                }

            }

            SettingsGroupIcon {
                id: repositorySectionIcon

                iconName: "folder_copy"
            }

        }

        Item {
            width: parent.width
            height: ideSettingsSection.implicitHeight

            DCollapsibleSection {
                id: ideSettingsSection

                title: "\u2003\u2003IDEs"
                expanded: root.initialExpanded.ides === true
                onExpandedChanged: root.rememberExpanded()
                width: parent.width

                IdeSettings {
                    id: ideSettingsView

                    controller: settingsController
                    Layout.fillWidth: true
                    onBrowseExecutableRequested: executableBrowser.open()
                    onBrowseDataFolderRequested: dataFolderBrowser.open()
                    onBrowseSharedFolderRequested: sharedFolderBrowser.open()
                    onBrowseIconRequested: iconBrowser.open()
                }

            }

            SettingsGroupIcon {
                id: ideSectionIcon

                iconName: "code"
            }

        }

    }

    FileBrowserModal {
        id: folderBrowser

        browserTitle: "Choose repository scan folder"
        mode: "openFolder"
        showHiddenFiles: true
        onAccepted: (paths) => {
            if (paths.length)
                settingsController.addFolder(paths[0]);

        }
    }

    FileBrowserModal {
        id: executableBrowser

        browserTitle: settingsController.fieldFor("executable").chooserTitle
        mode: "open"
        showHiddenFiles: true
        onAccepted: (paths) => {
            if (paths.length)
                settingsController.commitField("executable", paths[0]);

        }
    }

    FileBrowserModal {
        id: iconBrowser

        browserTitle: "Choose IDE icon"
        mode: "open"
        filters: ["*.svg", "*.png", "*.jpg", "*.jpeg", "*.webp"]
        showHiddenFiles: true
        onAccepted: (paths) => {
            if (paths.length)
                settingsController.edit("iconPath", paths[0]);

        }
    }

    FileBrowserModal {
        id: dataFolderBrowser

        browserTitle: settingsController.fieldFor("config").chooserTitle
        mode: "openFolder"
        showHiddenFiles: true
        onAccepted: (paths) => {
            if (paths.length)
                settingsController.commitField("config", paths[0]);

        }
    }

    FileBrowserModal {
        id: sharedFolderBrowser

        browserTitle: settingsController.fieldFor("shared").chooserTitle
        mode: "openFolder"
        showHiddenFiles: true
        onAccepted: (paths) => {
            if (paths.length)
                settingsController.commitField("shared", paths[0]);

        }
    }

}
