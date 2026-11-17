// Format.js - Format source only when the formatter returns complete, nonempty output.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// Gather only plugin QML and JavaScript sources.
function files(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const location = path.join(directory, entry.name);
        return entry.isDirectory() ? files(location) : /\.(qml|js)$/.test(location) ? [location] : [];
    });
}

// Reject empty output before any file can be replaced.
function formatted(file) {
    const qml = file.endsWith(".qml");
    const source = fs.readFileSync(file, "utf8");
    const directives = qml ? [] : source.split("\n").filter(line => /^\.(pragma|import)\b/.test(line));
    const body = qml ? undefined : source.split("\n").filter(line => !/^\.(pragma|import)\b/.test(line)).join("\n");
    const result = spawnSync(qml ? "qmlformat" : "prettier", qml ? [file] : ["--parser", "babel"], { encoding: "utf8", input: body });
    if (result.status !== 0 || !result.stdout || !result.stdout.trim())
        throw new Error("Formatter produced no valid output for " + file + ": " + (result.stderr || result.error || "empty output"));
    if (!qml) {
        const lines = result.stdout.split("\n");
        const header = lines.shift();
        return [header].concat(directives, lines).join("\n");
    }
    const header = source.split("\n")[0];
    const output = result.stdout.split("\n").filter(line => line !== header);
    return [header].concat(output).join("\n");
}

const root = path.resolve(__dirname, "..");
const changes = files(path.join(root, "src")).map(file => ({ file, output: formatted(file) }));
const check = process.argv.includes("--check");
for (const change of changes) {
    if (fs.readFileSync(change.file, "utf8") === change.output) continue;
    if (check) throw new Error("Formatting differs: " + change.file);
    fs.writeFileSync(change.file, change.output);
}
console.log(check ? "Formatting passed" : "Formatting complete");
