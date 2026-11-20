// IconRules.js - Choose launcher icon descriptors from Dux file metadata.
.pragma library
.import "IconComposition.js" as IconComposition
// Rules: Pure icon descriptor choice: no QML types, no logging, no I/O; the SVG composition lives in IconComposition.js.

// Prefer the file service's icon, then choose a themed fallback for each item kind.
function iconCandidates(kind, iconName) {
    const candidates = iconName ? [iconName] : [];
    if (kind === "repository" || kind === "folder") candidates.push("folder");
    else if (kind === "workspace") candidates.push("text-x-generic", "folder");
    else candidates.push("text-x-generic", "application-octet-stream");
    return candidates.filter(function (name, index) {
        return candidates.indexOf(name) === index;
    });
}

// Choose the icon descriptor for one launcher item: a composed SVG when badges or markers apply, otherwise the plain icon.
function descriptor(kind, iconName, resolvedIconPath, badgeIconPath, baseSvg, remote, pieces) {
    const hasBadges = Array.isArray(badgeIconPath) ? badgeIconPath.length > 0 : !!badgeIconPath;
    const remoteItem = remote === true;
    // Use a themed folder with a branch badge for repositories.
    if (kind === "repository") {
        if (resolvedIconPath) return composed(resolvedIconPath, badgeIconPath, baseSvg, true, remoteItem, pieces);
        return { icon: "material:account_tree", iconType: "material", complete: true };
    }
    if ((hasBadges || remoteItem) && resolvedIconPath)
        return composed(resolvedIconPath, badgeIconPath, baseSvg, false, remoteItem, pieces);
    if (iconName) return { icon: iconName, iconType: "image", complete: true };
    if (kind === "folder") return { icon: "folder", iconType: "image", complete: true };
    if (kind === "workspace") return { icon: "material:workspaces", iconType: "material", complete: true };
    return { icon: "material:description", iconType: "material", complete: true };
}

// Compose an icon with its badges and markers, keeping whether every prebuilt piece it needed was ready.
function composed(resolvedIconPath, badgeIconPath, baseSvg, repository, remote, pieces) {
    const result = IconComposition.composite(resolvedIconPath, badgeIconPath, baseSvg, repository, remote, pieces);
    return { icon: result.icon, iconType: "image", complete: result.complete };
}
