// IconImage.js - Embed a badge or base icon in a composed SVG: inline its drawing when it is an SVG, otherwise reference it.
.pragma library
// Rules: Pure SVG string building: no QML types, no logging, no I/O.

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
