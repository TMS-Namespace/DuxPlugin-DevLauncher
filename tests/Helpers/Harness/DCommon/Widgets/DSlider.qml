// DSlider.qml - Match Dux repository slider values and choice signal in tests.
import QtQuick

Item {
    property int minimum: 0
    property int maximum: 100
    property int value: 0
    property bool wheelEnabled: true

    signal sliderValueChanged(int newValue)

    height: 24
}
