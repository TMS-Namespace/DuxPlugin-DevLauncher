// IconRules.test.js - Check system icons and repository and IDE badges.
// Rules: Runs in plain node; icon fallbacks, badge positions, and badge order must match the expected SVG composition.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const iconRules = source("Helpers/IconRules.js");
const memoModule = source("Helpers/IconMemo.js");
const composition = source("Helpers/IconComposition.js");

// Build the pieces the icon service builds ahead of time: the markers once, and each badge file for its content.
function piecesFor(badgePaths, contents) {
    const pieces = { values: {} };
    composition.prepareMarkers(pieces);
    badgePaths.forEach((path, index) => composition.prepareBadge(pieces, path, contents[index] || ""));
    return pieces;
}
// Render one item through the descriptor, with its badges' pieces prepared first.
function render(kind, iconName, resolvedPath, badgePaths, baseSvg, contents, remote) {
    return iconRules.descriptor(
        kind,
        iconName,
        resolvedPath,
        badgePaths,
        baseSvg,
        remote === true,
        piecesFor(badgePaths, contents)
    );
}
assert.deepEqual(Array.from(iconRules.iconCandidates("workspace", "missing-workspace-icon")), [
    "missing-workspace-icon",
    "text-x-generic",
    "folder"
]);
assert.match(iconRules.descriptor("repository", "folder", "/theme/folder.svg").icon, /^svg:data:image\/svg\+xml,/);
assert.equal(iconRules.descriptor("file", "text-x-javascript", "").icon, "text-x-javascript");
const sampleSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect fill="blue" width="48" height="48"/></svg>';
const composite = render(
    "file",
    "text-x-javascript",
    "/theme/text-x-javascript.svg",
    ["/theme/vscode.svg"],
    sampleSvg,
    [sampleSvg]
).icon;
assert.match(
    decodeURIComponent(composite),
    /<g transform="translate\(35 35\) scale\(0\.5416666666666666 0\.5416666666666666\)/
);
assert.match(
    decodeURIComponent(composite),
    /<g transform="translate\(0 0\) scale\(1\.3333333333333333 1\.3333333333333333\)/
);
assert.equal(decodeURIComponent(composite).includes("<circle"), false);
assert.match(decodeURIComponent(composite), /<rect x="34" y="34" width="28" height="28" rx="6"/);
const repositoryComposite = render("repository", "folder", "/theme/folder.svg", ["/theme/vscode.svg"], sampleSvg, [
    sampleSvg
]).icon;
assert.match(repositoryComposite, /^svg:data:image\/svg\+xml,/);
assert.match(decodeURIComponent(repositoryComposite), /<rect x="34" y="2" width="28" height="28" rx="6"/);
assert.match(decodeURIComponent(repositoryComposite), /<path d="M42 44v11/);
const badgeAppearance = source("Helpers/BadgeAppearanceRules.js");
assert.equal(badgeAppearance.lightBase('<svg><rect fill="#ffffff"/></svg>'), true);
assert.equal(badgeAppearance.lightBase('<svg><rect fill="#121212"/></svg>'), false);
assert.match(badgeAppearance.surface('<svg><rect fill="#ffffff"/></svg>', false), /fill="#111820"/);
assert.match(badgeAppearance.surface('<svg><rect fill="#121212"/></svg>', false), /fill="#ffffff"/);
assert.equal(badgeAppearance.surface('<svg><rect fill="#121212"/></svg>', false).includes("stroke="), false);
const executableIcons = source("Helpers/ExecutableIconRules.js");
assert.equal(
    executableIcons.iconName("/usr/bin/code", [{ execString: "/usr/share/code/code %F", icon: "vscode" }]),
    "vscode"
);
assert.equal(
    executableIcons.iconName("/opt/other/code", [
        { execString: "/usr/share/code/code %F", icon: "vscode" },
        { execString: "/opt/other/code %F", icon: "otheride" }
    ]),
    "otheride"
);
assert.equal(iconRules.descriptor("file", "", "").iconType, "material");

// Four providers get four separately positioned badges; a fifth cannot overflow the icon.
const coloredBadges = ["red", "green", "yellow", "purple", "orange"].map(
    (color) => '<svg viewBox="0 0 64 64"><rect fill="' + color + '"/></svg>'
);
const badgePaths = coloredBadges.map((_, index) => "/tmp/badge" + index + ".svg");
const multiple = decodeURIComponent(
    render("file", "text-x-generic", "/tmp/base.svg", badgePaths, sampleSvg, coloredBadges).icon
);
for (const color of ["red", "green", "yellow", "purple"]) assert.ok(multiple.includes('fill="' + color + '"'));
assert.ok(!multiple.includes('fill="orange"'));
for (const position of ['x="2" y="2"', 'x="34" y="2"', 'x="2" y="34"', 'x="34" y="34"'])
    assert.ok(multiple.includes(position));
// Adjacent surfaces stay separate in both directions.
assert.equal(34 - (2 + 28), 4);
assert.match(multiple, /width="28" height="28" rx="6"[^>]*fill-opacity="0\.6"/);
const multipleRepository = decodeURIComponent(
    render("repository", "folder", "/tmp/base.svg", badgePaths.slice(0, 4), sampleSvg, coloredBadges).icon
);
assert.ok(!multipleRepository.includes('d="M42 44v11'));

// Badge order stays on the right first, followed by the left, for every badge count.
const expectedPositions = ["35 3", "35 35", "3 3", "3 35"];
for (let count = 2; count <= 4; count++) {
    const rendered = decodeURIComponent(
        render(
            "file",
            "text-x-generic",
            "/tmp/base.svg",
            badgePaths.slice(0, count),
            sampleSvg,
            coloredBadges.slice(0, count)
        ).icon
    );
    for (let index = 0; index < count; index++) {
        const escaped = expectedPositions[index].replace(" ", "\\s+");
        assert.match(
            rendered,
            new RegExp(
                'transform="translate\\(' +
                    escaped +
                    '\\)[^>]*><rect fill="' +
                    ["red", "green", "yellow", "purple"][index] +
                    '"'
            )
        );
    }
}

// A repository's Git badge occupies the next free corner at the same size as its IDE badges.
for (const [count, position] of [
    [2, "2 2"],
    [3, "2 34"]
]) {
    const rendered = decodeURIComponent(
        render(
            "repository",
            "folder",
            "/tmp/base.svg",
            badgePaths.slice(0, count),
            sampleSvg,
            coloredBadges.slice(0, count)
        ).icon
    );
    assert.ok(
        rendered.includes('transform="translate(' + position + ') scale(0.9333333333333333) translate(-34 -34)"'),
        "Git marker must occupy the next corner at full badge size"
    );
    assert.ok(!rendered.includes("translate(7 7) scale(0.5)"), "Git marker must not overlap the icon center");
}
// Four IDE badges occupy all corners; a fifth marker cannot fit without overlapping.
assert.ok(!multipleRepository.includes("translate(-34 -34)"));

// A remote item without IDE badges still gets its base icon and the globe marker, so it reads differently from a local item.
const remoteAlone = decodeURIComponent(render("folder", "folder", "/tmp/base.svg", [], sampleSvg, [], true).icon);
assert.match(remoteAlone, /<ellipse cx="49.5"/);
assert.match(
    remoteAlone,
    /translate\(34 34\) scale/,
    "a lone remote marker takes the bottom-right corner when nothing else is there"
);
assert.equal(
    decodeURIComponent(render("folder", "folder", "/tmp/base.svg", [], sampleSvg, []).icon).includes("<ellipse"),
    false,
    "a local item gets no remote marker"
);

// A repository with one IDE badge keeps its Git marker in the bottom-right corner, and the remote marker takes the next free corner.
const remoteRepository = decodeURIComponent(
    render("repository", "folder", "/tmp/base.svg", ["/tmp/badge.svg"], sampleSvg, [sampleSvg], true).icon
);
assert.match(remoteRepository, /<ellipse cx="49.5"/);
assert.match(remoteRepository, /M42 44v11/, "the Git marker is still drawn");
assert.match(remoteRepository, /translate\(2 2\) scale/, "the remote marker avoids the badge and Git corners");

// The composed-icon memo keeps every recent key, and drops the oldest key once the limit is passed.
const memo = {};
const memoOrder = [];
for (let index = 0; index < 5; index++)
    memoModule.rememberBounded(memo, memoOrder, "key" + index, { icon: "icon" + index }, 3);
assert.deepEqual(Object.keys(memo).sort(), ["key2", "key3", "key4"], "only the newest three keys stay");
assert.equal(memoOrder.length, 3);
memoModule.rememberBounded(memo, memoOrder, "key4", { icon: "changed" }, 3);
assert.equal(memo.key4.icon, "changed", "a known key is replaced in place");
assert.equal(memoOrder.length, 3, "replacing a key does not grow the memo");

// Badge pieces are built ahead of time, so a composition only reads them: a piece that was never built leaves its badge out and marks the icon incomplete.
const readyPieces = piecesFor(["/tmp/badge.svg"], [sampleSvg]);
const readyIcon = iconRules.descriptor(
    "file",
    "text-x-generic",
    "/tmp/base.svg",
    ["/tmp/badge.svg"],
    sampleSvg,
    false,
    readyPieces
);
assert.equal(readyIcon.complete, true, "an icon whose pieces were built is complete");
assert.equal(
    readyIcon.icon,
    render("file", "text-x-generic", "/tmp/base.svg", ["/tmp/badge.svg"], sampleSvg, [sampleSvg]).icon
);
const missingIcon = iconRules.descriptor(
    "file",
    "text-x-generic",
    "/tmp/base.svg",
    ["/tmp/unbuilt.svg"],
    sampleSvg,
    false,
    { values: {} }
);
assert.equal(missingIcon.complete, false, "a missing piece makes the icon incomplete, so it is not remembered");
assert.equal(decodeURIComponent(missingIcon.icon).includes("<rect"), true, "the base icon is still drawn");
assert.equal(
    decodeURIComponent(missingIcon.icon).includes('href="/tmp/unbuilt.svg"'),
    false,
    "the unbuilt badge is left out, not built on demand"
);
// Removing a badge's pieces leaves the other badges and the markers in place.
composition.dropBadge(readyPieces, "/tmp/badge.svg");
assert.equal(
    Object.keys(readyPieces.values).some((key) => key.endsWith("|/tmp/badge.svg")),
    false
);
assert.ok(
    Object.keys(readyPieces.values).some((key) => key.startsWith("git|")),
    "the markers stay after a badge is dropped"
);
