// DNumberStepper.qml - Match Dux numeric stepper properties in QML tests.
import QtQuick

Item {
    property string text: ""
    property bool incrementEnabled: true
    property bool decrementEnabled: true
    property var onIncrement: undefined
    property var onDecrement: undefined

    width: 64
    height: 72
}
