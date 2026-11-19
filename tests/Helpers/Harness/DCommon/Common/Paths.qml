// Paths.qml - Resolve deterministic theme icon paths in launcher tests.
pragma Singleton
import QtQuick
import Quickshell

QtObject {
    function resolveIconPath(name) {
        return name && name !== "missing-workspace-icon" ? Quickshell.env("DEV_LAUNCHER_FIXTURE") + "/icons/" + name + ".svg" : "";
    }

}
