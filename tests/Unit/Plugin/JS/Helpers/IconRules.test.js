// IconRules.test.js - Check system icons and repository and IDE badges.
// Rules: Runs in plain node; icon fallbacks, badge positions, and badge order must match the expected SVG composition.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const iconRules = source("Helpers/IconRules.js");
assert.deepEqual(Array.from(iconRules.iconCandidates("workspace", "missing-workspace-icon")), [
    "missing-workspace-icon",
    "text-x-generic",
    "folder"
]);
assert.match(iconRules.descriptor("repository", "folder", "/theme/folder.svg").icon, /^svg:data:image\/svg\+xml,/);
assert.equal(iconRules.descriptor("file", "text-x-javascript", "").icon, "text-x-javascript");
const sampleSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect fill="blue" width="48" height="48"/></svg>';
const composite = iconRules.descriptor(
    "file",
    "text-x-javascript",
    "/theme/text-x-javascript.svg",
    "/theme/vscode.svg",
    sampleSvg,
    sampleSvg
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
const repositoryComposite = iconRules.descriptor(
    "repository",
    "folder",
    "/theme/folder.svg",
    "/theme/vscode.svg",
    sampleSvg,
    sampleSvg
).icon;
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
    iconRules.descriptor("file", "text-x-generic", "/tmp/base.svg", badgePaths, sampleSvg, coloredBadges).icon
);
for (const color of ["red", "green", "yellow", "purple"]) assert.ok(multiple.includes('fill="' + color + '"'));
assert.ok(!multiple.includes('fill="orange"'));
for (const position of ['x="2" y="2"', 'x="34" y="2"', 'x="2" y="34"', 'x="34" y="34"'])
    assert.ok(multiple.includes(position));
// Adjacent surfaces stay separate in both directions.
assert.equal(34 - (2 + 28), 4);
assert.match(multiple, /width="28" height="28" rx="6"[^>]*fill-opacity="0\.6"/);
const multipleRepository = decodeURIComponent(
    iconRules.descriptor("repository", "folder", "/tmp/base.svg", badgePaths.slice(0, 4), sampleSvg, coloredBadges).icon
);
assert.ok(!multipleRepository.includes('d="M42 44v11'));

// Badge order stays on the right first, followed by the left, for every badge count.
const expectedPositions = ["35 3", "35 35", "3 3", "3 35"];
for (let count = 2; count <= 4; count++) {
    const rendered = decodeURIComponent(
        iconRules.descriptor(
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
        iconRules.descriptor(
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
