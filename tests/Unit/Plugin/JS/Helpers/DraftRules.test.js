// DraftRules.test.js - Check dependent-field clearing using a declaration that is not VS Code, to prove the rule is generic.
// Rules: Runs in plain node; dependent fields are cleared only when they still hold defaults, and user-changed values are kept.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const rules = source("Helpers/DraftRules.js");

const descriptor = { fields: [{ key: "binary", comparison: "basename" }, { key: "root", comparison: "exact" }, { key: "cache", comparison: "exact" }], dependents: { binary: ["root", "cache"], root: ["cache"] } };
const defaults = { binary: "/usr/bin/tool", root: "~/.tool", cache: "~/.tool-cache" };
const draft = { binary: "/usr/bin/tool", root: "~/.tool", cache: "~/.tool-cache", name: "Work" };

// Moving the binary to another file name clears its dependents that still hold defaults.
const movedBinary = rules.applyEdit(draft, defaults, descriptor, "binary", "/opt/other");
assert.equal(movedBinary.root, "");
assert.equal(movedBinary.cache, "");
assert.equal(movedBinary.name, "Work", "fields without dependencies are kept");

// A binary with the same file name, in another folder, is not a move, so nothing is cleared.
const sameName = rules.applyEdit(draft, defaults, descriptor, "binary", "/opt/tool");
assert.equal(sameName.root, "~/.tool");
assert.equal(sameName.cache, "~/.tool-cache");

// A dependent the user already changed keeps its value.
const customRoot = rules.applyEdit(Object.assign({}, draft, { root: "/data/custom" }), defaults, descriptor, "binary", "/opt/other");
assert.equal(customRoot.root, "/data/custom");
assert.equal(customRoot.cache, "");

// Changing a root clears only its own dependents, and only when it moves away from its default.
const movedRoot = rules.applyEdit(draft, defaults, descriptor, "root", "/data/new");
assert.equal(movedRoot.cache, "");
assert.equal(movedRoot.binary, "/usr/bin/tool");
const defaultRoot = rules.applyEdit(Object.assign({}, draft, { root: "/data/new", cache: "/c" }), defaults, descriptor, "root", "~/.tool");
assert.equal(defaultRoot.cache, "/c", "returning to the default must not clear the cache");

// A field with no declaration never clears anything.
assert.equal(rules.applyEdit(draft, defaults, descriptor, "name", "Renamed").cache, "~/.tool-cache");

// Returning the field to its default restores the folders that were cleared, so the draft can become valid again.
const cleared = rules.applyEdit(rules.applyEdit(draft, defaults, descriptor, "binary", "/opt/other"), defaults, descriptor, "binary", "/usr/bin/tool");
assert.equal(cleared.root, "~/.tool");
assert.equal(cleared.cache, "~/.tool-cache");

// The alias is trimmed in one place, so validation, duplicate checks, and saving all see the same name.
assert.equal(rules.normalize({ name: "  Work  ", binary: "/usr/bin/tool" }).name, "Work");
assert.equal(rules.normalize({ binary: "/usr/bin/tool" }).name, "");

// Switching IDE types loads the selected provider's defaults, keeps the ID, and avoids alias collisions.
const zedDefaults = { installationType: "flatpak", type: "zed", name: "Zed", executable: "/usr/bin/flatpak", config: "/zed", extraArguments: [] };
const vsDefaults = { installationType: "native", type: "vscode", name: "VS Code", executable: "code" };
const switched = rules.switchProvider({ installationType: "native", id: "stable-id", type: "vscode", name: "VS Code 2", executable: "code", shared: "/old" }, vsDefaults, zedDefaults, [{ name: "Zed" }], -1);
assert.equal(switched.id, "stable-id");
assert.equal(switched.name, "Zed 2");
assert.equal(switched.executable, "/usr/bin/flatpak");
assert.equal(switched.shared, undefined);
assert.equal(rules.switchProvider({ installationType: "native", id: "stable-id", type: "vscode", name: "Work" }, vsDefaults, zedDefaults, [], -1).name, "Work");

// Selecting a packaging type changes the provider-declared paths and keeps the user's alias and arguments.
const installationOptions = [{ type: "native", executable: "zed", config: "~/.local/share/zed" }, { type: "flatpak", executable: "/usr/bin/flatpak", config: "~/.var/app/dev.zed.Zed/data/zed" }];
const installationDraft = { id: "stable-id", type: "zed", name: "My Zed", installationType: "native", executable: "custom", config: "/old", extraArguments: ["--new"] };
const selectedInstallation = rules.switchInstallation(installationDraft, installationOptions, "flatpak");
assert.equal(selectedInstallation.id, installationDraft.id);
assert.equal(selectedInstallation.name, "My Zed");
assert.equal(selectedInstallation.executable, "/usr/bin/flatpak");
assert.equal(selectedInstallation.config, "~/.var/app/dev.zed.Zed/data/zed");
assert.deepEqual(Array.from(selectedInstallation.extraArguments), ["--new"]);
assert.equal(rules.switchInstallation(installationDraft, installationOptions, "snap"), installationDraft);

// A custom icon survives an IDE type change; the other provider-specific fields take the new provider's defaults.
const draftRulesForIcon = source("Helpers/DraftRules.js");
const iconDraft = { id: "6a54e4b5-6173-46bf-8bd1-8f3960905460", type: "vscode", name: "Code", executable: "code", config: "/tmp/code", iconPath: "/tmp/custom.svg" };
const iconVscodeDefaults = { type: "vscode", name: "VS Code", executable: "code", config: "/a" };
const iconZedDefaults = { type: "zed", name: "Zed", executable: "zed", config: "/b" };
const iconSwitchedDraft = draftRulesForIcon.switchProvider(iconDraft, iconVscodeDefaults, iconZedDefaults, [], -1);
assert.equal(iconSwitchedDraft.iconPath, "/tmp/custom.svg", "a custom icon was dropped when the IDE type changed");
assert.equal(iconSwitchedDraft.type, "zed");
assert.equal(iconSwitchedDraft.config, "/b", "a provider-specific field kept the old provider's value");
