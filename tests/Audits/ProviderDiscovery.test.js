// ProviderDiscovery.test.js - Verify contributor lint discovers newly added provider directories.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { check } = require("../../audit/CheckProviders.js");

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "dev-launcher-provider-audit-"));
try {
    const sourceRoot = path.join(fixture, "src");
    fs.cpSync(path.resolve(__dirname, "../../src"), sourceRoot, { recursive: true });
    check(sourceRoot);
    fs.mkdirSync(path.join(sourceRoot, "Providers", "UnregisteredIDE"));
    assert.throws(() => check(sourceRoot), /UnregisteredIDE/);
} finally {
    fs.rmSync(fixture, { recursive: true, force: true });
}
