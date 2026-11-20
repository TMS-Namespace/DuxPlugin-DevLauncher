// MountScanner.qml - Read the current process mount table before classifying scanned paths.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/PathRules.js" as PathRules
import QtQml
import QtQuick
import Quickshell.Io

QtObject {
    id: root

    property var callback: null
    // The kernel's mount table, read as a file so no process starts.
    property FileView mountTable
    property Timer watchdog

    // Reading the table again for each scan keeps newly mounted shares visible.
    function read(completed) {
        callback = completed;
        watchdog.restart();
        mountTable.reload();
    }

    // Deliver one answer for the current read; a late answer after the watchdog or a second read is ignored.
    function finish(records) {
        const completed = callback;
        if (!completed)
            return ;

        callback = null;
        watchdog.stop();
        completed(records);
    }

    mountTable: FileView {
        path: "/proc/self/mountinfo"
        printErrors: false
        onLoaded: root.finish(PathRules.shareMounts(text()))
        // A failed mount-table read falls back to ordinary local path checks.
        onLoadFailed: root.finish([])
    }
    // Stops a mount-table read that never answers, so the scan continues with ordinary local path checks.

    watchdog: Timer {
        interval: Config.mountScanMilliseconds
        repeat: false
        onTriggered: root.finish([])
    }

}
