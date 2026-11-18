// RunAll.js - Exercise pure rules and real offscreen QML entry points.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// Run one check and preserve its diagnostic output.
function run(command, argumentsList, options = {}) {
    const result = spawnSync(command, argumentsList, { encoding: "utf8", stdio: "inherit", ...options });
    if (result.status !== 0) throw new Error(command + " failed: " + String(result.error || result.status));
}

// Run one Quickshell harness and fail on its pass marker, any diagnostic, or a non-zero exit.
function runShell(shellFile, environment, timeout, passMarker, label) {
    const result = spawnSync("quickshell", ["-p", shellFile], { cwd: path.resolve(__dirname, ".."), env: environment, encoding: "utf8", timeout: timeout });
    const output = (result.stdout || "") + (result.stderr || "");
    for (const line of output.split("\n")) if (/T:|WARN|Error|Failed|qml:/.test(line)) console.log(line);
    const diagnostics = output.split("\n").filter(line => /WARN|Failed|T:FAIL|T:ERROR/.test(line) && !line.includes(passMarker) && !line.includes("quickshell.ipc: Failed to start IPC server"));
    if (result.status !== 0 || !output.includes(passMarker) || diagnostics.length)
        throw new Error(label + " failed: " + output);
}

// Replace IDE tools with local deterministic scripts while Quickshell owns Process.
function runQml() {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dev-launcher-"));
    try {
        const runtime = path.join(fixture, "runtime");
        const bin = path.join(fixture, "bin");
        const project = path.join(fixture, "sample");
        const secondProject = path.join(fixture, "other-root", "second-sample");
        const recentFile = path.join(fixture, "example.js");
        const dataFolder = path.join(fixture, "Code");
        const secondDataFolder = path.join(fixture, "Code2");
        const launchFile = path.join(fixture, "launch-arguments.txt");
        const systemLaunchFile = path.join(fixture, "system-launch.txt");
        fs.mkdirSync(runtime, { mode: 0o700 });
        fs.mkdirSync(bin);
        fs.mkdirSync(path.join(fixture, "icons"));
        for (const [iconName, color] of [["folder-special", "#2277bb"], ["text-x-javascript", "#ddaa11"], ["text-x-yaml", "#cc4477"], ["text-x-generic", "#666688"], ["vscode", "#1188dd"], ["folder", "#2277bb"]])
            fs.writeFileSync(path.join(fixture, "icons", iconName + ".svg"), '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="' + color + '"/></svg>');
        fs.mkdirSync(path.join(project, ".git"), { recursive: true });
        fs.mkdirSync(path.join(secondProject, ".git"), { recursive: true });
        fs.mkdirSync(path.join(fixture, "unreadable"), { mode: 0o000 });
        fs.mkdirSync(path.join(fixture, "private-stat"), { mode: 0o000 });
        // A folder with exactly the repository cap lets the regression harness prove that the next folder is reported.
        for (let index = 0; index < 500; index++) fs.mkdirSync(path.join(fixture, "many-root", "repo-" + index, ".git"), { recursive: true });
        fs.writeFileSync(recentFile, "export const fixture = true;\n");
        // Injected launcher items must exist, because a stat refresh drops the items whose files are missing.
        for (const name of ["second-example.js","icon-fixture-one.yaml","icon-fixture-two.yaml","history-capped.js","history-expired.js","sort-older.js","sort-newer.js","workspace.code-workspace"]) fs.writeFileSync(path.join(fixture, name), "fixture\n");
        fs.mkdirSync(path.join(dataFolder, "User", "globalStorage"), { recursive: true });
        fs.mkdirSync(path.join(secondDataFolder, "User", "globalStorage"), { recursive: true });
        fs.mkdirSync(path.join(fixture, "UnreadableHistory", "User", "globalStorage"), { recursive: true });
        fs.writeFileSync(path.join(fixture, "UnreadableHistory", "User", "globalStorage", "state.vscdb"), "unreadable", { mode: 0o000 });
        const code = path.join(bin, "code");
        const otherCode = path.join(bin, "othercode");
        const codeInsiders = path.join(bin, "code-insiders");
        const systemOpen = path.join(bin, "xdg-open");
        const find = path.join(bin, "find");
        run("python3", ["-c", "import sqlite3,sys,json; database=sqlite3.connect(sys.argv[1]); database.execute('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)'); database.execute('INSERT INTO ItemTable VALUES (?, ?)', ('history.recentlyOpenedPathsList', json.dumps({'entries':[{'folderUri':sys.argv[2]},{'fileUri':sys.argv[3]}]}))); database.commit()", path.join(dataFolder, "User", "globalStorage", "state.vscdb"), "file://" + project, "file://" + recentFile]);
        // A history database under a path with an apostrophe checks that the SQLite path quoting keeps the read working.
        fs.mkdirSync(path.join(fixture, "it's"), { recursive: true });
        run("python3", ["-c", "import sqlite3,sys,json; database=sqlite3.connect(sys.argv[1]); database.execute('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)'); database.execute('INSERT INTO ItemTable VALUES (?, ?)', ('history.recentlyOpenedPathsList', json.dumps({'entries':[{'folderUri':'file:///apostrophe-marker'}]}))); database.commit()", path.join(fixture, "it's", "state.vscdb")]);
        run("python3", ["-c", "import sqlite3,sys,json; database=sqlite3.connect(sys.argv[1]); database.execute('CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)'); database.execute('INSERT INTO ItemTable VALUES (?, ?)', ('history.recentlyOpenedPathsList', json.dumps({'entries':[{'folderUri':sys.argv[2]}]}))); database.commit()", path.join(secondDataFolder, "User", "globalStorage", "state.vscdb"), "file://" + secondProject]);
        fs.writeFileSync(code, '#!/bin/sh\nfor argument do\n  if [ "$argument" = "--bad-switch" ]; then printf "Warning: bogus-switch is not in the list of known options\\n" >&2; fi\n  if [ "$argument" = "--version" ]; then printf "1.99.0\\n"; exit 0; fi\ndone\nprintf "%s\\n" "$@" > "$DEV_LAUNCHER_LAUNCH_FILE"\n', { mode: 0o755 });
        fs.writeFileSync(otherCode, '#!/bin/sh\nprintf "1.99.0\\n"\n', { mode: 0o755 });
        fs.writeFileSync(codeInsiders, '#!/bin/sh\nfor argument do\n  if [ "$argument" = "--bad-switch" ]; then printf "Warning: bogus-switch is not in the list of known options\\n" >&2; fi\ndone\nprintf "1.99.0\\n"\n', { mode: 0o755 });
        fs.writeFileSync(systemOpen, '#!/bin/sh\nprintf "%s\\n" "$@" >> "$DEV_LAUNCHER_SYSTEM_LAUNCH_FILE"\n', { mode: 0o755 });
        fs.writeFileSync(find, '#!/bin/sh\ncase "$1" in */blocked-root) printf "find: %s: Permission denied\\n" "$1" >&2; exit 1;; esac\nexec /usr/bin/find "$@"\n', { mode: 0o755 });
        const unicodeRoot = path.join(fixture, "Unicode 日本語 العربية 😀 '\"$`\\\n\t ");
        fs.mkdirSync(unicodeRoot);
        fs.copyFileSync(code, path.join(unicodeRoot, "code"));
        fs.chmodSync(path.join(unicodeRoot, "code"), 0o755);
        fs.copyFileSync(path.join(fixture, "it's", "state.vscdb"), path.join(unicodeRoot, "state.vscdb"));
        fs.writeFileSync(path.join(unicodeRoot, "file\nname\t "), "fixture");
        const environment = { ...process.env, DEV_LAUNCHER_UNICODE_ROOT: unicodeRoot, QT_QPA_PLATFORM: "offscreen", XDG_RUNTIME_DIR: runtime, XDG_CACHE_HOME: path.join(fixture, "cache"), XDG_DATA_HOME: path.join(fixture, "data"), DEV_LAUNCHER_FIXTURE: fixture, DEV_LAUNCHER_CODE_PATH: code, DEV_LAUNCHER_CODE_INSIDERS_PATH: codeInsiders, DEV_LAUNCHER_PLUGIN_ROOT: path.resolve(__dirname, ".."), DEV_LAUNCHER_LAUNCH_FILE: launchFile, DEV_LAUNCHER_SYSTEM_LAUNCH_FILE: systemLaunchFile, PATH: bin + ":" + process.env.PATH, NO_COLOR: "1" };
        for (const name of ["DISPLAY", "WAYLAND_DISPLAY", "QT_QPA_PLATFORMTHEME", "QT_QPA_PLATFORMTHEME_QT6"]) delete environment[name];
        runShell("tests/Helpers/Harness/shell.qml", environment, 12000, "T:PASS QML entry points", "QML integration");
        runShell("tests/Helpers/Harness/regression.qml", environment, 12000, "T:PASS regression fixes", "QML regression checks");
        const actual = fs.readFileSync(launchFile, "utf8").trimEnd().split("\n");
        const expected = ["--reuse-window", "--profile", "Work", project];
        if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error("Provider launch arguments differ: " + JSON.stringify(actual));
        const systemPaths = fs.readFileSync(systemLaunchFile, "utf8").trimEnd().split("\n");
        if (!systemPaths.includes(fixture) || !systemPaths.includes(project))
            throw new Error("System default did not open the selected item and its location: " + JSON.stringify(systemPaths));
    } finally {
        fs.rmSync(fixture, { recursive: true, force: true });
    }
}

