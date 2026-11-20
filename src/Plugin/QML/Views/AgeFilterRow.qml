// AgeFilterRow.qml - Keep the modification age label, number, and unit on one Dux settings row.
import "../../JS/Contracts/AgeUnit.js" as AgeUnit
import "../../JS/Helpers/Constants.js" as Constants
import QtQuick
import QtQuick.Layouts
import qs.Common
import qs.DCommon.Widgets

RowLayout {
    id: root

    property int ageValue: Constants.defaultAgeFilter.value
    property string ageUnit: Constants.defaultAgeFilter.unit
    required property int unitDropdownWidth
    readonly property string labelText: "Don't show items older than"
    readonly property alias amountStepper: amountInput
    readonly property alias unitDropdown: unitSelect

    signal amountEdited(int value)
    signal unitSelected(string value)

    width: parent ? parent.width : 0
    spacing: Theme.spacingM

    Column {
        Layout.fillWidth: true
        spacing: Theme.spacingXS

        StyledText {
            text: root.labelText
            color: Theme.surfaceText
            font.pixelSize: Theme.fontSizeMedium
            font.weight: Font.Medium
            width: parent.width
            wrapMode: Text.WordWrap
        }

        StyledText {
            text: "Judged by deriving an approximate date."
            color: Theme.surfaceVariantText
            font.pixelSize: Theme.fontSizeSmall
            width: parent.width
            wrapMode: Text.WordWrap
        }

    }

    RowLayout {
        Layout.preferredWidth: Math.round(root.width * Constants.settingsControlWidthFraction)
        spacing: Theme.spacingS

        Item {
            Layout.fillWidth: true
        }

        DNumberStepper {
            id: amountInput

            text: root.ageValue.toString()
            decrementEnabled: root.ageValue > Constants.minAgeFilterValue
            incrementEnabled: root.ageValue < Constants.maxAgeFilterValue
            onDecrement: () => {
                return root.amountEdited(root.ageValue - 1);
            }
            onIncrement: () => {
                return root.amountEdited(root.ageValue + 1);
            }
        }

        DDropdown {
            id: unitSelect

            text: ""
            dropdownWidth: root.unitDropdownWidth
            options: AgeUnit.values.map(function(unit) {
                return AgeUnit.label(unit);
            })
            optionValues: AgeUnit.values
            currentValue: root.ageUnit
            onValueChanged: function(value) {
                root.unitSelected(value);
            }
        }

    }

}
