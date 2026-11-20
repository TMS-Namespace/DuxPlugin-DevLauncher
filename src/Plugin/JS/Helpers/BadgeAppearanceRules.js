// BadgeAppearanceRules.js - Choose contrasting rounded badge surfaces from SVG icon colors.
.pragma library
.import "Constants.js" as Constants
// Rules: Pure SVG string building: no QML types, no logging, no I/O.

// Design note for the badge colours below (#111820 and #ffffff). They are hard-coded on purpose, and Theme colours
// are not used. A badge must stand out from the file or folder icon it is drawn over, and theme colours could match
// that icon. Each badge is therefore drawn in two variants ahead of time, one for a light base and one for a dark base,
// and both are cached. At display time the variant is chosen from the brightness of the base icon, so no colour is
// computed per result, which keeps drawing fast.

// Estimate the base icon's brightness from its first explicit hexadecimal fill.
function lightBase(svgText) {
    const match = String(svgText || "").match(/(?:fill\s*=\s*["']|fill\s*:\s*)(#[0-9a-f]{3}(?:[0-9a-f]{3})?)/i);
    if (!match) return true;
    const digits = match[1].slice(1);
    const hex =
        digits.length === 3
            ? digits
                  .split("")
                  .map(function (digit) {
                      return digit + digit;
                  })
                  .join("")
            : digits;
    const channels = [0, 2, 4].map(function (offset) {
        return parseInt(hex.slice(offset, offset + 2), 16) / 255;
    });
    const linear = channels.map(function (channel) {
        return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722 >= 0.42;
}

// Draw a contrasting rounded square at a requested badge position.
function surfaceAt(svgText, x, y, size) {
    // Hard-coded colour pair: see the design note above lightBase.
    const fill = lightBase(svgText) ? "#111820" : "#ffffff";
    return (
        '<rect x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        size +
        '" height="' +
        size +
        '" rx="6" fill="' +
        fill +
        '" fill-opacity="' +
        Constants.sourceBadgeOpacity +
        '"/>'
    );
}

// Draw a square that contrasts with the icon beneath the badge.
function surface(svgText, top) {
    return surfaceAt(svgText, 34, top ? 0 : 34, 30);
}

// Keep the Git marker inside the same square treatment as IDE badges.
function gitMarker(svgText) {
    // Hard-coded colour pair: see the design note above lightBase.
    const color = lightBase(svgText) ? "#ffffff" : "#111820";
    return (
        surface(svgText, false) +
        '<g transform="translate(49.5 49.5) scale(1.2) translate(-49.5 -49.5)" fill="none" stroke="' +
        color +
        '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M42 44v11m0-4c0-3 2-4 5-4h8"/>' +
        '<rect x="39" y="39" width="6" height="6" rx="1" fill="' +
        color +
        '" stroke="none"/>' +
        '<rect x="39" y="54" width="6" height="6" rx="1" fill="' +
        color +
        '" stroke="none"/>' +
        '<rect x="52" y="43" width="6" height="6" rx="1" fill="' +
        color +
        '" stroke="none"/>' +
        "</g>"
    );
}

// Place the Git marker in the same sized corner surface as the other badges.
function gitMarkerAt(svgText, x, y, size) {
    const scale = size / 30;
    return (
        '<g transform="translate(' +
        x +
        " " +
        y +
        ") scale(" +
        scale +
        ') translate(-34 -34)">' +
        gitMarker(svgText) +
        "</g>"
    );
}

// Draw the remote marker, a small globe, on the same surface treatment as the Git marker.
function remoteMarker(svgText) {
    // Hard-coded colour pair: see the design note above lightBase.
    const color = lightBase(svgText) ? "#ffffff" : "#111820";
    return (
        surface(svgText, false) +
        '<g transform="translate(49.5 49.5) scale(1.2) translate(-49.5 -49.5)" fill="none" stroke="' +
        color +
        '" stroke-width="2" stroke-linecap="round">' +
        '<circle cx="49.5" cy="49.5" r="8"/>' +
        '<ellipse cx="49.5" cy="49.5" rx="3.5" ry="8"/>' +
        '<path d="M41.5 49.5h16"/>' +
        "</g>"
    );
}

// Place the remote marker in a corner surface sized like the other badges.
function remoteMarkerAt(svgText, x, y, size) {
    const scale = size / 30;
    return (
        '<g transform="translate(' +
        x +
        " " +
        y +
        ") scale(" +
        scale +
        ') translate(-34 -34)">' +
        remoteMarker(svgText) +
        "</g>"
    );
}