// Read the user's VS Code database only when explicitly requested.
function runLive() {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dev-launcher-live-"));
    try {
        const runtime = path.join(fixture, "runtime");
        fs.mkdirSync(runtime, { mode: 0o700 });
        const unicodeRoot = path.join(fixture, "Unicode 日本語 العربية 😀 '\"$`\\\n\t ");
        fs.mkdirSync(unicodeRoot);
        fs.copyFileSync(code, path.join(unicodeRoot, "code"));
        fs.chmodSync(path.join(unicodeRoot, "code"), 0o755);
        fs.copyFileSync(path.join(fixture, "it's", "state.vscdb"), path.join(unicodeRoot, "state.vscdb"));
        fs.writeFileSync(path.join(unicodeRoot, "file\nname\t "), "fixture");
        const environment = { ...process.env, DEV_LAUNCHER_UNICODE_ROOT: unicodeRoot, QT_QPA_PLATFORM: "offscreen", XDG_RUNTIME_DIR: runtime, XDG_DATA_HOME: path.join(fixture, "data"), DEV_LAUNCHER_PLUGIN_ROOT: path.resolve(__dirname, "..") };
        for (const name of ["DISPLAY", "WAYLAND_DISPLAY", "QT_QPA_PLATFORMTHEME", "QT_QPA_PLATFORMTHEME_QT6"]) delete environment[name];
        const result = spawnSync("quickshell", ["-p", "tests/Integration/Live/Providers/VSCode/HistoryDatabase.test.qml"], { cwd: path.resolve(__dirname, ".."), env: environment, encoding: "utf8", timeout: 8000 });
        const output = (result.stdout || "") + (result.stderr || "");
        for (const line of output.split("\n")) if (line.includes("T:")) console.log(line);
        if (result.status !== 0 || !output.includes("T:PASS live VS Code history") || output.includes("T:FAIL"))
            throw new Error("Live VS Code history check failed: " + output);
    } finally {
        fs.rmSync(fixture, { recursive: true, force: true });
    }
}

// Run each source-aligned pure rule test in its own process.
function testFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(function(entry) {
        const location = path.join(directory, entry.name);
        return entry.isDirectory() ? testFiles(location) : entry.name.endsWith(".test.js") ? [location] : [];
    });
}
for (const directory of ["Audits", "Unit"]) {
    for (const testFile of testFiles(path.join(__dirname, directory)).sort()) run("node", [testFile]);
}
runQml();
if (process.argv.includes("--live")) runLive();
console.log("All tests passed");
