// SettingsPage.test.qml - Exercise settings controls, grouped layout, and edit panel sizing.
import QtQuick
import Quickshell
import qs.Common as HostCommon
import qs.DCommon.Common as DuxCommon

Item {
    id: checks
    required property var fixture
    readonly property var root: fixture
    readonly property var pluginService: fixture.testPluginService

    // Create settings as Dux does, then exercise saved controls and group state.
    function initialize(settingsComponent) {
        if (!root.settingsPage) {
            console.warn("T:FAIL settings construction");
            Qt.quit();
            return ;
        }
        root.settingsPage.pluginService = pluginService;
        if (root.settingsPage.controller.resultsLimit !== 100) {
            console.warn("T:FAIL default result limit");
            Qt.quit();
            return;
        }
        if (root.settingsPage.controller.trigger !== "`" || root.settingsPage.searchPathsToggle.checked || root.settingsPage.controller.searchPaths) {
            console.warn("T:FAIL default trigger or search scope");
            Qt.quit();
            return;
        }
        const invalidTriggerAccepted = root.settingsPage.saveValue("trigger", "bad 1");
        const invalidTriggerMessage = root.settingsPage.controller.triggerError;
        const otherTriggerAccepted = root.settingsPage.saveValue("trigger", "!");
        const otherTriggerMessage = root.settingsPage.controller.triggerError;
        const builtInTriggerAccepted = root.settingsPage.saveValue("trigger", "?");
        const builtInTriggerMessage = root.settingsPage.controller.triggerError;
        const validTriggerAccepted = root.settingsPage.saveValue("trigger", "ab");
        const validTriggerValue = root.settingsPage.controller.trigger;
        const resetTriggerAccepted = root.settingsPage.saveValue("trigger", "`");
        if (invalidTriggerAccepted || !invalidTriggerMessage.includes("no numbers") || otherTriggerAccepted || !otherTriggerMessage.includes("another launcher plugin") || builtInTriggerAccepted || !builtInTriggerMessage.includes("built-in launcher plugin") || !validTriggerAccepted || validTriggerValue !== "ab" || !resetTriggerAccepted || root.settingsPage.controller.triggerError !== "") {
            console.warn("T:FAIL launcher trigger validation " + invalidTriggerAccepted + " | " + invalidTriggerMessage + " | " + otherTriggerMessage + " | " + builtInTriggerMessage + " | " + validTriggerAccepted + " | " + validTriggerValue + " | " + resetTriggerAccepted);
            Qt.quit();
            return;
        }
        if (root.settingsPage.controller.ageFilterValue !== 3 || root.settingsPage.controller.ageFilterUnit !== "months" || root.settingsPage.ageFilterStepper.text !== "3" || root.settingsPage.ageUnitDropdown.currentValue !== "months" || root.settingsPage.ageUnitDropdown.dropdownWidth !== root.settingsPage.defaultIdeDropdown.dropdownWidth || root.settingsPage.introText.text.includes("@IDEName") || root.settingsPage.ageFilterRow.labelText !== "Don't show items older than" || root.settingsPage.controller.repositoryDepth !== 3 || root.settingsPage.repositoryDepthSlider.value !== 3 || root.settingsPage.repositoryDepthSlider.minimum !== 1 || root.settingsPage.repositoryDepthSlider.maximum !== 20 || root.settingsPage.repositorySettingsGroup.title.trim() !== "Scanning folders with Git repositories") {
            console.warn("T:FAIL default age filter");
            Qt.quit();
            return;
        }
        if (root.settingsPage.globalSettingsGroup.expanded || root.settingsPage.repositorySettingsGroup.expanded || root.settingsPage.ideSettingsGroup.expanded) {
            console.warn("T:FAIL settings groups should start collapsed");
            Qt.quit();
            return;
        }
        const providerRow = root.settingsPage.ideSettingsView.providerRows.itemAt(0);
        if (providerRow.nameLabel.text !== "VS Code" || providerRow.nameLabel.font.pixelSize !== HostCommon.Theme.fontSizeLarge || !providerRow.iconRenderer.iconValue || providerRow.rowBackground.color !== HostCommon.Theme.surfaceContainerHigh) {
            console.warn("T:FAIL IDE list name or executable icon");
            Qt.quit();
            return;
        }
        root.settingsPage.globalSettingsGroup.expanded = true;
        root.settingsPage.repositorySettingsGroup.expanded = true;
        root.settingsPage.ideSettingsGroup.expanded = true;
        root.settingsPage.resultsLimitDropdown.valueChanged("50");
        if (root.settingsPage.controller.resultsLimit !== 50 || root.settings.resultsLimit !== 50 || root.settingsPage.resultsLimitDropdown.currentValue !== "50" || root.pluginDataChanges !== 0 || !root.settingsPage.globalSettingsGroup.expanded) {
            console.warn("T:FAIL result limit dropdown");
            Qt.quit();
            return;
        }
        root.settingsPage.ageFilterStepper.onDecrement();
        root.settingsPage.ageUnitDropdown.valueChanged("weeks");
        if (root.settingsPage.controller.ageFilterValue !== 2 || root.settingsPage.controller.ageFilterUnit !== "weeks" || root.settings.ageFilter.value !== 2 || root.settings.ageFilter.unit !== "weeks" || root.pluginDataChanges !== 0 || !root.settingsPage.globalSettingsGroup.expanded || root.settingsPage.controller.setAgeFilterValue(0)) {
            console.warn("T:FAIL age filter controls or group state");
            Qt.quit();
            return;
        }
        root.settingsPage.ageFilterStepper.onIncrement();
        root.settingsPage.ageUnitDropdown.valueChanged("months");
        root.settingsPage.repositoryDepthSlider.sliderValueChanged(5);
        if (root.settingsPage.controller.repositoryDepth !== 5 || root.settings.repositoryDepth !== 5 || !root.settingsPage.repositorySettingsGroup.expanded || root.pluginDataChanges !== 0) {
            console.warn("T:FAIL repository depth slider or group state");
            Qt.quit();
            return;
        }
        root.settingsPage.repositoryDepthSlider.sliderValueChanged(3);
        const previousPage = root.settingsPage;
        root.settingsPage = settingsComponent.createObject(root.testWindowSurface.contentItem, { "width": 1000 });
        if (!root.settingsPage.globalSettingsGroup.expanded || !root.settingsPage.repositorySettingsGroup.expanded || !root.settingsPage.ideSettingsGroup.expanded) {
            console.warn("T:FAIL settings groups did not start in saved state");
            Qt.quit();
            return;
        }
        let expansionChanges = 0;
        root.settingsPage.globalSettingsGroup.expandedChanged.connect(function() { expansionChanges++; });
        root.settingsPage.ideSettingsGroup.expandedChanged.connect(function() { expansionChanges++; });
        root.settingsPage.pluginService = pluginService;
        previousPage.destroy();
        if (!root.settingsPage.globalSettingsGroup.expanded || !root.settingsPage.repositorySettingsGroup.expanded || !root.settingsPage.ideSettingsGroup.expanded || expansionChanges !== 0) {
            console.warn("T:FAIL settings group changed during reload");
            Qt.quit();
            return;
        }
        root.settingsPage.defaultIdeDropdown.valueChanged("");
        if (root.settingsPage.controller.defaultProvider !== "" || !root.settingsPage.defaultIdeDropdown.enabled) {
            console.warn("T:FAIL default IDE dropdown");
            Qt.quit();
            return;
        }
        root.settingsPage.folderPicker.accepted([Quickshell.env("DEV_LAUNCHER_FIXTURE")]);
        if (root.settingsPage.controller.folders.length !== 1 || !root.settingsPage.controller.removeFolder(0) || !root.settingsPage.controller.addFolder(Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/sample") || !root.settingsPage.controller.addFolder(Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/other-root")) {
            console.warn("T:FAIL folder picker or remove action");
            Qt.quit();
            return;
        }
        if (root.settingsPage.folderSettingsView.folderRows.itemAt(0).color !== HostCommon.Theme.surfaceContainerHigh) {
            console.warn("T:FAIL folder list background");
            Qt.quit();
            return;
        }
        const scannedFolder = root.settingsPage.controller.folders[0];
        if (root.settingsPage.controller.addFolder(scannedFolder + "/") || root.settingsPage.controller.folders.length !== 2 || !root.settingsPage.folderSettingsView.errorLabel.visible || !root.settingsPage.folderSettingsView.errorLabel.text.includes("already being scanned")) {
            console.warn("T:FAIL duplicate scan folder feedback");
            Qt.quit();
            return;
        }
        if (root.settingsPage.controller.addFolder(scannedFolder + "/nested") || root.settingsPage.controller.folders.length !== 2 || !root.settingsPage.folderSettingsView.errorLabel.text.includes("covered by")) {
            console.warn("T:FAIL nested scan folder feedback");
            Qt.quit();
            return;
        }
        if (root.settingsPage.controller.addFolder(Quickshell.env("DEV_LAUNCHER_FIXTURE")) || !root.settingsPage.folderSettingsView.errorLabel.text.includes("parent folder")) {
            console.warn("T:FAIL parent scan folder feedback");
            Qt.quit();
            return;
        }
        return true;
    }

    Timer {
        id: alignmentCheck
        interval: 100
        running: true
        repeat: false
        onTriggered: {
            const page = root.settingsPage;
            const unit = page.ageUnitDropdown;
            const unitRight = unit.mapToItem(page, unit.width, 0).x;
            const triggerField = page.triggerFieldRow.inputField;
            const triggerRight = triggerField.mapToItem(page, triggerField.width, 0).x;
            const defaultIde = page.defaultIdeDropdown;
            const defaultIdeRight = defaultIde.mapToItem(page, defaultIde.width, 0).x;
            const depthSlider = page.repositoryDepthSlider;
            const depthLabel = page.repositoryDepthValueLabel;
            const folderList = page.folderSettingsView;
            const depthRight = depthLabel.mapToItem(page, depthLabel.width, 0).x;
            const sliderRight = depthSlider.mapToItem(page, depthSlider.width, 0).x;
            const folderTop = folderList.mapToItem(page, 0, 0).y;
            const sliderTop = depthSlider.mapToItem(page, 0, 0).y;
            const depthLabelBottom = depthLabel.mapToItem(page, 0, depthLabel.height).y;
            if (!page.ageFilterRow.width || unit.width !== defaultIde.dropdownWidth || triggerField.width !== defaultIde.dropdownWidth || Math.abs(unitRight - defaultIdeRight) > 3 || Math.abs(triggerRight - defaultIdeRight) > 3 || Math.abs(depthRight - sliderRight) > 3 || sliderTop - depthLabelBottom < 0 || sliderTop - depthLabelBottom > HostCommon.Theme.spacingS || folderTop <= sliderTop || depthLabel.text !== "3 levels") {
                console.warn("T:FAIL settings row alignment " + unitRight + " " + defaultIdeRight + " " + triggerRight + " " + depthRight + " " + sliderRight + " " + folderTop + " " + sliderTop + " " + depthLabelBottom + " " + depthLabel.y + " " + depthSlider.y + " " + depthLabel.height + " " + depthSlider.height + " " + (depthLabel.parent === depthSlider.parent) + " " + depthLabel.text);
                Qt.quit();
                return;
            }
            const folderButton = page.folderSettingsView.addButton;
            const ideButton = page.ideSettingsView.addButton;
            const sectionIcons = [page.globalSettingsIcon, page.repositorySettingsIcon, page.ideSettingsIcon];
            const sections = [page.globalSettingsGroup, page.repositorySettingsGroup, page.ideSettingsGroup];
            const invalidIcon = sectionIcons.some(function(icon, index) {
                const section = sections[index];
                return icon.parent !== section.parent || icon.size !== 24 || icon.y < 0 || icon.y + icon.height > 56 || icon.x !== DuxCommon.Style.spacingL || !section.title.startsWith("\u2003\u2003") || Math.abs(icon.parent.height - section.implicitHeight) > 1;
            });
            if (folderButton.variant !== "tonal" || ideButton.variant !== "tonal" || folderButton.iconName !== "add" || ideButton.iconName !== "add" || Math.abs(folderButton.x + folderButton.width / 2 - page.folderSettingsView.width / 2) > 1 || Math.abs(ideButton.x + ideButton.width / 2 - page.ideSettingsView.width / 2) > 1 || page.globalSettingsIcon.name !== "tune" || page.repositorySettingsIcon.name !== "folder_copy" || page.ideSettingsIcon.name !== "code" || invalidIcon) {
                console.warn("T:FAIL themed add buttons or settings group icons");
                Qt.quit();
                return;
            }
            const ideView = page.ideSettingsView;
            const providerRow = ideView.providerRows.itemAt(0);
            root.compactIdeHeight = ideView.implicitHeight;
            root.compactIdeSectionHeight = page.ideSettingsGroup.implicitHeight;
            page.controller.beginEdit(0);
            page.controller.edit("executable", "code");
            page.controller.requestValidation();
            ideExpandedCheck.start();
        }
    }

    Timer {
        id: ideExpandedCheck
        property int attempts: 0
        interval: 50
        repeat: false
        onTriggered: {
            const page = root.settingsPage;
            if (!page.controller.canSave && page.controller.validationError === "" && attempts++ < 20) {
                restart();
                return;
            }
            const ideView = page.ideSettingsView;
            const providerRow = ideView.providerRows.itemAt(0);
            const editorCard = providerRow.editorBackground;
            const editor = ideView.editorItem;
            const argumentButton = editor ? editor.argumentsGroup.addButton : null;
            if (!editor || !page.controller.canSave || page.controller.draft.executable !== Quickshell.env("DEV_LAUNCHER_CODE_PATH") || editor.executableRow.text !== Quickshell.env("DEV_LAUNCHER_CODE_PATH") || editor.executableRow.inputField.text !== Quickshell.env("DEV_LAUNCHER_CODE_PATH") || !editorCard.visible || providerRow.editButton.enabled || editorCard.height <= 0 || editorCard.width >= providerRow.width || editorCard.color !== HostCommon.Theme.surfaceContainerHighest || ideView.implicitHeight <= root.compactIdeHeight || page.ideSettingsGroup.implicitHeight <= root.compactIdeSectionHeight || editor.saveButton.y >= editor.aliasRow.y || editor.cancelButton.y !== editor.saveButton.y || editor.cancelButton.x <= editor.saveButton.x || page.controller.draft.id !== page.controller.providers[0].id || !argumentButton || argumentButton.variant !== "tonal" || Math.abs(argumentButton.x + argumentButton.width / 2 - argumentButton.parent.width / 2) > 1) {
                console.warn("T:FAIL IDE editor card layout or resolved executable " + page.controller.validationError);
                Qt.quit();
                return;
            }
            editor.cancelButton.clicked();
            ideCollapsedCheck.start();
        }
    }

    Timer {
        id: ideCollapsedCheck
        interval: 50
        repeat: false
        onTriggered: {
            const page = root.settingsPage;
            const ideView = page.ideSettingsView;
            const editorCard = ideView.providerRows.itemAt(0).editorBackground;
            if (page.controller.editorOpen || editorCard.visible || editorCard.height !== 0 || !ideView.providerRows.itemAt(0).editButton.enabled || ideView.editorItem || Math.abs(ideView.implicitHeight - root.compactIdeHeight) > 1 || Math.abs(page.ideSettingsGroup.implicitHeight - root.compactIdeSectionHeight) > 1) {
                console.warn("T:FAIL IDE editor card did not collapse after Cancel");
                Qt.quit();
                return;
            }
            root.firstIdeCheckFinished = true;
        }
    }

}
