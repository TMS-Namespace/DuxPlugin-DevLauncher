// ResultItemIcon.test.qml - Check executable icon miss cache invalidation.
import QtQuick

QtObject {
    id: checks
    required property var fixture
    readonly property var root: fixture
    readonly property var expect: fixture.expect

    // A desktop lookup miss is cached, and a change in the desktop entry list clears that cache.
    function checkIconMissCache() {
        const missingExecutable = "regression-missing-executable";
        const service = root.iconService;
        const iconCache = service.executableIcons;
        if (!expect(service.executableIconPath(missingExecutable) === "", "unknown executable returned an icon")) return false;
        if (!expect(service.executableIcons[missingExecutable] === "", "desktop lookup miss was not cached")) return false;
        service.desktopLookup.entryCount = -7;
        service.executableIconPath("regression-other-executable");
        return expect(service.executableIcons[missingExecutable] === undefined && iconCache === service.executableIcons,
            "miss cache was not cleared when the desktop entry list changed");
    }
}
