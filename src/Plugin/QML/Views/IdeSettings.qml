// IdeSettings.qml - List configured IDEs and open the provider editor.
// Rules: Rows show the saved IDEs and their last scan errors; every change goes through the controller.
import "../../JS/Helpers/Constants.js" as Constants
import "../Services"
import QtQuick
import QtQuick.Layouts
import qs.Common
import qs.DCommon.Widgets
import qs.Modals.Common

// The list of saved IDEs with their scan errors, the add button, and the removal dialog.
Column {
    id: root

    required property var controller
    // The editor that is open: the add editor, or the editor of the row being edited.
    readonly property var editorItem: {
        if (!root.controller.editorOpen)
            return null;

        if (root.controller.editIndex < 0)
            return addEditorLoader.item;

        const selectedRow = providersRepeater.itemAt(root.controller.editIndex);
        return selectedRow ? selectedRow.editorItem : null;
    }
    readonly property alias providerRows: providersRepeater
    readonly property alias addButton: addIdeButton
    readonly property alias removalDialog: ideRemovalDialog

    signal browseExecutableRequested()
    signal browseDataFolderRequested()
    signal browseSharedFolderRequested()
    signal browseIconRequested()

    // Ask Dux to show its modal confirmation before deleting the selected installation.
    function confirmRemoval(provider) {
        const selectedId = provider.id;
        ideRemovalDialog.showWithOptions({
            "title": "Remove IDE",
            "message": "Remove " + provider.name + " from Dev Launcher? Its recent items will no longer appear.",
            "confirmText": "Remove IDE",
            "danger": true,
            "onConfirm": function() {
                const position = root.controller.providers.findIndex(function(candidate) {
                    return candidate.id === selectedId;
                });
                if (position >= 0)
                    root.controller.removeProvider(position);

            }
        });
    }

    spacing: Theme.spacingS
    width: parent ? parent.width : 0

    StyledText {
        text: "Add each IDE separately. Recent items open in their source IDE; scanned repositories use the global default."
        color: Theme.surfaceVariantText
        font.pixelSize: Theme.fontSizeSmall
        wrapMode: Text.WordWrap
        width: parent.width
    }
    // Lists every IDE that failed to load, with its name and message.

    Repeater {
        model: ProvidersManager.loadErrors

        delegate: StyledText {
            required property var modelData

            text: modelData.name + ": " + modelData.userMessage
            color: Theme.error
            wrapMode: Text.WordWrap
            width: root.width
        }

    }
    // The template for one provider editor, shared by the row editor and the add editor.

    Component {
        id: editorType

        ProviderEditor {
            controller: root.controller
            onBrowseExecutableRequested: root.browseExecutableRequested()
            onBrowseDataFolderRequested: root.browseDataFolderRequested()
            onBrowseSharedFolderRequested: root.browseSharedFolderRequested()
            onBrowseIconRequested: root.browseIconRequested()
        }

    }
    // One row per saved IDE, each with its own editor card.

    Repeater {
        id: providersRepeater

        model: root.controller.providers

        // One IDE row: its icon, name, edit and remove buttons, scan error text, and editor card.
        delegate: Column {
            required property int index
            required property var modelData
            readonly property alias nameLabel: providerName
            readonly property alias iconRenderer: providerIcon
            readonly property alias rowBackground: providerRowBackground
            readonly property alias editorItem: editorLoader.item
            readonly property alias editorBackground: editorCard
            readonly property alias editButton: editIdeButton
            readonly property alias removeButton: removeIdeButton
            readonly property alias scanErrorText: providerScanError.text

            width: root.width
            spacing: Theme.spacingXS

            Rectangle {
                id: providerRowBackground

                width: parent.width
                height: providerRow.implicitHeight + Theme.spacingS * 2
                color: Theme.surfaceContainerHigh
                radius: Theme.cornerRadiusS

                RowLayout {
                    id: providerRow

                    anchors.fill: parent
                    anchors.margins: Theme.spacingS
                    spacing: Theme.spacingS

                    AppIconRenderer {
                        id: providerIcon

                        iconValue: {
                            const revision = ResultItemIcon.revision;
                            const iconPath = ResultItemIcon.providerIconPath(modelData.type, modelData.executable, modelData.installationType, modelData.iconPath);
                            return iconPath ? "image:" + iconPath : "material:code";
                        }
                        iconSize: Theme.iconSizeLarge
                        Layout.preferredWidth: Theme.iconSizeLarge
                        Layout.preferredHeight: Theme.iconSizeLarge
                    }

                    StyledText {
                        id: providerName

                        text: modelData.name
                        color: Theme.surfaceText
                        font.pixelSize: Theme.fontSizeLarge
                        font.weight: Font.Medium
                        Layout.fillWidth: true
                        elide: Text.ElideRight
                    }

                    DActionButton {
                        id: editIdeButton

                        iconName: "edit"
                        tooltipText: "Edit IDE"
                        enabled: !editorCard.visible
                        onClicked: root.controller.beginEdit(index)
                    }

                    DActionButton {
                        id: removeIdeButton

                        iconName: "close"
                        tooltipText: "Remove IDE"
                        onClicked: root.confirmRemoval(modelData)
                    }

                }

            }
            // The IDE's latest scan error, shown only here (never as a repeated toast).

            StyledText {
                id: providerScanError

                visible: text !== ""
                text: root.controller.providerErrorFor(modelData.id)
                color: Theme.error
                font.pixelSize: Theme.fontSizeSmall
                wrapMode: Text.WordWrap
                width: parent.width
            }

            Rectangle {
                id: editorCard

                visible: root.controller.editorOpen && root.controller.editIndex === index
                x: Theme.spacingM
                width: Math.max(0, parent.width - Theme.spacingM * 2)
                height: visible ? editorLoader.height + Theme.spacingM * 2 : 0
                color: Theme.surfaceContainerHighest
                radius: Theme.cornerRadiusS

                Loader {
                    id: editorLoader

                    active: editorCard.visible
                    x: Theme.spacingM
                    y: Theme.spacingM
                    width: Math.max(0, parent.width - Theme.spacingM * 2)
                    height: active && item ? item.implicitHeight : 0
                    sourceComponent: editorType
                }

            }

        }

    }

    DButton {
        id: addIdeButton

        text: "Add IDE"
        iconName: "add"
        variant: "tonal"
        shape: "round"
        anchors.horizontalCenter: parent.horizontalCenter
        visible: !root.controller.editorOpen
        enabled: root.controller.providers.length < Constants.maxProviders
        onClicked: root.controller.beginAdd()
    }

    Rectangle {
        id: addEditorCard

        visible: root.controller.editorOpen && root.controller.editIndex < 0
        x: Theme.spacingM
        width: Math.max(0, root.width - Theme.spacingM * 2)
        height: visible ? addEditorLoader.height + Theme.spacingM * 2 : 0
        color: Theme.surfaceContainerHighest
        radius: Theme.cornerRadiusS

        Loader {
            id: addEditorLoader

            active: addEditorCard.visible
            x: Theme.spacingM
            y: Theme.spacingM
            width: Math.max(0, parent.width - Theme.spacingM * 2)
            height: active && item ? item.implicitHeight : 0
            sourceComponent: editorType
        }

    }

    ConfirmModal {
        id: ideRemovalDialog
    }

}
