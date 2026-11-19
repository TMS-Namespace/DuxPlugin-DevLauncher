// FolderSettings.qml - Show scan folders with browse and remove actions.
import "../../JS/Helpers/Config.js" as Config
pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Layouts
import qs.Common
import qs.DCommon.Widgets

Column {
    id: root

    required property var controller
    readonly property alias folderRows: foldersRepeater
    readonly property alias errorLabel: folderErrorLabel
    readonly property alias addButton: addFolderButton

    signal browseRequested()

    spacing: Theme.spacingS
    width: parent ? parent.width : 0

    StyledText {
        text: "Choose folders containing Git repositories."
        color: Theme.surfaceVariantText
        font.pixelSize: Theme.fontSizeSmall
        wrapMode: Text.WordWrap
        width: parent.width
    }

    Repeater {
        id: foldersRepeater

        model: root.controller.folders

        delegate: Rectangle {
            id: folderDelegate

            required property int index
            required property var modelData
            // The latest scan error shown under this folder, exposed for integration checks.
            readonly property alias scanErrorText: folderScanError.text

            width: root.width
            height: folderColumn.implicitHeight + Theme.spacingS * 2
            color: Theme.surfaceContainerHigh
            radius: Theme.cornerRadiusS

            // Each folder shows its own latest scan error under its path. Errors stay here and are never toasted on every scan.
            ColumnLayout {
                id: folderColumn

                anchors.fill: parent
                anchors.margins: Theme.spacingS
                spacing: Theme.spacingS

                RowLayout {
                    id: folderRow

                    Layout.fillWidth: true
                    spacing: Theme.spacingS

                    StyledText {
                        text: folderDelegate.modelData.folder
                        color: Theme.surfaceText
                        elide: Text.ElideMiddle
                        Layout.fillWidth: true
                    }

                    DActionButton {
                        iconName: "close"
                        tooltipText: "Stop scanning this folder"
                        onClicked: root.controller.removeFolder(folderDelegate.index)
                    }

                }

                StyledText {
                    id: folderScanError

                    visible: text !== ""
                    text: root.controller.providerErrorFor(folderDelegate.modelData.id)
                    color: Theme.error
                    font.pixelSize: Theme.fontSizeSmall
                    wrapMode: Text.WordWrap
                    Layout.fillWidth: true
                }

            }

        }

    }

    StyledText {
        visible: root.controller.folders.length === 0
        text: "No folders selected."
        color: Theme.surfaceVariantText
    }

    StyledText {
        id: folderErrorLabel

        visible: root.controller.folderError !== ""
        text: root.controller.folderError
        color: Theme.error
        wrapMode: Text.WordWrap
        width: parent.width
    }

    DButton {
        id: addFolderButton

        text: "Add folder"
        iconName: "add"
        variant: "tonal"
        shape: "round"
        anchors.horizontalCenter: parent.horizontalCenter
        enabled: root.controller.folders.length < Config.maxScanFolders
        onClicked: root.browseRequested()
    }

}
