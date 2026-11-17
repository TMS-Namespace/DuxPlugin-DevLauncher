// ConfirmModal.qml - Match Dux's confirmation callback and cancellation contract.
import QtQuick

Item {
    property bool shouldBeVisible: false
    property string confirmTitle: ""
    property string confirmMessage: ""
    property string confirmButtonText: "Confirm"
    property bool danger: false
    property var onConfirm: function() {}
    property var onCancel: function() {}

    function showWithOptions(options) {
        confirmTitle = options.title || "";
        confirmMessage = options.message || "";
        confirmButtonText = options.confirmText || "Confirm";
        danger = options.danger === true;
        onConfirm = options.onConfirm || function() {};
        onCancel = options.onCancel || function() {};
        shouldBeVisible = true;
    }

    function _activate(button) {
        shouldBeVisible = false;
        if (button === 0) onCancel();
        else onConfirm();
    }
}
