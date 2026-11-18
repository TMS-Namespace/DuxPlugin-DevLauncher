// CheckArchitecture.js - Keep QML registration and resource access in the intended layers.
// Rules: Audit only; it fails when qmldir registration, singleton pragmas, provider imports, or concrete IDE names break the layering, and it never starts the QML shell.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Visit all QML folders, checking registration and single resource doors.
function check(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const files = entries.filter(entry => entry.isFile() && entry.name.endsWith(".qml"));
    if (files.length) {
        const registrations = fs.readFileSync(path.join(directory, "qmldir"), "utf8");
        const declared = registrations.split("\n").map(line => line.trim()).filter(line => line && !line.startsWith("#") && !line.startsWith("module "));
        const registeredFiles = declared.map(line => line.split(/\s+/).pop()).filter(name => name.endsWith(".qml"));
        assert.deepEqual(registeredFiles.slice().sort(), files.map(file => file.name).sort(), directory + " must register exactly its QML files");
        // Tells whether a relative QML path is a provider's Recents reader, the only provider QML file that runs processes or calls the provider API.
        const isProviderReader = (name) => /^Providers\/[A-Za-z]+\/[A-Za-z]+Recents\.qml$/.test(name);
        for (const file of files) {
            assert.match(registrations, new RegExp("\\b" + file.name.replace(".qml", "") + "\\s+[^\\n]*" + file.name.replace(".", "\\.") + "\\b"));
            const source = fs.readFileSync(path.join(directory, file.name), "utf8");
            const relative = path.relative(path.resolve(__dirname, "../src/QML"), path.join(directory, file.name));
            const registration = declared.find(line => line.split(/\s+/).pop() === file.name) || "";
            assert.equal(registration.startsWith("singleton "), /^\s*pragma Singleton\s*$/m.test(source), relative + " singleton registration differs from its pragma");
            if (source.includes("Process {")) assert.ok(relative.startsWith("BackgroundWorkers/") || isProviderReader(relative), relative);
            if (source.includes("QtQuick.LocalStorage")) assert.ok(["Providers/VSCode/HistoryDatabase.qml", "Providers/Zed/ZedRecents.qml"].includes(relative), relative);
            if (source.includes("HistoryPayload") || source.includes("historyDatabase") || source.includes("VSCodeReadCommands")) assert.ok(relative.startsWith("Providers/VSCode/"), relative);
            if (source.includes("api.sources(") || source.includes("api.parseHistory(")) assert.ok(isProviderReader(relative), relative);
            if (relative === "Services/ScanOrchestrator.qml") {
                assert.ok(!source.includes(".sources("), "orchestrator must not read provider sources");
                assert.ok(!source.includes(".parseHistory("), "orchestrator must not parse provider payloads");
            }
            if (source.includes("execDetached(")) assert.ok(["Services/ProviderHandler.qml", "Services/SystemOpener.qml"].includes(relative), relative);
            if (source.includes("Host.files")) assert.equal(relative, "Services/FileMetadataService.qml");
            if (source.includes("DesktopEntries.applications") || source.includes("svgReaderType")) assert.equal(relative, "Services/ResultItemIcon.qml");
            if (source.includes("setPluginData(") || source.includes("getPluginData(")) assert.equal(relative, "Services/DataStorage.qml");
            if (source.includes("VSCodeApi.js") || source.includes("VSCodeProperties.js")) assert.equal(relative, "Services/ProvidersManager.qml");
            if (relative !== "Services/ProviderHandler.qml" && !isProviderReader(relative))
                assert.ok(!/\b(?:api|parts\.api)\.(?:sources|parseHistory|launchArgs|validationArgs|validationPaths|validateExecutable|validateArguments|validateHistory)\s*\(/.test(source), relative + " reaches around the provider facade");
        }
    }
    for (const entry of entries) if (entry.isDirectory()) check(path.join(directory, entry.name));
}

check(path.resolve(__dirname, "../src/QML"));

// Keep every current-provider dependency in the registry or its provider folder.
const helpers = path.resolve(__dirname, "../src/JS/Helpers");
for (const name of fs.readdirSync(helpers).filter(name => name.endsWith(".js"))) {
    const source = fs.readFileSync(path.join(helpers, name), "utf8");
    assert.ok(!source.includes("../Providers/"), name + " imports a concrete provider");
}
for (const contract of ["src/JS/Contracts/ProviderProperties.js", "src/QML/Contracts/ProviderProperties.qml"]) {
    const source = fs.readFileSync(path.resolve(__dirname, "..", contract), "utf8");
    assert.ok(!source.includes("configDirectory") && !source.includes("sharedStorageDirectory"), contract + " contains VS Code settings");
}

// Plugin code outside the provider folders must not name a concrete IDE, its folders, or its icons.
// Each provider declares those names through its own descriptor, so the plugin reads them from there.
const concreteIdeTerms = ["VS Code", "vscode", ".config/Code", ".vscode-shared", "code-workspace"];
// Walks a source folder recursively, skipping the Providers folders, and asserts that no QML or JS file there names a concrete IDE.
function scanForConcreteIde(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const location = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== "Providers") scanForConcreteIde(location);
            continue;
        }
        if (!/\.(qml|js)$/.test(entry.name)) continue;
        const source = fs.readFileSync(location, "utf8");
        for (const term of concreteIdeTerms)
            assert.ok(!source.includes(term), path.relative(path.resolve(__dirname, ".."), location) + " names a concrete IDE (" + term + "); declare it in the provider's descriptor instead");
    }
}
scanForConcreteIde(path.resolve(__dirname, "../src/QML"));
scanForConcreteIde(path.resolve(__dirname, "../src/JS"));

