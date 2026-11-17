// ProviderEditor.qml - Edit one IDE with separate fields and argument rows.
import QtQuick
import QtQuick.Layouts
import qs.Common
import qs.DCommon.Widgets
import "../Services"

Column {
    id: root
    required property var controller
    readonly property alias aliasRow: aliasFieldRow
    readonly property alias executableRow: executableFieldRow
    readonly property alias dataFolderRow: dataFolderFieldRow
    readonly property alias sharedFolderRow: sharedFolderFieldRow
    readonly property alias argumentsGroup: argumentsSection
    readonly property alias cancelButton: cancelEditorButton
    readonly property alias saveButton: saveEditorButton
    signal browseExecutableRequested
    signal browseDataFolderRequested
    signal browseSharedFolderRequested
    spacing: Theme.spacingS
    width: parent ? parent.width : 0

    RowLayout {
        width: parent.width
        spacing: Theme.spacingS
        DButton { id: saveEditorButton; text: "Save IDE"; enabled: root.controller.canSubmit; onClicked: root.controller.submit() }
        Item { Layout.fillWidth: true }
        DButton { id: cancelEditorButton; text: "Cancel"; variant: "outlined"; enabled: !root.controller.validating; onClicked: root.controller.cancelEdit() }
    }
    DDropdown {
        id: providerDropdown
        text: "IDE type"
        options: ProvidersManager.sources.map(function(provider) { return provider.name; })
        optionValues: ProvidersManager.sources.map(function(provider) { return provider.id; })
        currentValue: root.controller.draft.type || ""
        width: parent.width
        onValueChanged: function(value) { root.controller.commitField("type", value); }
    }
    StyledText {
        text: root.controller.errorFor("type")
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
        onEdited: function(value) { root.controller.edit("name", value); }
        onEditingFinished: root.controller.requestValidation()
    }
    LabeledFieldRow {
        id: executableFieldRow
        label: root.controller.fieldFor("executable").label
        description: root.controller.fieldFor("executable").description
        text: root.controller.draft.executable || ""
        placeholder: root.controller.fieldFor("executable").placeholder
        actionText: "Browse"
        errorText: root.controller.errorFor("executable")
        onEdited: function(value) { root.controller.edit("executable", value); }
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
        onEdited: function(value) { root.controller.edit("config", value); }
        onEditingFinished: root.controller.requestValidation()
        onActionRequested: root.browseDataFolderRequested()
    }
    LabeledFieldRow {
        id: sharedFolderFieldRow
        label: root.controller.fieldFor("shared").label
        description: root.controller.fieldFor("shared").description
        text: root.controller.draft.shared || ""
        placeholder: root.controller.fieldFor("shared").placeholder
        actionText: "Browse"
        errorText: root.controller.errorFor("shared")
        onEdited: function(value) { root.controller.edit("shared", value); }
        onEditingFinished: root.controller.requestValidation()
        onActionRequested: root.browseSharedFolderRequested()
    }
    AdditionalArguments { id: argumentsSection; controller: root.controller }
    StyledText {
        text: root.controller.errorFor("")
        visible: text !== ""
        color: Theme.error
        font.pixelSize: Theme.fontSizeSmall
        wrapMode: Text.WordWrap
        width: parent.width
    }
    Connections {
        target: root.controller
        function onDraftChanged() {
            const draft = root.controller.draft;
            if (aliasFieldRow.text !== (draft.name || "")) aliasFieldRow.text = draft.name || "";
            if (executableFieldRow.text !== (draft.executable || "")) executableFieldRow.text = draft.executable || "";
            if (dataFolderFieldRow.text !== (draft.config || "")) dataFolderFieldRow.text = draft.config || "";
            if (sharedFolderFieldRow.text !== (draft.shared || "")) sharedFolderFieldRow.text = draft.shared || "";
        }
    }
}
