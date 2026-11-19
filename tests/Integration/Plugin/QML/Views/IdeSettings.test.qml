// IdeSettings.test.qml - Exercise IDE validation, editor state, and removal confirmation.
import QtQuick
import Quickshell
import qs.Common as HostCommon

Item {
    id: checks

    required property var fixture
    readonly property var root: fixture
    property var typingArgumentRow: null

    function startWorkspaceCheck() {
        workspaceCheck.start();
    }

    // Every reported validation failure must be bound only to its owning input or arguments section.
    function hasFieldError(field) {
        const controller = root.settingsPage.controller;
        const editor = root.settingsPage.ideSettingsView.editorItem;
        if (!editor || controller.validationField !== field)
            return false;

        const errors = {
            "name": editor.aliasRow.errorLabel,
            "executable": editor.executableRow.errorLabel,
            "config": editor.dataFolderRow.errorLabel,
            "shared": editor.sharedFolderRow.errorLabel,
            "extraArguments": editor.argumentsGroup.errorLabel
        };
        return Object.keys(errors).every(function(key) {
            return errors[key].text === (key === field ? controller.validationError : "");
        });
    }

    // Allow field error bindings to settle before inspecting the visible editor.
    function verifyValidationError() {
        const controller = root.settingsPage.controller;
        if (!controller.validationError || root.duplicateCheckPending)
            return ;

        if (root.argumentValidationPhase === 1) {
            if (controller.canSave || !controller.validationError.includes("rejected an additional command argument") || !checks.hasFieldError("extraArguments")) {
                console.warn("T:FAIL provider did not reject invalid IDE switch " + controller.validationError);
                Qt.quit();
                return ;
            }
            root.argumentValidationPhase = 2;
            controller.editArgument(0, "--profile");
            controller.requestValidation();
            return ;
        }
        if (root.argumentValidationPhase === 2) {
            if (controller.canSave || !controller.validationError.includes("needs a value") || !checks.hasFieldError("extraArguments")) {
                console.warn("T:FAIL provider did not require switch value " + controller.validationError);
                Qt.quit();
                return ;
            }
            root.argumentValidationPhase = 3;
            controller.addArgument();
            controller.editArgument(1, "Work");
            root.settingsPage.ideSettingsView.editorItem.saveButton.clicked();
            return ;
        }
        if (root.validationPhase === 0) {
            if (controller.providers.length !== 1 || controller.canSave || !controller.validationError.includes("VS Code compatible") || !checks.hasFieldError("executable")) {
                console.warn("T:FAIL executable validation feedback " + controller.validationError);
                Qt.quit();
                return ;
            }
            root.validationPhase = 1;
            controller.beginAdd();
            controller.edit("name", "MissingFolder");
            controller.edit("executable", Quickshell.env("DEV_LAUNCHER_CODE_INSIDERS_PATH"));
            controller.edit("config", Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/missing");
            controller.requestValidation();
            return ;
        }
        if (root.validationPhase === 1) {
            if (controller.canSave || !controller.validationError.includes("IDE data folder is missing") || !checks.hasFieldError("config")) {
                console.warn("T:FAIL missing folder validation feedback " + controller.validationError);
                Qt.quit();
                return ;
            }
            root.validationPhase = 2;
            controller.beginAdd();
            controller.edit("name", "UnreadableFolder");
            controller.edit("executable", Quickshell.env("DEV_LAUNCHER_CODE_INSIDERS_PATH"));
            controller.edit("config", Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/unreadable");
            controller.requestValidation();
            return ;
        }
        if (root.validationPhase === 2) {
            if (controller.canSave || !controller.validationError.includes("IDE data folder is missing") || !checks.hasFieldError("config")) {
                console.warn("T:FAIL unreadable folder validation feedback " + controller.validationError);
                Qt.quit();
                return ;
            }
            root.validationPhase = 3;
            controller.beginAdd();
            controller.edit("name", "UnreadableHistory");
            controller.edit("executable", Quickshell.env("DEV_LAUNCHER_CODE_INSIDERS_PATH"));
            controller.edit("config", Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/UnreadableHistory");
            controller.requestValidation();
            return ;
        }
        if (root.validationPhase === 3) {
            if (controller.canSave || !controller.validationError.includes("IDE history file is missing") || !checks.hasFieldError("config")) {
                console.warn("T:FAIL unreadable history file feedback " + controller.validationError);
                Qt.quit();
                return ;
            }
            root.validationPhase = 4;
            controller.beginAdd();
            controller.edit("name", "NoHistory");
            controller.edit("executable", Quickshell.env("DEV_LAUNCHER_CODE_INSIDERS_PATH"));
            controller.edit("config", Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/other-root");
            controller.requestValidation();
            return ;
        }
        if (controller.providers.length !== 1 || controller.canSave || !controller.validationError.includes("No recent local") || !checks.hasFieldError("config")) {
            console.warn("T:FAIL history validation feedback " + controller.validationError);
            Qt.quit();
            return ;
        }
        if (!controller.removeProvider(0) || root.settingsPage.defaultIdeDropdown.enabled) {
            console.warn("T:FAIL empty IDE list or default dropdown");
            Qt.quit();
            return ;
        }
        const systemItems = root.launcher.getItems("sample");
        if (systemItems.length !== 2 || systemItems.some(function(item) {
            return item.provider !== "";
        })) {
            console.warn("T:FAIL system default item");
            Qt.quit();
            return ;
        }
        root.launcher.executeItem(systemItems[0]);
        root.orchestratorChecks.startSystemLaunchCheck();
    }

    Connections {
        function onProvidersChanged() {
            if (!root.settingsPage || root.settingsPage.controller.providers.length !== 2)
                return ;

            const controller = root.settingsPage.controller;
            const ideSettings = root.settingsPage.ideSettingsView;
            const removeButton = ideSettings.providerRows.itemAt(1).removeButton;
            removeButton.clicked();
            const dialog = ideSettings.removalDialog;
            if (controller.providers[1].name !== "SecondCode" || controller.providers[1].id === controller.providers[0].id || !dialog.shouldBeVisible || !dialog.confirmMessage.includes("SecondCode") || !dialog.danger || controller.providers.length !== 2) {
                console.warn("T:FAIL IDE removal did not require confirmation");
                Qt.quit();
                return ;
            }
            dialog._activate(0);
            if (dialog.shouldBeVisible || controller.providers.length !== 2) {
                console.warn("T:FAIL cancelled IDE removal changed providers");
                Qt.quit();
                return ;
            }
            removeButton.clicked();
            dialog._activate(1);
            if (dialog.shouldBeVisible || controller.providers.length !== 1) {
                console.warn("T:FAIL provider add or remove action");
                Qt.quit();
                return ;
            }
            controller.beginAdd();
            controller.edit("name", "WrongIDE");
            controller.edit("executable", "othercode");
            controller.edit("config", Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/other-root");
            controller.requestValidation();
        }

        function onValidationErrorChanged() {
            Qt.callLater(checks.verifyValidationError);
        }

        target: root.settingsPage ? root.settingsPage.controller : null
    }

    Timer {
        id: workspaceCheck

        property int attempts: 0

        interval: 150
        repeat: false
        onTriggered: {
            if (!root.firstIdeCheckFinished) {
                restart();
                return ;
            }
            const workspace = root.launcher.getItems("workspace.code-workspace")[0];
            if (workspace && !workspace.icon.startsWith("svg:data:image/svg+xml,") && attempts++ < 5) {
                restart();
                return ;
            }
            const workspaceSvg = workspace ? decodeURIComponent(workspace.icon.slice(4)) : "";
            if (!workspace || !workspace.icon.startsWith("svg:data:image/svg+xml,") || !workspaceSvg.includes('fill="#666688"') || !workspaceSvg.includes('fill="#1188dd"')) {
                console.warn("T:FAIL workspace executable badge");
                Qt.quit();
                return ;
            }
            const controller = root.settingsPage.controller;
            controller.beginAdd();
            const editor = root.settingsPage.ideSettingsView.editorItem;
            if (controller.draft.config !== "~/.config/Code" || controller.draft.shared !== "~/.vscode-shared" || !editor || editor.aliasRow.label !== "IDE alias" || editor.executableRow.label !== "IDE executable path" || editor.dataFolderRow.label !== "IDE data folder" || editor.sharedFolderRow.label !== "Shared history folder" || editor.argumentsGroup.heading.font.pixelSize !== HostCommon.Theme.fontSizeMedium || editor.argumentsGroup.addButton.variant !== "tonal" || editor.argumentsGroup.addButton.iconName !== "add") {
                console.warn("T:FAIL conventional VS Code folders");
                Qt.quit();
                return ;
            }
            controller.edit("name", "SecondCode");
            root.settingsPage.executablePicker.accepted([Quickshell.env("DEV_LAUNCHER_CODE_PATH")]);
            root.settingsPage.dataFolderPicker.accepted([Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/Code"]);
            if (controller.draft.executable !== Quickshell.env("DEV_LAUNCHER_CODE_PATH") || editor.executableRow.text !== Quickshell.env("DEV_LAUNCHER_CODE_PATH") || editor.executableRow.inputField.text !== Quickshell.env("DEV_LAUNCHER_CODE_PATH") || controller.draft.shared !== "") {
                console.warn("T:FAIL executable picker or storage override");
                Qt.quit();
                return ;
            }
            if (!editor.saveButton.enabled || controller.canSave || controller.submit()) {
                console.warn("T:FAIL Save bypassed IDE validation");
                Qt.quit();
                return ;
            }
            root.duplicateCheckPending = true;
            duplicateCheck.start();
        }
    }

    Timer {
        id: duplicateCheck

        interval: 550
        repeat: false
        onTriggered: {
            const controller = root.settingsPage.controller;
            const editor = root.settingsPage.ideSettingsView.editorItem;
            const input = editor.executableRow.inputField;
            const errorTop = editor.executableRow.errorLabel.mapToItem(input, 0, 0).y;
            if (!controller.validationError.includes("IDE executable path is already used") || !checks.hasFieldError("executable") || errorTop < input.height || controller.canSave || editor.saveButton.enabled || controller.providers.length !== 1) {
                console.warn("T:FAIL duplicate IDE paths did not disable Save " + controller.validationError);
                Qt.quit();
                return ;
            }
            root.duplicateCheckPending = false;
            root.argumentValidationPhase = 1;
            root.settingsPage.executablePicker.accepted([Quickshell.env("DEV_LAUNCHER_CODE_INSIDERS_PATH")]);
            root.settingsPage.dataFolderPicker.accepted([Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/Code2"]);
            controller.addArgument();
            controller.editArgument(0, "--bad-switch");
            typingArgumentRow = editor.argumentsGroup.argumentRows.itemAt(0);
            controller.editArgument(0, "--bad-switc");
            controller.editArgument(0, "--bad-switch");
            typingCheck.start();
        }
    }

    Timer {
        id: typingCheck

        interval: 550
        repeat: false
        onTriggered: {
            const controller = root.settingsPage.controller;
            const row = root.settingsPage.ideSettingsView.editorItem.argumentsGroup.argumentRows.itemAt(0);
            if (controller.validating || controller.validationError !== "" || controller.canSave || row !== checks.typingArgumentRow) {
                console.warn("T:FAIL typing validated the draft or recreated the argument field");
                Qt.quit();
                return ;
            }
            row.editingFinished(row.text);
        }
    }

}
