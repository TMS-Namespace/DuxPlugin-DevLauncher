// RiderApi.test.js - Check native/Snap commands, safe validation, and installation declarations.
// Rules: Runs in plain node; the executable must reach the probe as an argument, and the symlink probe runs only in a temporary folder it removes.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const api = source("Providers/Rider/JS/RiderApi.js").create();
const propertiesModule = source("Providers/Rider/JS/RiderProperties.js");
const descriptor = source("Providers/Rider/JS/RiderDescriptor.js").create();
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
// The probe resolves symlinks in the shell and receives the executable as an argument, never as text inside the script.
const probe = Array.from(api.validationProbe(native, native.executable));
assert.deepEqual(probe.slice(0, 2), ["sh", "-c"]);
assert.deepEqual(probe.slice(3), ["sh", native.executable, "8388609"]);
assert.equal(api.validateExecutable('{"productCode":"RD"}', native), true);
assert.throws(() => api.validateExecutable('{"productCode":"IU"}', native));
assert.throws(() => api.validateExecutable('{"productCode":"RD"}', { ...native, executable: "/tmp/bin/other" }));
assert.throws(() => api.validateExecutable("not json", native));
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
assert.equal(api.validateExecutable("Name Version\nrider 2025.2\n", snap), true);
assert.throws(() => api.validateExecutable("Name Version\nother 1.0\n", snap));
assert.throws(() =>
    propertiesModule.create({ ...propertiesModule.defaultConfiguration(), installationType: "flatpak" })
);

// A launcher reached through a symlink (a user's bin folder) must still find its own installation's metadata.
// The probe runs for real here, against a temporary installation and a symlink to its launcher.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "rider-probe-"));
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
    const linked = propertiesModule.create({ ...propertiesModule.defaultConfiguration(), executable: link });
    const command = Array.from(api.validationProbe(linked, link));
    const output = execFileSync(command[0], command.slice(1), { encoding: "utf8" });
    assert.equal(output, '{"productCode":"RD"}');
    assert.equal(api.validateExecutable(output, linked), true);
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}
