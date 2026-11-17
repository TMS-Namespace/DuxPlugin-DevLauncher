// IdeSettings.qml - List configured IDEs and open the provider editor.
import QtQuick
import QtQuick.Layouts
import qs.Common
import qs.DCommon.Widgets
import qs.Modals.Common
import "../../JS/Helpers/Config.js" as Config
import "../Services"

Column {
    id: root
    required property var controller
    readonly property var editorItem: {
        if (!root.controller.editorOpen) return null;
        if (root.controller.editIndex < 0) return addEditorLoader.item;
        const selectedRow = providersRepeater.itemAt(root.controller.editIndex);
        return selectedRow ? selectedRow.editorItem : null;
    }
    readonly property alias providerRows: providersRepeater
    readonly property alias addButton: addIdeButton
    readonly property alias removalDialog: ideRemovalDialog
    signal browseExecutableRequested
    signal browseDataFolderRequested
    signal browseSharedFolderRequested
    spacing: Theme.spacingS
    width: parent ? parent.width : 0

    // Ask Dux to show its modal confirmation before deleting the selected installation.
    function confirmRemoval(provider) {
        const selectedId = provider.id;
        ideRemovalDialog.showWithOptions({
            title: "Remove IDE",
            message: "Remove " + provider.name + " from Dev Launcher? Its recent items will no longer appear.",
            confirmText: "Remove IDE",
            danger: true,
            onConfirm: function() {
                const position = root.controller.providers.findIndex(function(candidate) { return candidate.id === selectedId; });
                if (position >= 0) root.controller.removeProvider(position);
            }
        });
    }

    StyledText {
        text: "Add each IDE separately. Recent items open in their source IDE; scanned repositories use the global default."
        color: Theme.surfaceVariantText
        font.pixelSize: Theme.fontSizeSmall
        wrapMode: Text.WordWrap
        width: parent.width
    }
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
    Component {
        id: editorType
        ProviderEditor {
            controller: root.controller
            onBrowseExecutableRequested: root.browseExecutableRequested()
            onBrowseDataFolderRequested: root.browseDataFolderRequested()
            onBrowseSharedFolderRequested: root.browseSharedFolderRequested()
        }
    }
    Repeater {
        id: providersRepeater
        model: root.controller.providers
        delegate: Column {
            required property int index
            required property var modelData
            width: root.width
            spacing: Theme.spacingXS
            readonly property alias nameLabel: providerName
            readonly property alias iconRenderer: providerIcon
            readonly property alias rowBackground: providerRowBackground
            readonly property alias editorItem: editorLoader.item
            readonly property alias editorBackground: editorCard
            readonly property alias editButton: editIdeButton
            readonly property alias removeButton: removeIdeButton
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
                            const iconPath = ResultItemIcon.executableIconPath(modelData.executable);
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
                    DActionButton { id: removeIdeButton; iconName: "close"; tooltipText: "Remove IDE"; onClicked: root.confirmRemoval(modelData) }
                }
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
        enabled: root.controller.providers.length < Config.maxProviders
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
