// HostModules.test.js - Keep Dux test stand-ins in the same modules as installed components.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const harness = path.resolve(__dirname, "../Helpers/Harness");
const host = process.env.DMS_SOURCE_ROOT || "/usr/share/quickshell/dms";

// Walk host stand-ins, ignoring the harness entry points at the root.
function check(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const location = path.join(directory, entry.name);
        if (entry.isDirectory()) check(location);
        else if (location.endsWith(".qml")) {
            const relative = path.relative(harness, location);
            if (relative.includes(path.sep)) assert.ok(fs.existsSync(path.join(host, relative)), relative + " does not exist in the installed Dux module");
        }
    }
}
if (fs.existsSync(host)) check(harness);
