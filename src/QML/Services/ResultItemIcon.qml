// ResultItemIcon.qml - Build launcher icon descriptors and cache executable icon assets.
pragma Singleton
pragma ComponentBehavior: Bound
import QtQuick
import QtQml
import Quickshell
import Quickshell.Io
import qs.DCommon.Common
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/IconRules.js" as IconRules
import "../../JS/Helpers/ExecutableIconRules.js" as ExecutableIconRules

QtObject {
    id: root
    property var executableIcons: ({})
    property var desktopLookup: ({ entryCount: -1 })
    property var svgContents: ({})
    property var pendingSvg: ({})
    property var svgQueue: []
    property int activeSvgReads: 0
    signal iconsChanged()

    property Component svgReaderType: Component {
        FileView {
            preload: true
            printErrors: false
            onLoaded: root.completeSvg(path, text(), this)
            onLoadFailed: root.completeSvg(path, "", this)
        }
    }

    // Queue each SVG only once and return its cached content when ready.
    function svgFor(iconPath) {
        if (!iconPath || !iconPath.toLowerCase().endsWith(".svg")) return "";
        if (svgContents[iconPath] !== undefined) return svgContents[iconPath];
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
            svgReaderType.createObject(root, { path: iconPath });
        }
    }

    // Keep SVG contents bounded and release the completed FileView.
    function completeSvg(iconPath, content, reader) {
        const updated = Object.assign({}, svgContents);
        const value = String(content || "");
        updated[iconPath] = value.length <= Config.maxSvgCharacters ? value : "";
        const paths = Object.keys(updated);
        for (const oldPath of paths.slice(0, Math.max(0, paths.length - Config.maxSvgEntries))) delete updated[oldPath];
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
        if (!executable) return "";
        const desktopEntries = DesktopEntries.applications.values;
        // Desktop entries load in batches, so a changed entry count invalidates every earlier answer, misses included.
        // The cache and the count are mutated in place, never reassigned, because this runs inside property bindings.
        if (desktopEntries.length !== desktopLookup.entryCount) {
            for (const cachedExecutable of Object.keys(executableIcons)) delete executableIcons[cachedExecutable];
            desktopLookup.entryCount = desktopEntries.length;
        }
        if (executableIcons[executable] !== undefined) return executableIcons[executable];
        const desktopIcon = ExecutableIconRules.iconName(executable, desktopEntries);
        const iconPath = desktopIcon ? Paths.resolveIconPath(desktopIcon) : "";
        // A found entry whose icon file is not resolved yet is retried; a missing entry is cached until the list changes.
        if (iconPath || !desktopIcon) executableIcons[executable] = iconPath;
        return iconPath;
    }

    // Return a result's themed icon with its source IDE and Git markers.
    function iconFor(item) {
        const path = item.path;
        const kind = item.kind;
        const source = item.sourceProvider ? ProvidersManager.handlerFor(item.sourceProvider) : null;
        // Only a launchable source badges its item with its executable; a folder source has none to show.
        const executable = source && source.launchable ? source.executable() : "";
        const iconName = FileMetadataService.iconNameFor(path, kind);
        const appearance = kind !== "file" && Host.appearance ? Host.appearance.lookup(path) : null;
        const chosenName = appearance && appearance.icon ? appearance.icon : iconName;
        let resolvedPath = "";
        if (kind === "repository" || executable) {
            for (const candidate of IconRules.iconCandidates(kind, chosenName)) {
                const candidatePath = Paths.resolveIconPath(candidate);
                if (!candidatePath || (svgContents[candidatePath] === "" && candidatePath.toLowerCase().endsWith(".svg"))) continue;
                resolvedPath = candidatePath;
                break;
            }
        }
        let badgePath = executableIconPath(executable);
        const baseSvg = kind === "repository" || badgePath ? svgFor(resolvedPath) : "";
        const badgeSvg = badgePath ? svgFor(badgePath) : "";
        if (resolvedPath.endsWith(".svg") && !baseSvg) resolvedPath = "";
        if (badgePath.endsWith(".svg") && !badgeSvg) badgePath = "";
        return IconRules.descriptor(kind, chosenName, resolvedPath, badgePath, baseSvg, badgeSvg);
    }

    property Timer refreshTimer: Timer { interval: Config.iconRefreshDebounceMilliseconds; repeat: false; onTriggered: root.iconsChanged() }
}