// Provider boundary. Plugin code reaches a provider only through its Integration folder.
// A provider reaches only its own folder and the shared tools (Contracts and Helpers), never the plugin or another provider.
const sourceRoot = path.resolve(__dirname, "../src");
const sharedToolFolders = ["JS/Contracts", "JS/Helpers", "QML/Contracts"];
const providerFolder = /^(JS|QML)\/Providers\/[A-Za-z]+/;
const entryPointFile = /^(JS|QML)\/Providers\/[A-Za-z]+\/Integration(\/[A-Za-z]+\.js)?$/;
// Lists every QML and JS file under a directory, searching subfolders recursively.
function sourceFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(function(entry) {
        const location = path.join(directory, entry.name);
        return entry.isDirectory() ? sourceFiles(location) : /\.(qml|js)$/.test(entry.name) ? [location] : [];
    });
}
for (const file of [...sourceFiles(path.join(sourceRoot, "QML")), ...sourceFiles(path.join(sourceRoot, "JS"))]) {
    const relativeFile = path.relative(sourceRoot, file);
    // Ownership is by provider name, so a provider's QML and JavaScript files count as one provider.
    const owner = ((relativeFile.match(providerFolder) || [""])[0]).replace(/^(JS|QML)\//, "");
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/^\s*\.?import\s+"([^"]+)"/gm)) {
        const target = match[1];
        if (!target.startsWith(".")) continue;
        const resolved = path.relative(sourceRoot, path.resolve(path.dirname(file), target));
        const ownerPath = resolved.replace(/^(JS|QML)\//, "");
        const insideOwner = owner !== "" && (ownerPath === owner || ownerPath.startsWith(owner + "/"));
        if (owner) {
            // A provider may use its own folder or a shared tool, but no plugin code and no other provider.
            const shared = sharedToolFolders.some(function(folder) { return resolved === folder || resolved.startsWith(folder + "/"); });
            assert.ok(insideOwner || shared, relativeFile + " imports " + target + "; a provider may use only its own folder and shared tools");
        } else if (providerFolder.test(resolved)) {
            assert.ok(entryPointFile.test(resolved), relativeFile + " imports " + target + "; plugin code may reach a provider only through its Integration folder");
        }
    }
}

// Dux global memory is not used for shared state or signals; shared state lives in a singleton service instead.
for (const file of [...sourceFiles(path.join(sourceRoot, "QML")), ...sourceFiles(path.join(sourceRoot, "JS"))]) {
    assert.doesNotMatch(fs.readFileSync(file, "utf8"), /GlobalVar\(/, path.relative(sourceRoot, file) + " uses Dux global memory; use a shared singleton service");
}
