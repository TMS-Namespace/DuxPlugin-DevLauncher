// FolderSettings.test.qml - Check that each folder row shows its own latest scan error.
import QtQuick

QtObject {
    required property var fixture

    // A failing folder shows its error on its own row; a folder with no error shows nothing.
    function checkFolderRowShowsScanError() {
        const folderPath = fixture.fixtureRoot + "/sample";
        const otherPath = fixture.fixtureRoot + "/other-root";
        const message = "Repository folder " + folderPath + " was not scanned because the limit of 500 repositories was already reached.";
        fixture.settings.folders = [folderPath, otherPath];
        fixture.testPluginService.setGlobalVar("devLauncher", "folderErrors", [{ path: folderPath, message: message }]);
        const controller = fixture.controllerComponent.createObject(null, { pluginService: fixture.testPluginService });
        controller.load();
        const viewComponent = Qt.createComponent("file://" + fixture.pluginRoot + "/src/QML/Views/FolderSettings.qml");
        if (!fixture.expect(viewComponent.status === Component.Ready, "folder view load " + viewComponent.errorString())) return false;
        const view = viewComponent.createObject(null, { controller: controller, width: 400 });
        if (!fixture.expect(view.folderRows.count === 2, "folder rows were not created: " + view.folderRows.count)) return false;
        const firstRowText = view.folderRows.itemAt(0).scanErrorText;
        const secondRowText = view.folderRows.itemAt(1).scanErrorText;
        view.destroy();
        controller.destroy();
        fixture.testPluginService.setGlobalVar("devLauncher", "folderErrors", []);
        return fixture.expect(firstRowText === message && secondRowText === "", "folder rows show the wrong errors: [" + firstRowText + "] [" + secondRowText + "]");
    }
}
