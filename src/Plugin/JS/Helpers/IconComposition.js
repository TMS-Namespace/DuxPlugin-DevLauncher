// IconComposition.js - Place IDE badges, the Git marker, and the remote marker on an icon's corners as one SVG from prebuilt pieces.
.pragma library
.import "BadgeAppearanceRules.js" as BadgeAppearanceRules
.import "Config.js" as Config
.import "IconImage.js" as IconImage
// Rules: Pure SVG composition: no QML types, no logging, no I/O. A composition only reads pieces built ahead of time, and never builds one.

// Stand-in base icons for the two brightnesses. A badge surface or marker depends only on whether the base is light, so a piece
// built against a stand-in is the same piece that a real base of that brightness would give.
var lightStandIn =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#ffffff"/></svg>';
var darkStandIn =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#000000"/></svg>';

// The four corners a badge or marker may take, in the order a marker prefers them.
function cornerSlots() {
    const inset = Config.sourceBadgeInset;
    const far = 64 - inset - Config.sourceBadgeSize;
    return [
        { left: far, top: far },
        { left: inset, top: inset },
        { left: inset, top: far },
        { left: far, top: inset }
    ];
}

// The corner of one IDE badge: the first two take the right corners, the rest the left ones, alternating top and bottom.
function badgeCorner(index, count, repository) {
    const inset = Config.sourceBadgeInset;
    const far = 64 - inset - Config.sourceBadgeSize;
    const top = count === 1 ? (repository ? inset : far) : index % 2 ? far : inset;
    return { left: index < 2 ? far : inset, top: top };
}

// The corner of the Git marker on a repository, or null when IDE badges take every corner.
function gitCorner(count) {
    const inset = Config.sourceBadgeInset;
    const far = 64 - inset - Config.sourceBadgeSize;
    if (count <= 1) return { left: far, top: far };
    if (count < Config.maxSourceBadges) return { left: inset, top: count === 2 ? inset : far };
    return null;
}

// The first corner that no badge or marker takes, or null when all four are taken.
function remoteCorner(taken) {
    return (
        cornerSlots().find(function (corner) {
            return !taken.some(function (used) {
                return used.left === corner.left && used.top === corner.top;
            });
        }) || null
    );
}

// The key of one piece: an IDE badge depends on its file, its corner, and the base's brightness; a marker on the last two.
function badgeKey(light, corner, path) {
    return ["badge", light, corner.left, corner.top, path].join("|");
}
function markerKey(kind, light, corner) {
    return [kind, light, corner.left, corner.top].join("|");
}

// Build one IDE badge piece: its surface, then its image inside it.
function badgePiece(standIn, corner, path, content) {
    const size = Config.sourceBadgeSize;
    const padding = Config.sourceBadgePadding;
    return (
        BadgeAppearanceRules.surfaceAt(standIn, corner.left, corner.top, size) +
        IconImage.imageElement(path, content, corner.left + padding, corner.top + padding, size - padding * 2)
    );
}

// Build the pieces of one IDE badge file for every corner and both brightnesses, once its SVG content is known.
function prepareBadge(pieces, path, content) {
    for (const light of [true, false])
        for (const corner of cornerSlots())
            pieces.values[badgeKey(light, corner, path)] = badgePiece(
                light ? lightStandIn : darkStandIn,
                corner,
                path,
                content
            );
}

// Forget the pieces of a badge file that no provider uses any more.
function dropBadge(pieces, path) {
    for (const key of Object.keys(pieces.values)) if (key.endsWith("|" + path)) delete pieces.values[key];
}

// Build the Git and remote marker pieces for every corner and both brightnesses. They do not depend on any IDE, so they are built once.
function prepareMarkers(pieces) {
    const size = Config.sourceBadgeSize;
    for (const light of [true, false]) {
        const standIn = light ? lightStandIn : darkStandIn;
        for (const corner of cornerSlots()) {
            pieces.values[markerKey("git", light, corner)] = BadgeAppearanceRules.gitMarkerAt(
                standIn,
                corner.left,
                corner.top,
                size
            );
            pieces.values[markerKey("remote", light, corner)] = BadgeAppearanceRules.remoteMarkerAt(
                standIn,
                corner.left,
                corner.top,
                size
            );
        }
    }
}

// Place IDE badges in corners, the Git badge in the next free corner, and the remote marker in the next free corner after that.
// Returns the SVG and whether every piece was ready; an incomplete icon is still drawn, but the caller must not remember it.
function composite(basePath, badgePaths, baseSvg, repository, remote, pieces) {
    const paths = Array.isArray(badgePaths) ? badgePaths : badgePaths ? [badgePaths] : [];
    const store = pieces || { values: {} };
    const light = BadgeAppearanceRules.lightBase(baseSvg);
    const taken = [];
    let complete = true;
    let badges = "";
    for (let index = 0; index < paths.length && index < Config.maxSourceBadges; index++) {
        const corner = badgeCorner(index, paths.length, repository);
        taken.push(corner);
        const piece = store.values[badgeKey(light, corner, paths[index])];
        if (piece === undefined) complete = false;
        else badges += piece;
    }
    let marker = "";
    const git = repository ? gitCorner(paths.length) : null;
    if (git) {
        taken.push(git);
        const piece = store.values[markerKey("git", light, git)];
        if (piece === undefined) complete = false;
        else marker += piece;
    }
    const remoteSlot = remote ? remoteCorner(taken) : null;
    if (remoteSlot) {
        const piece = store.values[markerKey("remote", light, remoteSlot)];
        if (piece === undefined) complete = false;
        else marker += piece;
    }
    const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="64" viewBox="0 0 64 64">' +
        IconImage.imageElement(basePath, baseSvg, 0, 0, 64) +
        badges +
        marker +
        "</svg>";
    return { icon: "svg:data:image/svg+xml," + encodeURIComponent(svg), complete: complete };
}
