// SettingsController.test.qml - Check editor identity and damaged argument handling.
import QtQuick

QtObject {
    id: checks
    required property var fixture
    readonly property var root: fixture
    readonly property var expect: fixture.expect
    readonly property string firstIdentifier: fixture.firstIdentifier
    readonly property string secondIdentifier: fixture.secondIdentifier
    readonly property string thirdIdentifier: fixture.thirdIdentifier

    // Build one saved IDE declaration in the current settings format.
    function savedProvider(identifier, name, extraArguments) {
        return { id: identifier, type: "vscode", name: name, config: root.fixtureRoot + "/" + name, executable: "code", shared: "", extraArguments: extraArguments };
    }

    // Replace the saved IDE list and attach a fresh settings controller that loads it.
    function createController(providers) {
        if (root.controller) root.controller.destroy();
        root.settings.providers = providers;
        root.controller = root.controllerComponent.createObject(null, { pluginService: root.testPluginService });
        root.controller.load();
        return root.controller;
    }

    // Names of the IDEs in the controller's list, in display order.
    function providerNames(providers) {
        return providers.map(function(provider) { return provider.name; }).join(",");
    }

    // Removing an IDE above the open editor must move the editor with its own IDE.
    function checkRemovalAboveEditor() {
        const current = createController([savedProvider(firstIdentifier, "Alpha", []), savedProvider(secondIdentifier, "Beta", []), savedProvider(thirdIdentifier, "Gamma", [])]);
        current.beginEdit(1);
        current.removeProvider(0);
        return expect(current.editorOpen && current.editIndex === 0 && current.draft.name === "Beta" && providerNames(current.providers) === "Beta,Gamma",
            "removing an IDE above the open editor did not keep the editor on its own IDE: " + current.editIndex + " " + current.draft.name + " " + providerNames(current.providers));
    }

    // Removing the IDE being edited must close the editor so no stale row is overwritten.
    function checkRemovalOfEditedRow() {
        const current = createController([savedProvider(firstIdentifier, "Alpha", []), savedProvider(secondIdentifier, "Beta", [])]);
        current.beginEdit(1);
        current.removeProvider(1);
        return expect(!current.editorOpen && current.editIndex === -1 && providerNames(current.providers) === "Alpha" && !current.canSave,
            "removing the edited IDE left the editor open: " + current.editorOpen + " " + current.editIndex + " " + providerNames(current.providers));
    }

    // Saved arguments that are not a list must keep their warning when the editor opens.
    function checkInvalidSavedArguments() {
        const current = createController([savedProvider(firstIdentifier, "Broken", "--profile Work")]);
        current.beginEdit(0);
        return expect(current.validationError === root.savedArgumentsWarning && !current.canSave && current.draft.extraArguments.length === 0,
            "invalid saved arguments warning was cleared: " + current.validationError);
    }

    // Malformed draft values must identify their own field and appear only under that input.
    function checkErrorFieldRouting() {
        const valid = { id: firstIdentifier, type: "vscode", name: "Valid", config: root.fixtureRoot + "/Code", executable: "code", shared: "", extraArguments: [] };
        const invalidValues = { name: "1Invalid", executable: "", config: "relative", shared: "relative", extraArguments: [""] };
        const component = Qt.createComponent("file://" + root.pluginRoot + "/src/QML/Views/ProviderEditor.qml");
        if (!expect(component.status === Component.Ready, "provider editor could not load: " + component.errorString())) return false;
        for (const field of Object.keys(invalidValues)) {
            const current = createController([valid]);
            current.beginEdit(0);
            current.draft = Object.assign({}, valid, { [field]: invalidValues[field] });
            current.queueValidation();
            current.validateDraft();
            if (!expect(current.validationField === field && current.validationError !== "" && !current.canSave, "draft validation did not identify " + field)) return false;
            const editor = component.createObject(null, { controller: current, width: 1000 });
            const labels = { name: editor.aliasRow.errorLabel, executable: editor.executableRow.errorLabel, config: editor.dataFolderRow.errorLabel, shared: editor.sharedFolderRow.errorLabel, extraArguments: editor.argumentsGroup.errorLabel };
            const correct = Object.keys(labels).every(function(key) { return labels[key].text === (key === field ? current.validationError : ""); });
            editor.destroy();
            if (!expect(correct, "provider editor put " + field + " feedback under another field")) return false;
            current.cancelEdit();
        }
        return true;
    }

    // Every text-field edit stays unverified until the user commits it or requests Save.
    function checkTextEditsWaitForCommit() {
        const valid = { id: firstIdentifier, type: "vscode", name: "Valid", config: root.fixtureRoot + "/Code", executable: "code", shared: "", extraArguments: [] };
        const current = createController([valid]);
        current.beginEdit(0);
        const edits = { name: "New alias", executable: "co", config: "/tmp/typing", shared: "/tmp/shared", extraArguments: ["--pro"] };
        for (const field of Object.keys(edits)) {
            current.edit(field, edits[field]);
            if (!expect(!current.validationRequested && !current.validating && current.validationError === "" && !current.canSave, field + " validated while typing")) return false;
            current.requestValidation();
            if (!expect(current.validationRequested, field + " did not request validation after commit")) return false;
        }
        current.cancelEdit();
        return expect(!current.validationRequested && !current.saveRequested, "cancelling kept a pending validation or Save request");
    }

    // An invalid existing installation must not bypass duplicate-resource validation.
    function checkBrokenInstallationComparison() {
        const current = createController([savedProvider(firstIdentifier, "Broken", "invalid")]);
        current.editIndex = -1;
        const candidate = { validationPaths: function() { return []; } };
        const result = current.duplicateError(candidate, { type: "vscode", executable: "/usr/bin/code" });
        return expect(result.includes("invalid settings for Broken"), "invalid saved IDE was skipped during duplicate validation");
    }

    // Cancelling the editor must close it, forget its row, and invalidate checks, so a later removal cannot act on a stale index.
    function checkCancelEdit() {
        const current = createController([savedProvider(firstIdentifier, "Alpha", []), savedProvider(secondIdentifier, "Beta", []), savedProvider(thirdIdentifier, "Gamma", [])]);
        current.beginEdit(1);
        const revisionBeforeCancel = current.validationRevision;
        current.cancelEdit();
        if (!expect(!current.editorOpen && current.editIndex === -1 && current.validationRevision > revisionBeforeCancel, "cancel left the editor state or validation revision stale")) return false;
        current.removeProvider(0);
        return expect(!current.editorOpen && current.editIndex === -1 && providerNames(current.providers) === "Beta,Gamma",
            "removing an IDE after cancel acted on a stale row: " + current.editIndex + " " + providerNames(current.providers));
    }

    // A folder's latest scan error appears on that folder's own row, loaded at start and refreshed when the scan publishes.
    function checkFolderScanErrorShown() {
        const folderPath = root.fixtureRoot + "/sample";
        const otherPath = root.fixtureRoot + "/other-root";
        const message = "Repository folder " + folderPath + " was not scanned because the limit of 500 repositories was already reached.";
        root.settings.folders = [folderPath, otherPath];
        root.testPluginService.setGlobalVar("devLauncher", "folderErrors", [{ path: folderPath, message: message }]);
        const current = createController([savedProvider(firstIdentifier, "Alpha", [])]);
        if (!expect(current.scanErrorFor(folderPath) === message && current.scanErrorFor(otherPath) === "", "folder error was not loaded onto its own row")) return false;
        root.testPluginService.setGlobalVar("devLauncher", "folderErrors", []);
        return expect(current.scanErrorFor(folderPath) === "", "a cleared scan result kept the old folder error");
    }

    // Editing an IDE's executable clears only the dependent defaults the provider declares, and the labels come from its descriptor.
    function checkDependentFieldsFromDescriptor() {
        const defaults = { id: firstIdentifier, type: "vscode", name: "Defaults", config: "~/.config/Code", executable: "code", shared: "~/.vscode-shared", extraArguments: [] };
        const current = createController([defaults]);
        current.beginEdit(0);
        current.edit("executable", "/opt/tools/other-binary");
        if (!expect(current.draft.config === "" && current.draft.shared === "", "moving the executable kept the default folders: [" + current.draft.config + "] [" + current.draft.shared + "]")) return false;
        const sameName = createController([defaults]);
        sameName.beginEdit(0);
        sameName.edit("executable", "/usr/bin/code");
        if (!expect(sameName.draft.config === "~/.config/Code" && sameName.draft.shared === "~/.vscode-shared", "an executable with the same file name cleared the default folders")) return false;
        const labels = current.fieldFor("executable");
        return expect(labels.label === "IDE executable path" && labels.chooserTitle === "Choose IDE executable" && current.fieldFor("config").kind === "directory",
            "field labels did not come from the provider declaration: " + JSON.stringify(labels));
    }
}
