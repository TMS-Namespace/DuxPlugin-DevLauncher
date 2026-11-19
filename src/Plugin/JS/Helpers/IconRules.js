// IconRules.js - Choose launcher icon descriptors from Dux file metadata.
.pragma library
.import "BadgeAppearanceRules.js" as BadgeAppearanceRules
.import "Config.js" as Config
// Rules: Pure icon descriptor and SVG composition: no QML types, no logging, no I/O.

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

// Encode a system icon path as an SVG image source without allowing SVG markup injection.
function imageSource(path) {
    return String(path || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// Flatten SVG icon markup because Qt's SVG Tiny renderer rejects nested SVG elements.
function imageElement(path, svgText, x, y, size) {
    if (svgText) {
        const opening = svgText.match(/<svg\b([^>]*)>/i);
        const closing = svgText.lastIndexOf("</svg>");
        if (opening && closing > opening.index) {
            const viewBox = opening[1].match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
            const dimensions = viewBox
                ? viewBox[1]
                      .trim()
                      .split(/[\s,]+/)
                      .map(Number)
                : [];
            const width = dimensions[2] > 0 ? dimensions[2] : 64;
            const height = dimensions[3] > 0 ? dimensions[3] : 64;
            const left = Number.isFinite(dimensions[0]) ? dimensions[0] : 0;
            const top = Number.isFinite(dimensions[1]) ? dimensions[1] : 0;
            const attributes = opening[1].replace(
                /\s(?:xmlns(?::\w+)?|viewBox|x|y|width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gi,
                ""
            );
            const transform =
                "translate(" +
                x +
                " " +
                y +
                ") scale(" +
                size / width +
                " " +
                size / height +
                ") translate(" +
                -left +
                " " +
                -top +
                ")";
            return (
                '<g transform="' +
                transform +
                '"' +
                attributes +
                ">" +
                svgText.slice(opening.index + opening[0].length, closing) +
                "</g>"
            );
        }
    }
    return (
        '<image href="' +
        imageSource(path) +
        '" x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        size +
        '" height="' +
        size +
        '"/>'
    );
}

// Place IDE badges in corners, followed by the Git badge in the next free corner.
function composite(basePath, badgePaths, baseSvg, badgeSvgs, repository) {
    const paths = Array.isArray(badgePaths) ? badgePaths : badgePaths ? [badgePaths] : [];
    const texts = Array.isArray(badgeSvgs) ? badgeSvgs : badgeSvgs ? [badgeSvgs] : [];
    let badges = "";
    for (let index = 0; index < paths.length && index < Config.maxSourceBadges; index++) {
        const single = paths.length === 1;
        const badgeLeft = index < 2 ? 64 - Config.sourceBadgeInset - Config.sourceBadgeSize : Config.sourceBadgeInset;
        const badgeTop = single
            ? repository
                ? Config.sourceBadgeInset
                : 64 - Config.sourceBadgeInset - Config.sourceBadgeSize
            : index % 2
              ? 64 - Config.sourceBadgeInset - Config.sourceBadgeSize
              : Config.sourceBadgeInset;
        const size = Config.sourceBadgeSize;
        const padding = Config.sourceBadgePadding;
        badges +=
            BadgeAppearanceRules.surfaceAt(baseSvg, badgeLeft, badgeTop, size) +
            imageElement(paths[index], texts[index], badgeLeft + padding, badgeTop + padding, size - padding * 2);
    }
    let marker = "";
    if (repository) {
        if (paths.length <= 1)
            marker = BadgeAppearanceRules.gitMarkerAt(
                baseSvg,
                64 - Config.sourceBadgeInset - Config.sourceBadgeSize,
                64 - Config.sourceBadgeInset - Config.sourceBadgeSize,
                Config.sourceBadgeSize
            );
        else if (paths.length < Config.maxSourceBadges)
            marker = BadgeAppearanceRules.gitMarkerAt(
                baseSvg,
                Config.sourceBadgeInset,
                paths.length === 2 ? Config.sourceBadgeInset : 64 - Config.sourceBadgeInset - Config.sourceBadgeSize,
                Config.sourceBadgeSize
            );
    }
    const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="64" viewBox="0 0 64 64">' +
        imageElement(basePath, baseSvg, 0, 0, 64) +
        badges +
        marker +
        "</svg>";
    return "svg:data:image/svg+xml," + encodeURIComponent(svg);
}

// Use a themed folder with a branch badge for repositories.
function descriptor(kind, iconName, resolvedIconPath, badgeIconPath, baseSvg, badgeSvg) {
    const hasBadges = Array.isArray(badgeIconPath) ? badgeIconPath.length > 0 : !!badgeIconPath;
    if (kind === "repository") {
        if (resolvedIconPath)
            return { icon: composite(resolvedIconPath, badgeIconPath, baseSvg, badgeSvg, true), iconType: "image" };
        return { icon: "material:account_tree", iconType: "material" };
    }
    if (hasBadges && resolvedIconPath)
        return { icon: composite(resolvedIconPath, badgeIconPath, baseSvg, badgeSvg), iconType: "image" };
    if (iconName) return { icon: iconName, iconType: "image" };
    if (kind === "folder") return { icon: "folder", iconType: "image" };
    if (kind === "workspace") return { icon: "material:workspaces", iconType: "material" };
    return { icon: "material:description", iconType: "material" };
}
