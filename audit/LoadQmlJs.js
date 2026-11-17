// LoadQmlJs.js - Run pure QML JavaScript modules in Node test contexts.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Resolve QML imports recursively while keeping one context for each module.
function load(file, cache = new Map()) {
    const absolute = path.resolve(file);
    if (cache.has(absolute)) return cache.get(absolute);
    const source = fs.readFileSync(absolute, "utf8");
    const context = vm.createContext({});
    cache.set(absolute, context);
    const imports = /^\.import\s+"([^"]+)"\s+as\s+(\w+)\s*$/gm;
    let match;
    while ((match = imports.exec(source)) !== null)
        context[match[2]] = load(path.resolve(path.dirname(absolute), match[1]), cache);
    vm.runInContext(source.replace(/^\.pragma.*$/gm, "").replace(imports, ""), context, { filename: absolute });
    return context;
}

module.exports = { load };
