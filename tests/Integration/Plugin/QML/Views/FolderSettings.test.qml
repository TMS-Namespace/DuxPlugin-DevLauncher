// FolderSettings.test.qml - Check that each folder row shows the scan error of its own folder source.
// Rules: Runs in the offscreen shell; each folder row must show only the scan error published for its own identifier.
import "../../../../../src/Plugin/QML/Services" as Services
import QtQuick

QtObject {
    required property var fixture

    // A failing folder shows its error on its own row, matched by the folder's identifier; a folder with no error shows nothing.
    function checkFolderRowShowsScanError() {
        const folderPath = fixture.fixtureRoot + "/sample";
        const otherPath = fixture.fixtureRoot + "/other-root";
        const message = "Repository folder " + folderPath + " has more than 500 repositories; only the first 500 are listed.";
        fixture.settings.folders = [{
            "installationType": "native",
            "id": fixture.secondIdentifier,
            "type": "localgit",
            "folder": folderPath
        }, {
            "installationType": "native",
            "id": fixture.thirdIdentifier,
            "type": "localgit",
            "folder": otherPath
        }];
        Services.ScanState.providerErrors = [{
            "providerId": fixture.secondIdentifier,
            "message": message
        }];
        const controller = fixture.controllerComponent.createObject(null, {
            "pluginService": fixture.testPluginService
        });
        controller.load();
        const viewComponent = Qt.createComponent("file://" + fixture.pluginRoot + "/src/Plugin/QML/Views/FolderSettings.qml");
        if (!fixture.expect(viewComponent.status === Component.Ready, "folder view load " + viewComponent.errorString()))
            return false;

        const view = viewComponent.createObject(null, {
            "controller": controller,
            "width": 400
        });
        if (!fixture.expect(view.folderRows.count === 2, "folder rows were not created: " + view.folderRows.count))
            return false;

        const firstRowText = view.folderRows.itemAt(0).scanErrorText;
        const secondRowText = view.folderRows.itemAt(1).scanErrorText;
        view.destroy();
        controller.destroy();
        Services.ScanState.providerErrors = [];
        return fixture.expect(firstRowText === message && secondRowText === "", "folder rows show the wrong errors: [" + firstRowText + "] [" + secondRowText + "]");
    }

}
