// LabeledFieldRow.qml - Pair a visible left label with a right Dux text field.
import "../../JS/Helpers/Config.js" as Config
import QtQuick
import QtQuick.Layouts
import qs.Common
import qs.DCommon.Widgets

RowLayout {
    id: root

    property string label: ""
    property string description: ""
    property string errorText: ""
    property string placeholder: ""
    property string actionText: ""
    property string actionIcon: ""
    property int fieldWidth: 0
    property alias text: field.text
    readonly property alias inputField: field
    property alias validator: field.validator
    readonly property alias errorLabel: fieldError

    signal edited(string value)
    signal editingFinished(string value)
    signal actionRequested()

    width: parent ? parent.width : 0
    spacing: Theme.spacingM

    // Keep the help text beside the control, matching Dux's settings rows.
    Column {
        Layout.fillWidth: true
        spacing: Theme.spacingXS

        StyledText {
            text: root.label
            color: Theme.surfaceText
            font.pixelSize: Theme.fontSizeMedium
            font.weight: Font.Medium
            width: parent.width
            wrapMode: Text.WordWrap
        }

        StyledText {
            text: root.description
            color: Theme.surfaceVariantText
            font.pixelSize: Theme.fontSizeSmall
            width: parent.width
            wrapMode: Text.WordWrap
            visible: root.description !== ""
        }

    }

    ColumnLayout {
        Layout.preferredWidth: Math.round(root.width * Config.settingsControlWidthFraction)
        spacing: Theme.spacingS

        RowLayout {
            Layout.fillWidth: true
            spacing: Theme.spacingS

            Item {
                Layout.fillWidth: true
                visible: root.fieldWidth > 0
            }

            DTextField {
                id: field

                placeholderText: root.placeholder
                Layout.fillWidth: root.fieldWidth <= 0
                Layout.preferredWidth: root.fieldWidth > 0 ? root.fieldWidth : -1
                onTextEdited: root.edited(text)
                onEditingFinished: root.editingFinished(text)
            }

            DButton {
                text: root.actionText
                visible: root.actionText !== ""
                onClicked: root.actionRequested()
            }

            DActionButton {
                iconName: root.actionIcon
                tooltipText: "Remove argument"
                visible: root.actionIcon !== ""
                onClicked: root.actionRequested()
            }

        }

        StyledText {
            id: fieldError

            text: root.errorText
            visible: text !== ""
            color: Theme.error
            font.pixelSize: Theme.fontSizeSmall
            wrapMode: Text.WrapAnywhere
            Layout.fillWidth: true
        }

    }

}
