// ProviderEditor.qml - Edit one IDE with separate fields and argument rows.
// Rules: Every edit goes to the controller as a draft; this view shows the controller's values and holds no validity logic.
import "../../JS/Contracts/InstallationType.js" as InstallationType
import "../../JS/Helpers/Config.js" as Config
import "../Services"
import QtQuick
import QtQuick.Layouts
import qs.Common
import qs.DCommon.Widgets

// The editor for one IDE: it shows the draft fields and passes every change to the controller.
Column {
    id: root

    required property var controller
    readonly property alias installationDropdown: installationSelect
    readonly property alias aliasRow: aliasFieldRow
    readonly property alias executableRow: executableFieldRow
    readonly property alias dataFolderRow: dataFolderFieldRow
    readonly property alias sharedFolderRow: sharedFolderFieldRow
    readonly property alias argumentsGroup: argumentsSection
    readonly property alias cancelButton: cancelEditorButton
    readonly property alias saveButton: saveEditorButton
    readonly property alias iconPreview: iconPreview
    readonly property alias iconRenderer: editorIcon
    readonly property alias editIconButton: editIconButton
    readonly property alias resetIconButton: resetIconButton

    signal browseExecutableRequested()
    signal browseDataFolderRequested()
    signal browseSharedFolderRequested()
    signal browseIconRequested()

    spacing: Theme.spacingS
    width: parent ? parent.width : 0

    Item {
        width: parent.width
        height: Math.max(saveEditorButton.implicitHeight, cancelEditorButton.implicitHeight, iconPreview.height)

        DButton {
            id: saveEditorButton

            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            text: "Save IDE"
            enabled: root.controller.canSubmit
            onClicked: root.controller.submit()
        }

        Item {
            id: iconPreview

            anchors.centerIn: parent
            width: Theme.iconSizeLarge + Theme.spacingM * 2
            height: Theme.iconSizeLarge + Theme.spacingS * 2

            AppIconRenderer {
                id: editorIcon

                anchors.centerIn: parent
                width: Theme.iconSizeLarge
                height: Theme.iconSizeLarge
                iconSize: Theme.iconSizeLarge
                iconValue: {
                    if (!root || !root.controller)
                        return "material:code";

                    const revision = ResultItemIcon.revision;
                    const path = ResultItemIcon.providerIconPath(root.controller.draft.type || "", root.controller.draft.executable || "", root.controller.draft.installationType || "", root.controller.draft.iconPath || "");
                    return path ? "image:" + path : "material:code";
                }
            }

            HoverHandler {
                id: iconHover
            }

            Row {
                anchors.centerIn: parent
                visible: iconHover.hovered

                DActionButton {
                    id: editIconButton

                    iconName: "edit"
                    tooltipText: "Choose IDE icon"
                    backgroundColor: Theme.surfaceContainerHighest
                    onClicked: root.browseIconRequested()
                }

                DActionButton {
                    id: resetIconButton

                    iconName: "restart_alt"
                    tooltipText: "Reset IDE icon"
                    backgroundColor: Theme.surfaceContainerHighest
                    enabled: !!root.controller.draft.iconPath
                    onClicked: root.controller.edit("iconPath", "")
                }

            }

        }

        DButton {
            id: cancelEditorButton

            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            text: "Cancel"
            variant: "outlined"
            enabled: !root.controller.validating
            onClicked: root.controller.cancelEdit()
        }

    }

    DDropdown {
        id: providerDropdown

        text: "IDE type"
        options: ProvidersManager.sources.filter(function(provider) {
            return provider.launchable;
        }).map(function(provider) {
            return provider.name;
        })
        optionValues: ProvidersManager.sources.filter(function(provider) {
            return provider.launchable;
        }).map(function(provider) {
            return provider.id;
        })
        currentValue: root.controller.draft.type || ""
        width: parent.width
        onValueChanged: function(value) {
            root.controller.commitField("type", value);
        }
    }

    StyledText {
        text: root.controller.errorFor("type")
        visible: text !== ""
        color: Theme.error
        font.pixelSize: Theme.fontSizeSmall
        wrapMode: Text.WordWrap
        width: parent.width
    }

    RowLayout {
        width: parent.width
        spacing: Theme.spacingM

        StyledText {
            text: "Installation type"
            color: Theme.surfaceText
            font.pixelSize: Theme.fontSizeMedium
            Layout.fillWidth: true
        }

        Item {
            Layout.fillWidth: true
        }

        DDropdown {
            id: installationSelect

            // The installation choices that the selected IDE type declares.
            readonly property var available: ProvidersManager.descriptorFor(root.controller.draft.type || "").installations || []

            text: ""
            options: available.map(function(installation) {
                return InstallationType.label(installation.type);
            })
            optionValues: available.map(function(installation) {
                return installation.type;
            })
            currentValue: root.controller.draft.installationType || ProvidersManager.defaultsFor(root.controller.draft.type).installationType || InstallationType.Native
            dropdownWidth: Math.round(root.width * Config.settingsControlWidthFraction)
            onValueChanged: function(value) {
                root.controller.commitField("installationType", value);
            }
        }

    }

    StyledText {
        text: root.controller.errorFor("installationType")
        visible: text !== ""
        color: Theme.error
        font.pixelSize: Theme.fontSizeSmall
        wrapMode: Text.WordWrap
        width: parent.width
    }

    LabeledFieldRow {
        id: aliasFieldRow

        label: "IDE alias"
        description: "Name this installation in the launcher."
        text: root.controller.draft.name || ""
        placeholder: "Name this installation"
        errorText: root.controller.errorFor("name")
        onEdited: function(value) {
            root.controller.edit("name", value);
        }
        onEditingFinished: root.controller.requestValidation()
    }

    LabeledFieldRow {
        id: executableFieldRow

        label: installationSelect.currentValue === InstallationType.Flatpak ? "Flatpak executable path" : installationSelect.currentValue === InstallationType.Snap ? "Snap executable path" : root.controller.fieldFor("executable").label
        description: installationSelect.currentValue === InstallationType.Flatpak ? "Choose the Flatpak executable used to start this IDE." : installationSelect.currentValue === InstallationType.Snap ? "Choose the Snap executable used to start this IDE." : root.controller.fieldFor("executable").description
        text: root.controller.draft.executable || ""
        placeholder: root.controller.fieldFor("executable").placeholder
        actionText: "Browse"
        errorText: root.controller.errorFor("executable")
        onEdited: function(value) {
            root.controller.edit("executable", value);
        }
        onEditingFinished: root.controller.requestValidation()
        onActionRequested: root.browseExecutableRequested()
    }

    LabeledFieldRow {
        id: dataFolderFieldRow

        label: root.controller.fieldFor("config").label
        description: root.controller.fieldFor("config").description
        text: root.controller.draft.config || ""
        placeholder: root.controller.fieldFor("config").placeholder
        actionText: "Browse"
        errorText: root.controller.errorFor("config")
        onEdited: function(value) {
            root.controller.edit("config", value);
        }
        onEditingFinished: root.controller.requestValidation()
        onActionRequested: root.browseDataFolderRequested()
    }

    LabeledFieldRow {
        id: sharedFolderFieldRow

        visible: root.controller.fieldFor("shared").kind !== ""
        label: root.controller.fieldFor("shared").label
        description: root.controller.fieldFor("shared").description
        text: root.controller.draft.shared || ""
        placeholder: root.controller.fieldFor("shared").placeholder
        actionText: "Browse"
        errorText: root.controller.errorFor("shared")
        onEdited: function(value) {
            root.controller.edit("shared", value);
        }
        onEditingFinished: root.controller.requestValidation()
        onActionRequested: root.browseSharedFolderRequested()
    }

    AdditionalArguments {
        id: argumentsSection

        controller: root.controller
    }

    StyledText {
        text: root.controller.errorFor("")
        visible: text !== ""
        color: Theme.error
        font.pixelSize: Theme.fontSizeSmall
        wrapMode: Text.WordWrap
        width: parent.width
    }
    // Copies the controller's draft back into the text fields when the draft changes.

    Connections {
        // Copies the draft's name, executable, config, and shared folder into their fields when they differ.
        function onDraftChanged() {
            const draft = root.controller.draft;
            if (aliasFieldRow.text !== (draft.name || ""))
                aliasFieldRow.text = draft.name || "";

            if (executableFieldRow.text !== (draft.executable || ""))
                executableFieldRow.text = draft.executable || "";

            if (dataFolderFieldRow.text !== (draft.config || ""))
                dataFolderFieldRow.text = draft.config || "";

            if (sharedFolderFieldRow.text !== (draft.shared || ""))
                sharedFolderFieldRow.text = draft.shared || "";

        }

        target: root.controller
    }

}
