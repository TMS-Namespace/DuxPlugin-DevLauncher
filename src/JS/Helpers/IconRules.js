// IconRules.js - Choose launcher icon descriptors from Dux file metadata.
.pragma library
.import "BadgeAppearanceRules.js" as BadgeAppearanceRules

// Prefer the file service's icon, then choose a themed fallback for each item kind.
function iconCandidates(kind, iconName) {
    const candidates = iconName ? [iconName] : [];
    if (kind === "repository" || kind === "folder") candidates.push("folder");
    else if (kind === "workspace") candidates.push("text-x-generic", "folder");
    else candidates.push("text-x-generic", "application-octet-stream");
    return candidates.filter(function(name, index) { return candidates.indexOf(name) === index; });
}

// Encode a system icon path as an SVG image source without allowing SVG markup injection.
function imageSource(path) {
    return String(path || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Flatten SVG icon markup because Qt's SVG Tiny renderer rejects nested SVG elements.
function imageElement(path, svgText, x, y, size) {
    if (svgText) {
        const opening = svgText.match(/<svg\b([^>]*)>/i);
        const closing = svgText.lastIndexOf("</svg>");
        if (opening && closing > opening.index) {
            const viewBox = opening[1].match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
            const dimensions = viewBox ? viewBox[1].trim().split(/[\s,]+/).map(Number) : [];
            const width = dimensions[2] > 0 ? dimensions[2] : 64;
            const height = dimensions[3] > 0 ? dimensions[3] : 64;
            const left = Number.isFinite(dimensions[0]) ? dimensions[0] : 0;
            const top = Number.isFinite(dimensions[1]) ? dimensions[1] : 0;
            const attributes = opening[1].replace(/\s(?:xmlns(?::\w+)?|viewBox|x|y|width|height)\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
            const transform = 'translate(' + x + ' ' + y + ') scale(' + size / width + ' ' + size / height + ') translate(' + -left + ' ' + -top + ')';
            return '<g transform="' + transform + '"' + attributes + '>'
                + svgText.slice(opening.index + opening[0].length, closing) + '</g>';
        }
    }
    return '<image href="' + imageSource(path) + '" x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '"/>';
}

// Layer rounded IDE and Git badges over the base icon in Dux's SVG renderer.
function composite(basePath, badgePath, baseSvg, badgeSvg, repository) {
    const badgeAtTop = repository;
    const badgeY = badgeAtTop ? 2 : 36;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="64" viewBox="0 0 64 64">'
        + imageElement(basePath, baseSvg, 0, 0, 64)
        + (badgePath ? BadgeAppearanceRules.surface(baseSvg, badgeAtTop) + imageElement(badgePath, badgeSvg, 36, badgeY, 26) : "")
        + (repository ? BadgeAppearanceRules.gitMarker(baseSvg) : "")
        + '</svg>';
    return "svg:data:image/svg+xml," + encodeURIComponent(svg);
}

// Use a themed folder with a branch badge for repositories.
function descriptor(kind, iconName, resolvedIconPath, badgeIconPath, baseSvg, badgeSvg) {
    if (kind === "repository") {
        if (resolvedIconPath) return { icon: composite(resolvedIconPath, badgeIconPath, baseSvg, badgeSvg, true), iconType: "image" };
        return { icon: "material:account_tree", iconType: "material" };
    }
    if (badgeIconPath && resolvedIconPath)
        return { icon: composite(resolvedIconPath, badgeIconPath, baseSvg, badgeSvg), iconType: "image" };
    if (iconName) return { icon: iconName, iconType: "image" };
    if (kind === "folder") return { icon: "folder", iconType: "image" };
    if (kind === "workspace") return { icon: "material:workspaces", iconType: "material" };
    return { icon: "material:description", iconType: "material" };
}
