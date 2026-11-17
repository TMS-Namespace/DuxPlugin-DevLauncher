// SystemOpener.qml - Open a local path through the desktop's file association.
pragma Singleton
import QtQml
import Quickshell

QtObject {
    // Keep the fallback command outside launcher decision logic.
    function launch(path) {
        if (!path || !path.startsWith("/")) return false;
        Quickshell.execDetached(["xdg-open", path]);
        return true;
    }
}
