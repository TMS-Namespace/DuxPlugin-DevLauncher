// AdditionalArguments.qml - Group editable IDE command arguments in one themed section.
pragma ComponentBehavior: Bound
import QtQuick
import qs.Common
import qs.DCommon.Widgets

Rectangle {
    id: root
    required property var controller
    readonly property alias heading: sectionHeading
    readonly property alias addButton: addArgumentButton
    readonly property alias errorLabel: argumentsError
    readonly property alias argumentRows: argumentsRepeater
    width: parent ? parent.width : 0
    height: contentColumn.implicitHeight + Theme.spacingS * 2
    color: Theme.surfaceContainerHigh
    radius: Theme.cornerRadiusS

    Column {
        id: contentColumn
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.top: parent.top
        anchors.margins: Theme.spacingS
        spacing: Theme.spacingS
        StyledText {
            id: sectionHeading
            text: "Additional command arguments"
            color: Theme.surfaceText
            font.pixelSize: Theme.fontSizeMedium
            font.weight: Font.Medium
        }
        Repeater {
            id: argumentsRepeater
            model: Array.isArray(root.controller.draft.extraArguments) ? root.controller.draft.extraArguments.length : 0
            delegate: LabeledFieldRow {
                required property int index
                label: "Argument " + (index + 1)
                text: root.controller.draft.extraArguments[index] || ""
                placeholder: "One switch or value"
                actionIcon: "close"
                onEdited: function(value) { root.controller.editArgument(index, value); }
                onEditingFinished: root.controller.requestValidation()
                onActionRequested: root.controller.removeArgument(index)
            }
        }
        StyledText {
            id: argumentsError
            text: root.controller.errorFor("extraArguments")
            visible: text !== ""
            color: Theme.error
            font.pixelSize: Theme.fontSizeSmall
            wrapMode: Text.WordWrap
            width: parent.width
        }
        DButton { id: addArgumentButton; text: "Add argument"; iconName: "add"; variant: "tonal"; shape: "round"; anchors.horizontalCenter: parent.horizontalCenter; onClicked: root.controller.addArgument() }
    }
}
