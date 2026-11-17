// AppSearchService.qml - Supply active built-in launcher triggers to settings tests.
pragma Singleton
import QtQuick
QtObject {
    property var builtInTriggers: ({ "?": "calculator" })
    function getBuiltInLauncherTriggers() { return builtInTriggers; }
}
