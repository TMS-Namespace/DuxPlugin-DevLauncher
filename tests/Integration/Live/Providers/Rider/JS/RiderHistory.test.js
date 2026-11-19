// RiderHistory.test.js - Opt-in read of local Rider history and installation metadata without printing private paths.
// Rules: Opt-in live check; it reads the user's Rider history and runs the real probe only if an installation exists, and it prints counts, never paths.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const source = require("../../../../../Helpers/LoadSource.cjs");
const directory = path.join(os.homedir(), ".config/JetBrains");
if (fs.existsSync(directory)) {
    const api = source("Providers/Rider/JS/RiderApi.js").create();
    const values = source("Providers/Rider/JS/RiderProperties.js").defaultConfiguration();
    const properties = source("Providers/Rider/JS/RiderProperties.js").create(values);
    const folders = fs
        .readdirSync(directory)
        .filter((name) => /^Rider/.test(name))
        .slice(0, 20);
    let count = 0;
    for (const folder of folders) {
        const file = path.join(directory, folder, "options/recentSolutions.xml");
        if (!fs.existsSync(file)) continue;
        const records = api.parseHistory({ text: fs.readFileSync(file, "utf8"), home: os.homedir() }, properties);
        count += records.length;
        assert.ok(records.every((record) => record.path.startsWith("/")));
    }
    if (folders.length) assert.ok(count > 0, "No Rider history records were read");
    const executable = path.join(os.homedir(), "JetBrains Rider/bin/rider");
    if (fs.existsSync(executable)) {
        const probe = Array.from(api.validationProbe(properties, executable));
        const answer = spawnSync(probe[0], probe.slice(1), { encoding: "utf8" });
        assert.equal(answer.status, 0);
        assert.equal(api.validateExecutable(answer.stdout, properties), true);
    }
    console.log("T:PASS live Rider history entries=" + count);
}
