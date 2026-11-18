// TestStructure.test.js - Keep pure and QML checks beside their source responsibilities.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const unitRoot = path.join(root, "tests/Unit/JS");

// Every pure-rule test names the production module whose behavior it checks.
function checkUnitDirectory(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const location = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            checkUnitDirectory(location);
            continue;
        }
        assert.ok(entry.name.endsWith(".test.js"), location + " must use the .test.js suffix");
        const relative = path.relative(unitRoot, location).replace(/\.test\.js$/, ".js");
        assert.ok(fs.existsSync(path.join(root, "src/JS", relative)), relative + " has no matching source module");
    }
}
checkUnitDirectory(unitRoot);

// Integration checks keep the settings, launcher, provider, and worker flows in separate files.
const qmlPairs = [
    ["SettingsPage.test.qml", "Settings.qml"],
    ["Launcher.test.qml", "Launcher.qml"],
    ["LauncherLaunch.test.qml", "Launcher.qml"],
    ["Views/IdeSettings.test.qml", "Views/IdeSettings.qml"],
    ["Helpers/SettingsController.test.qml", "Helpers/SettingsController.qml"],
    ["Services/ScanOrchestrator.test.qml", "Services/ScanOrchestrator.qml"],
    ["Services/ResultItemIcon.test.qml", "Services/ResultItemIcon.qml"],
    ["Providers/LocalGit/LocalGitRecents.test.qml", "Providers/LocalGit/LocalGitRecents.qml"]
];
for (const [testPath, sourcePath] of qmlPairs) {
    assert.ok(fs.existsSync(path.join(root, "tests/Integration/QML", testPath)), testPath + " is missing");
    assert.ok(fs.existsSync(path.join(root, "src/QML", sourcePath)), sourcePath + " is missing");
}
// Require each QML suite in this directory to be registered by one of the harnesses.
function checkIntegrationDirectory(directory) {
    const harnesses = ["shell.qml", "regression.qml"].map(name => fs.readFileSync(path.join(root, "tests/Helpers/Harness", name), "utf8"));
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const location = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            checkIntegrationDirectory(location);
            continue;
        }
        assert.ok(entry.name.endsWith(".test.qml"), location + " must use the .test.qml suffix");
        const relative = path.relative(path.join(root, "tests/Integration/QML"), location).split(path.sep).join("/");
        assert.ok(harnesses.some(harness => harness.includes('"' + relative + '"')), relative + " is not run by a harness");
    }
}
checkIntegrationDirectory(path.join(root, "tests/Integration/QML"));
assert.ok(fs.existsSync(path.join(root, "tests/Integration/Live/Providers/VSCode/HistoryDatabase.test.qml")));

// The two harness entry points provide fixtures and sequencing, not the bulk of assertions.
for (const [name, ceiling] of [["shell.qml", 200], ["regression.qml", 150]]) {
    const count = fs.readFileSync(path.join(root, "tests/Helpers/Harness", name), "utf8").split("\n").length;
    assert.ok(count <= ceiling, name + " has grown into a monolithic test again");
}
