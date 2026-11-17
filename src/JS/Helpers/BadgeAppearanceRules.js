// BadgeAppearanceRules.js - Choose contrasting rounded badge surfaces from SVG icon colors.
.pragma library

// Estimate the base icon's brightness from its first explicit hexadecimal fill.
function lightBase(svgText) {
    const match = String(svgText || "").match(/(?:fill\s*=\s*["']|fill\s*:\s*)(#[0-9a-f]{3}(?:[0-9a-f]{3})?)/i);
    if (!match) return true;
    const digits = match[1].slice(1);
    const hex = digits.length === 3 ? digits.split("").map(function(digit) { return digit + digit; }).join("") : digits;
    const channels = [0, 2, 4].map(function(offset) { return parseInt(hex.slice(offset, offset + 2), 16) / 255; });
    const linear = channels.map(function(channel) { return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4); });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722 >= 0.42;
}

// Draw a translucent square that contrasts with the icon beneath the badge.
function surface(svgText, top) {
    const light = lightBase(svgText);
    const fill = light ? "#111820" : "#ffffff";
    const y = top ? 0 : 34;
    return '<rect x="34" y="' + y + '" width="30" height="30" rx="6" fill="' + fill + '" fill-opacity="0.86"/>';
}

// Keep the Git marker inside the same square treatment as IDE badges.
function gitMarker(svgText) {
    const color = lightBase(svgText) ? "#ffffff" : "#111820";
    return surface(svgText, false)
        + '<g fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M42 44v11m0-4c0-3 2-4 5-4h8"/>'
        + '<rect x="39" y="39" width="6" height="6" rx="1" fill="' + color + '" stroke="none"/>'
        + '<rect x="39" y="54" width="6" height="6" rx="1" fill="' + color + '" stroke="none"/>'
        + '<rect x="52" y="43" width="6" height="6" rx="1" fill="' + color + '" stroke="none"/>'
        + '</g>';
}
