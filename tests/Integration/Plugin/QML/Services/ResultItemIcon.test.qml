// ResultItemIcon.test.qml - Check executable icon miss cache invalidation.
// Rules: Runs in the offscreen shell with fixture SVGs and fake handlers; a cached icon miss must clear when the desktop list changes, and badges must stay within the four-badge limit.
import "../../../../../src/Plugin/QML/Services" as Services
import QtQuick
import Quickshell

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
        const configuration = Object.assign({
        }, Services.ProvidersManager.defaultConfigurations()[0], {
            "iconPath": "/tmp/IDE 日本語.svg"
        });
        const facade = Services.ProvidersManager.candidate(configuration);
        const savedIcon = facade.iconPath;
        facade.properties.destroy();
        facade.destroy();
        if (!expect(savedIcon === configuration.iconPath, "provider facade lost its saved icon override"))
            return false;

        if (!expect(service.providerIconPath("zed", "/usr/bin/flatpak").endsWith("/icons/dev.zed.Zed.svg"), "the Flatpak provider did not use its declared IDE icon"))
            return false;

        if (!expect(service.executableIconPath(missingExecutable) === "", "unknown executable returned an icon"))
            return false;

        if (!expect(service.executableIcons[missingExecutable] === "", "desktop lookup miss was not cached"))
            return false;

        service.desktopLookup.entryCount = -7;
        service.executableIconPath("regression-other-executable");
        return expect(service.executableIcons[missingExecutable] === undefined && iconCache === service.executableIcons, "miss cache was not cleared when the desktop entry list changed");
    }

    // A shared file shows both IDEs, while a folder provider and a fifth IDE add no badge.
    function checkMultipleSources() {
        const service = root.iconService;
        const handlersBefore = Services.ProvidersManager.handlers;
        const svgBefore = service.svgContents;
        const iconsBefore = service.executableIcons;
        const lookupBefore = service.desktopLookup.entryCount;
        const cacheBefore = Services.FileMetadataService.cache;
        const base = root.fixtureRoot + "/icons/text-x-javascript.svg";
        const code = root.fixtureRoot + "/icons/vscode.svg";
        const zed = root.fixtureRoot + "/icons/dev.zed.Zed.svg";
        const folder = root.fixtureRoot + "/icons/folder.svg";
        const custom = root.fixtureRoot + "/icons/custom.svg";
        // Returns a 64 by 64 SVG string containing one rectangle filled with the given colour.
        function icon(fill) {
            return '<svg viewBox="0 0 64 64"><rect fill="' + fill + '"/></svg>';
        }
        // Returns a fake launchable native provider handler that reports the given provider type and executable.
        function provider(type, executable) {
            return {
                "launchable": true,
                "providerType": function() {
                    return type;
                },
                "installationType": function() {
                    return "native";
                },
                "executable": function() {
                    return executable;
                }
            };
        }
        try {
            service.desktopLookup.entryCount = DesktopEntries.applications.values.length;
            service.executableIcons = {
                "/usr/bin/code": code
            };
            const svg = {
            };
            svg[base] = icon("#aaaaaa");
            svg[folder] = icon("#aaaaaa");
            svg[code] = icon("#1188dd");
            svg[zed] = icon("#cc4455");
            svg[custom] = icon("#00ff00");
            const riderIcon = "/opt/Rider/bin/rider.svg";
            svg[riderIcon] = icon("#ff00ff");
            service.svgContents = svg;
            if (!expect(service.providerIconPath("rider", "/opt/Rider/bin/rider", "native") === riderIcon, "Rider did not use the icon next to its launcher"))
                return false;

            if (!expect(service.providerIconPath("rider", "/opt/Rider/bin/rider", "native", custom) === custom, "custom Rider icon did not override the detected icon"))
                return false;

            Services.FileMetadataService.cache = {
                "type:js": {
                    "iconName": "text-x-javascript",
                    "expiresAt": Date.now() + 60000
                }
            };
            Services.ProvidersManager.handlers = {
                "first": provider("vscode", "/usr/bin/code"),
                "second": provider("zed", "/usr/bin/flatpak"),
                "folder": {
                    "launchable": false
                },
                "third": provider("zed", "/usr/bin/flatpak"),
                "fourth": provider("zed", "/usr/bin/flatpak"),
                "fifth": provider("zed", "/usr/bin/flatpak")
            };
            const result = service.iconFor({
                "path": "/tmp/shared.js",
                "kind": "file",
                "sourceProviders": ["first", "folder", "second", "third", "fourth", "fifth"]
            });
            const content = decodeURIComponent(result.icon.slice(4));
            if (!expect(content.includes('fill="#1188dd"') && content.includes('fill="#cc4455"') && (content.match(/width="28" height="28"/g) || []).length === 4, "shared result did not show exactly four reporting IDE badges"))
                return false;

            Services.ProvidersManager.handlers.first.iconPath = custom;
            const overridden = decodeURIComponent(service.iconFor({
                "path": "/tmp/shared.js",
                "kind": "file",
                "sourceProviders": ["first"]
            }).icon.slice(4));
            if (!expect(overridden.includes('fill="#00ff00"') && !overridden.includes('fill="#1188dd"'), "custom IDE icon did not replace its badge"))
                return false;

            if (!expect(service.providerIconPath("vscode", "/usr/bin/code", "native", custom) === custom, "custom IDE icon did not replace the settings icon"))
                return false;

            const noBadges = service.iconFor({
                "path": "/tmp/shared.js",
                "kind": "file",
                "sourceProviders": ["first"]
            }, false);
            if (!expect(!noBadges.icon.startsWith("svg:data:"), "disabling badges did not remove the IDE badge"))
                return false;

            const plainRepository = service.iconFor({
                "path": "/tmp/repo",
                "kind": "repository",
                "sourceProviders": ["first"]
            }, false);
            if (!expect(!plainRepository.icon.startsWith("svg:data:"), "disabling badges did not remove the Git badge"))
                return false;

            const repository = service.iconFor({
                "path": "/tmp/repo",
                "kind": "repository",
                "sourceProviders": ["first", "second"]
            });
            const repositoryContent = decodeURIComponent(repository.icon.slice(4));
            return expect(repositoryContent.includes('transform="translate(2 2) scale(0.9333333333333333) translate(-34 -34)"') && repositoryContent.includes('d="M42 44v11'), "repository Git badge did not occupy the top-left corner at the IDE badge size");
        } finally {
            Services.ProvidersManager.handlers = handlersBefore;
            Services.FileMetadataService.cache = cacheBefore;
            service.svgContents = svgBefore;
            service.executableIcons = iconsBefore;
            service.desktopLookup.entryCount = lookupBefore;
        }
    }

    // A source's badge is remembered under a key of its inputs, and a new icon revision resolves it again.
    function checkBadgeMemoInvalidates() {
        const service = root.iconService;
        const handlersBefore = Services.ProvidersManager.handlers;
        const revisionBefore = service.revision;
        try {
            Services.ProvidersManager.handlers = {
                "memo": {
                    "launchable": true,
                    "providerType": function() {
                        return "vscode";
                    },
                    "installationType": function() {
                        return "native";
                    },
                    "executable": function() {
                        return "/usr/bin/code";
                    }
                }
            };
            service.iconFor({
                "path": "/tmp/memo.js",
                "kind": "file",
                "sourceProviders": ["memo"]
            });
            const firstKey = service.badgeMemo.memo ? service.badgeMemo.memo.key : "";
            if (!expect(firstKey !== "", "the badge was not remembered for its source"))
                return false;

            service.iconFor({
                "path": "/tmp/memo-other.js",
                "kind": "file",
                "sourceProviders": ["memo"]
            });
            if (!expect(service.badgeMemo.memo.key === firstKey, "the remembered badge key changed without a change to its inputs"))
                return false;

            service.revision = revisionBefore + 1;
            service.iconFor({
                "path": "/tmp/memo.js",
                "kind": "file",
                "sourceProviders": ["memo"]
            });
            return expect(service.badgeMemo.memo.key !== firstKey, "a new icon revision did not resolve the badge again");
        } finally {
            Services.ProvidersManager.handlers = handlersBefore;
            service.revision = revisionBefore;
        }
    }

}
