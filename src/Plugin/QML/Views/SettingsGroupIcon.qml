// SettingsGroupIcon.qml - Place a themed icon inside a Dux section header.
import qs.Common
import qs.DCommon.Common as DuxCommon
import qs.DCommon.Widgets

DIcon {
    required property string iconName
    name: iconName
    size: DuxCommon.Style.iconSize
    color: Theme.surfaceText
    x: DuxCommon.Style.spacingL
    y: (DuxCommon.Style.listItemHeight - height) / 2
    enabled: false
}
