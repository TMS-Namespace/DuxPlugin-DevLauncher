// ResultItemIcon.qml - Build launcher icon descriptors and cache executable icon assets.
// Rules: Each SVG is read once, kept within a size and count bound, and a failed or oversized SVG read is stored as empty and is not retried while its entry stays cached.
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/ExecutableIconRules.js" as ExecutableIconRules
import "../../JS/Helpers/IconRules.js" as IconRules
import "../../JS/Helpers/PathRules.js" as PathRules
import QtQml
pragma Singleton
pragma ComponentBehavior: Bound
import QtQuick
import Quickshell
import Quickshell.Io
import qs.DCommon.Common

// The singleton that builds launcher icon descriptors and caches icon files and desktop-entry lookups.
QtObject {
    id: root

    // The icon path of each configured executable, cleared when the desktop entry list changes.
    property var executableIcons: ({
    })
    // The icon path of each desktop identifier, cleared together with the executable cache.
    property var desktopIcons: ({
    })
    // The desktop entry count that the two caches were built for.
    property var desktopLookup: ({
        "entryCount": -1
    })
    // The content of each SVG read so far, keyed by path; an empty string marks a failed or oversized read.
    property var svgContents: ({
    })
    // The SVG paths that are queued or being read, so each file is requested only once.
    property var pendingSvg: ({
    })
    // The SVG paths waiting for a free reader slot.
    property var svgQueue: []
    property int activeSvgReads: 0
    property int revision: 0
    // The last badge resolved for each source IDE, with the key it was resolved under.
    property var badgeMemo: ({
    })
    // The template for one FileView that reads a single SVG file.
    property Component svgReaderType
    // Debounces icon refreshes so a burst of finished SVG reads causes one revision bump.
    property Timer refreshTimer

    signal iconsChanged()

    // Queue each SVG only once and return its cached content when ready.
    function svgFor(iconPath) {
        if (!iconPath || !iconPath.toLowerCase().endsWith(".svg"))
            return "";

        if (svgContents[iconPath] !== undefined)
            return svgContents[iconPath];

        if (!pendingSvg[iconPath] && svgQueue.length + activeSvgReads < Config.maxSvgEntries) {
            pendingSvg[iconPath] = true;
            svgQueue = svgQueue.concat([iconPath]);
            startSvgReads();
        }
        return "";
    }

    // Read only a few theme files at once, then notify active launcher results.
    function startSvgReads() {
        while (activeSvgReads < Config.maxIconLookups && svgQueue.length) {
            const iconPath = svgQueue.shift();
            activeSvgReads++;
            svgReaderType.createObject(root, {
                "path": iconPath
            });
        }
    }

    // Keep SVG contents bounded and release the completed FileView.
    function completeSvg(iconPath, content, reader) {
        const updated = Object.assign({
        }, svgContents);
        const value = String(content || "");
        updated[iconPath] = value.length <= Config.maxSvgCharacters ? value : "";
        const paths = Object.keys(updated);
        for (const oldPath of paths.slice(0, Math.max(0, paths.length - Config.maxSvgEntries))) delete updated[oldPath]
        svgContents = updated;
        delete pendingSvg[iconPath];
        activeSvgReads = Math.max(0, activeSvgReads - 1);
        reader.destroy();
        refreshTimer.restart();
        startSvgReads();
    }

    // Resolve the icon associated with one configured executable once.
    // "No desktop entry" is cached only after the entries have loaded, so an empty early list cannot hide the icon forever.
    // A found entry whose icon file is not resolved yet is retried on the next call.
    function executableIconPath(executable) {
        if (!executable)
            return "";

        const desktopEntries = updateDesktopEntries();
        if (executableIcons[executable] !== undefined)
            return executableIcons[executable];

        const desktopIcon = ExecutableIconRules.iconName(executable, desktopEntries);
        const iconPath = desktopIcon ? Paths.resolveIconPath(desktopIcon) : "";
        // A found entry whose icon file is not resolved yet is retried; a missing entry is cached until the list changes.
        if (iconPath || !desktopIcon)
            executableIcons[executable] = iconPath;

        return iconPath;
    }

    // Clear both lookup caches together when Dux changes its list of desktop entries.
    function updateDesktopEntries() {
        const entries = DesktopEntries.applications.values;
        if (entries.length !== desktopLookup.entryCount) {
            for (const key of Object.keys(executableIcons)) delete executableIcons[key]
            for (const key of Object.keys(desktopIcons)) delete desktopIcons[key]
            desktopLookup.entryCount = entries.length;
        }
        return entries;
    }

    // Resolve a packaging-specific desktop entry, including its absolute icon path when supplied by Snap.
    function desktopIconPath(desktopId) {
        const entries = updateDesktopEntries();
        if (desktopIcons[desktopId] !== undefined)
            return desktopIcons[desktopId];

        const icon = ExecutableIconRules.desktopIconName(desktopId, entries);
        const path = icon.startsWith("/") || icon.startsWith("file://") ? icon : icon ? Paths.resolveIconPath(icon) : "";
        if (path || !icon)
            desktopIcons[desktopId] = path;

        return path;
    }

    // A provider can name its desktop icon when its executable is a generic launcher such as Flatpak.
    function providerIconPath(providerType, executable, installationType, overridePath) {
        if (overridePath)
            return overridePath;

        const descriptor = ProvidersManager.descriptorFor(providerType);
        if ((!installationType || installationType === "native") && descriptor.nativeIconFile && executable && executable.indexOf("/") >= 0) {
            const sibling = executable.substring(0, executable.lastIndexOf("/") + 1) + descriptor.nativeIconFile;
            if (svgFor(sibling))
                return sibling;

        }
        const installation = (descriptor.installations || []).find(function(choice) {
            return choice.type === installationType;
        });
        const desktopIcon = installation && installation.desktopId ? desktopIconPath(installation.desktopId) : "";
        if (desktopIcon)
            return desktopIcon;

        const iconName = installation && installation.iconName || descriptor.iconName;
        const providerIcon = iconName ? Paths.resolveIconPath(iconName) : "";
        return providerIcon || executableIconPath(executable);
    }

    // The badge path of one source IDE, or "" when it has none. A badge depends on the source and not on the result, so it is
    // resolved once per source and reused until the source's settings, the icon revision, or the desktop entries change.
    function badgeFor(sourceId) {
        const source = ProvidersManager.handlerFor(sourceId);
        if (!source || !source.launchable)
            return "";

        const iconPath = source.iconPath || "";
        const key = [source.providerType(), source.executable(), source.installationType(), iconPath, revision, DesktopEntries.applications.values.length].join("\n");
        const memo = badgeMemo[sourceId];
        if (memo && memo.key === key)
            return memo.path;

        const badge = providerIconPath(source.providerType(), source.executable(), source.installationType(), iconPath);
        const path = badge && !(badge.endsWith(".svg") && svgContents[badge] === "") ? badge : "";
        badgeMemo[sourceId] = {
            "key": key,
            "path": path
        };
        return path;
    }

    // Return a result's themed icon with its source IDE and Git markers.
    function iconFor(item, showBadges) {
        const path = item.path;
        const kind = item.kind;
        if (showBadges === false) {
            const iconName = FileMetadataService.iconNameFor(path, kind);
            const appearance = kind !== "file" && PathRules.resourceType(path) !== "remote" && Host.appearance ? Host.appearance.lookup(path) : null;
            return IconRules.descriptor(kind === "repository" ? "folder" : kind, appearance && appearance.icon ? appearance.icon : iconName, "", "", "", "");
        }
        const sources = item.sourceProviders || (item.sourceProvider ? [item.sourceProvider] : []);
        const badgePaths = [];
        for (const sourceId of sources) {
            const badge = badgeFor(sourceId);
            if (badge)
                badgePaths.push(badge);

            if (badgePaths.length >= Config.maxSourceBadges)
                break;

        }
        const iconName = FileMetadataService.iconNameFor(path, kind);
        const appearance = kind !== "file" && PathRules.resourceType(path) !== "remote" && Host.appearance ? Host.appearance.lookup(path) : null;
        const chosenName = appearance && appearance.icon ? appearance.icon : iconName;
        let resolvedPath = "";
        if (kind === "repository" || badgePaths.length) {
            for (const candidate of IconRules.iconCandidates(kind, chosenName)) {
                const candidatePath = Paths.resolveIconPath(candidate);
                if (!candidatePath || (svgContents[candidatePath] === "" && candidatePath.toLowerCase().endsWith(".svg")))
                    continue;

                resolvedPath = candidatePath;
                break;
            }
        }
        const baseSvg = kind === "repository" || badgePaths.length ? svgFor(resolvedPath) : "";
        const readyPaths = [];
        const badgeSvgs = [];
        for (const badgePath of badgePaths) {
            const content = svgFor(badgePath);
            if (badgePath.endsWith(".svg") && !content)
                continue;

            readyPaths.push(badgePath);
            badgeSvgs.push(content);
        }
        if (resolvedPath.endsWith(".svg") && !baseSvg)
            resolvedPath = "";

        return IconRules.descriptor(kind, chosenName, resolvedPath, readyPaths, baseSvg, badgeSvgs);
    }

    svgReaderType: Component {
        FileView {
            preload: true
            printErrors: false
            onLoaded: root.completeSvg(path, text(), this)
            onLoadFailed: root.completeSvg(path, "", this)
        }

    }

    refreshTimer: Timer {
        interval: Config.iconRefreshDebounceMilliseconds
        repeat: false
        onTriggered: {
            root.revision++;
            root.iconsChanged();
        }
    }

}
