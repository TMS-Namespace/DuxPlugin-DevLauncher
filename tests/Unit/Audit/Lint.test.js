// Lint.test.js - Reject an explicitly configured Qt 5 linter instead of reporting a false pass.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dev-launcher-qt-version-"));
try {
    const fakeLint = path.join(fixture, "qmllint");
    fs.writeFileSync(fakeLint, '#!/bin/sh\nprintf "qmllint 1.0\\n"\n', { mode: 0o755 });
    const result = spawnSync(process.execPath, [path.resolve(__dirname, "../../../audit/Lint.js")], {
        encoding: "utf8",
        env: { ...process.env, QMLLINT: fakeLint }
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Qt 6 qmllint was not found/);
} finally {
    fs.rmSync(fixture, { recursive: true, force: true });
}
