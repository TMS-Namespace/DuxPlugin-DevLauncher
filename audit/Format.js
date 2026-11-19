// Format.js - Format the plugin's QML and JavaScript sources in place, or check them without writing anything.
// Rules: QML goes through QmlFormatter, which keeps the constructs this qmlformat build corrupts out of its reach, and every
// result is verified against its original by QmlVerifier before it may be written; a file that fails is reported and left unchanged.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { formatQmlStable } = require("./QmlFormatter.js");
const { verifyQml } = require("./QmlVerifier.js");

// The folders whose sources are formatted together.
const sourceFolders = ["src", "tests", "audit"];

// Gather the JavaScript files under one folder, recursively.
function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const location = path.join(directory, entry.name);
        return entry.isDirectory() ? files(location) : /\.(js|qml)$/.test(location) ? [location] : [];
    });
}

// Format one JavaScript module with prettier, keeping its .pragma and .import directives directly after the header comment.
function formattedJavaScript(source) {
    const lines = source.split("\n");
    const directives = lines.filter((line) => /^\.(pragma|import)\b/.test(line));
    const body = lines.filter((line) => !/^\.(pragma|import)\b/.test(line)).join("\n");
    const result = spawnSync("prettier", ["--parser", "babel"], { encoding: "utf8", input: body });
    if (result.status !== 0 || !result.stdout.trim())
        throw new Error("prettier produced no valid output: " + (result.stderr || result.error || "empty output"));
    const formatted = result.stdout.split("\n");
    const header = formatted.shift();
    return [header].concat(directives, formatted).join("\n");
}

// Return the formatted text of one file, refusing a QML result whose meaning differs from the original.
function formatted(file) {
    const source = fs.readFileSync(file, "utf8");
    if (!file.endsWith(".qml")) return formattedJavaScript(source);
    const output = formatQmlStable(file, source);
    const problems = verifyQml(source, output);
    if (problems.length) throw new Error("QML formatting changes the meaning of " + file + ": " + problems[0]);
    return output;
}

// Format or check every source folder, writing only the files that change unless the check mode is requested.
function main(argv) {
    const root = path.resolve(__dirname, "..");
    const check = argv.includes("--check");
    const changes = [];
    const refusals = [];
    for (const folder of sourceFolders)
        for (const file of files(path.join(root, folder))) {
            try {
                changes.push({ file, output: formatted(file) });
            } catch (error) {
                refusals.push(path.relative(root, file) + ": " + error.message.slice(0, 200));
            }
        }
    if (refusals.length)
        throw new Error("Formatting refused for " + refusals.length + " file(s):\n" + refusals.join("\n"));
    for (const change of changes) {
        if (fs.readFileSync(change.file, "utf8") === change.output) continue;
        if (check) throw new Error("Formatting differs: " + change.file);
        fs.writeFileSync(change.file, change.output);
    }
    console.log(check ? "Formatting passed" : "Formatting complete");
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { formattedJavaScript };
