// RiderApi.test.js - Check native/Snap commands, metadata-file validation, and installation declarations.
// Rules: Runs in plain node; the metadata path is computed as text and no process is started; the symlink check reads only a temporary folder it removes.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const api = source("Providers/Rider/JS/RiderApi.js").create();
const propertiesModule = source("Providers/Rider/JS/RiderProperties.js");
const descriptor = source("Providers/Rider/JS/RiderDescriptor.js").create();
const Constants = source("Providers/Rider/JS/RiderConstants.js");
const native = propertiesModule.create({
    ...propertiesModule.defaultConfiguration(),
    executable: "/home/user/JetBrains Rider/bin/rider",
    extraArguments: ["--wait"]
});
assert.deepEqual(
    Array.from(descriptor.installations, (option) => option.type),
    ["native", "snap"]
);
assert.deepEqual(Array.from(api.launchArgs("/tmp/project name", native, "/home/user")), [
    native.executable,
    "--wait",
    "/tmp/project name"
]);
// Native installations are checked by reading product-info.json two folders above the launcher, with no process started.
assert.equal(api.validationFile(native, native.executable), "/home/user/JetBrains Rider/product-info.json");
assert.deepEqual(Array.from(api.validationProbe(native, native.executable)), []);
assert.equal(api.validationFile(native, "/rider"), "/product-info.json");
assert.equal(api.validateExecutable('{"productCode":"RD"}', native), true);
assert.throws(() => api.validateExecutable('{"productCode":"IU"}', native));
assert.throws(() => api.validateExecutable('{"productCode":"RD"}', { ...native, executable: "/tmp/bin/other" }));
assert.throws(() => api.validateExecutable("not json", native));
assert.throws(() => api.validateExecutable("x".repeat(Constants.MAX_HISTORY_BYTES + 1), native));
const snap = propertiesModule.create({
    ...propertiesModule.defaultConfiguration(),
    installationType: "snap",
    executable: "/usr/bin/snap",
    extraArguments: ["--wait"]
});
assert.deepEqual(Array.from(api.launchArgs("/tmp/project name", snap, "/home/user")), [
    "/usr/bin/snap",
    "run",
    "rider",
    "--wait",
    "/tmp/project name"
]);
assert.deepEqual(Array.from(api.validationArgs(snap, "/home/user")), ["/usr/bin/snap", "list", "rider"]);
assert.equal(api.validationFile(snap, "/usr/bin/snap"), "");
assert.equal(api.validateExecutable("Name Version\nrider 2025.2\n", snap), true);
assert.throws(() => api.validateExecutable("Name Version\nother 1.0\n", snap));
assert.throws(() =>
    propertiesModule.create({ ...propertiesModule.defaultConfiguration(), installationType: "flatpak" })
);

// A launcher reached through a symlink (a user's bin folder) has no metadata beside it, so the real launcher path is needed.
// The metadata file is read for real here, from a temporary installation.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "rider-metadata-"));
try {
    const installation = path.join(root, "toolbox", "rider-install");
    fs.mkdirSync(path.join(installation, "bin"), { recursive: true });
    fs.writeFileSync(path.join(installation, "product-info.json"), '{"productCode":"RD"}');
    const launcher = path.join(installation, "bin", "rider.sh");
    fs.writeFileSync(launcher, "#!/bin/sh\n", { mode: 0o755 });
    const localBin = path.join(root, "home", ".local", "bin");
    fs.mkdirSync(localBin, { recursive: true });
    const link = path.join(localBin, "rider");
    fs.symlinkSync(launcher, link);
    const real = propertiesModule.create({ ...propertiesModule.defaultConfiguration(), executable: launcher });
    const metadataPath = api.validationFile(real, launcher);
    assert.equal(metadataPath, path.join(installation, "product-info.json"));
    assert.equal(api.validateExecutable(fs.readFileSync(metadataPath, "utf8"), real), true);
    const linked = propertiesModule.create({ ...propertiesModule.defaultConfiguration(), executable: link });
    assert.equal(api.validationFile(linked, link), path.join(root, "home", ".local", "product-info.json"));
    assert.equal(fs.existsSync(api.validationFile(linked, link)), false);
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
