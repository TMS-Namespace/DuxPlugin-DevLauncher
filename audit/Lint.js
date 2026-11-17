// Lint.js - Check JavaScript syntax, provider contracts, architecture, and QML imports.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const { prepare } = require("./PrepareQmlImports.js");

// Walk a source tree without treating nested folders as separate packages.
function files(directory, extension) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const location = path.join(directory, entry.name);
        return entry.isDirectory() ? files(location, extension) : location.endsWith(extension) ? [location] : [];
    });
}

// Require a successful child process result and show its diagnostics.
function run(command, argumentsList) {
    const result = spawnSync(command, argumentsList, { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || String(result.error));
}

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "plugin.json"), "utf8"));
if (manifest.type !== "composite" || !manifest.components || !manifest.components.daemon || !manifest.components.launcher)
    throw new Error("Dux requires a composite launcher and daemon plugin");
if (manifest.components.daemon !== "./src/QML/Services/ScanOrchestrator.qml")
    throw new Error("The daemon entry point must load the scan orchestrator service");
for (const file of files(path.join(root, "src/JS"), ".js")) {
    const source = fs.readFileSync(file, "utf8");
    if (source.split("\n").length > 150) throw new Error(file + " exceeds the JavaScript size limit");
    new vm.Script(source.replace(/^\.pragma.*$/gm, "").replace(/^\.import.*$/gm, ""), { filename: file });
}
run("node", [path.join(__dirname, "CheckProviders.js")]);
run("node", [path.join(__dirname, "CheckArchitecture.js")]);
const lintCandidates = process.env.QMLLINT ? [process.env.QMLLINT] : ["/usr/lib64/qt6/bin/qmllint", "/usr/lib/qt6/bin/qmllint", "/usr/lib/qt6/libexec/qmllint", "qmllint"];
const lintCommand = lintCandidates.find(command => {
    const result = spawnSync(command, ["--version"], { encoding: "utf8" });
    return result.status === 0 && /qmllint\s+6\./.test(result.stdout + result.stderr);
});
if (!lintCommand) throw new Error("Qt 6 qmllint was not found; set QMLLINT to its executable path.");
const imports = fs.mkdtempSync(path.join(os.tmpdir(), "dev-launcher-lint-"));
try {
    prepare(imports, root);
    run(lintCommand, ["--max-warnings", "0", "--unused-imports", "warning", "-I", imports, "-i", path.join(imports, "Quickshell/Io/qmldir")].concat(files(path.join(root, "src/QML"), ".qml")));
} finally {
    fs.rmSync(imports, { recursive: true, force: true });
}
console.log("Lint passed");
