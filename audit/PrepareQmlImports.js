// PrepareQmlImports.js - Build a temporary lint overlay for Dux modules and Quickshell's process enum.
const fs = require("node:fs");
const path = require("node:path");

// Copy Quickshell.Io metadata and add the missing Qt process enum when necessary.
function prepare(destination, repositoryRoot) {
    const candidates = (process.env.QML_IMPORT_PATH || "")
        .split(path.delimiter)
        .filter(Boolean)
        .concat(["/usr/lib64/qt6/qml", "/usr/lib/qt6/qml", "/usr/lib/x86_64-linux-gnu/qt6/qml"]);
    const source = candidates
        .map((directory) => path.join(directory, "Quickshell", "Io"))
        .find((directory) => fs.existsSync(path.join(directory, "qmldir")));
    if (!source) throw new Error("Quickshell.Io metadata was not found; set QML_IMPORT_PATH.");
    fs.symlinkSync(path.join(repositoryRoot, "tests/Helpers/Harness"), path.join(destination, "qs"), "dir");
    const target = path.join(destination, "Quickshell", "Io");
    fs.cpSync(source, target, {
        recursive: true,
        filter: (location) => fs.statSync(location).isDirectory() || /(?:\.qml|\.qmltypes|[/\\]qmldir)$/.test(location)
    });
    const declaration = fs.readFileSync(path.join(source, "qmldir"), "utf8");
    const typeFiles = Array.from(declaration.matchAll(/^typeinfo\s+(\S+)\s*$/gm), (match) => match[1]);
    const metadata = typeFiles.map((name) => fs.readFileSync(path.join(source, name), "utf8")).join("\n");
    if (!typeFiles.length || !/\bname:\s*"Process"/.test(metadata))
        throw new Error("Quickshell.Io Process metadata is missing.");
    let overlay = declaration.replace(/^prefer\s+.*(?:\r?\n|$)/gm, "");
    if (/\btype:\s*"QProcess::ExitStatus"/.test(metadata) && !/\bname:\s*"QProcess"/.test(metadata)) {
        fs.writeFileSync(
            path.join(target, "qprocess.qmltypes"),
            'import QtQuick.tooling 1.2\nModule { Component { name: "QProcess"; accessSemantics: "reference"; Enum { name: "ExitStatus"; values: ["NormalExit", "CrashExit"] } } }\n'
        );
        overlay += "\ntypeinfo qprocess.qmltypes\n";
    }
    fs.writeFileSync(path.join(target, "qmldir"), overlay);
}

module.exports = { prepare };
