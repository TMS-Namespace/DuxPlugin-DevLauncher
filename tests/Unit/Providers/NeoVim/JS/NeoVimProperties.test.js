// NeoVimProperties.test.js - Check saved NeoVim settings, the terminal allow-list, and the declared fields.
// Rules: Runs in plain node; invalid folders or unsupported terminals must throw before any process could start.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const propertiesModule = source("Providers/NeoVim/JS/NeoVimProperties.js");
const descriptorModule = source("Providers/NeoVim/JS/NeoVimDescriptor.js");
const constants = source("Providers/NeoVim/JS/NeoVimConstants.js");
const terminal = source("Providers/NeoVim/JS/NeoVimTerminal.js");
const descriptors = source("Contracts/ProviderDescriptor.js");

// The defaults produce a valid native installation that uses a state folder and the default terminal.
const defaults = propertiesModule.defaultConfiguration();
const properties = propertiesModule.create(defaults);
assert.equal(properties.providerType, "neovim");
assert.equal(properties.settings.stateDirectory, "~/.local/state/nvim");
assert.equal(properties.settings.terminal, constants.DEFAULT_TERMINAL);

// The descriptor is valid for the plugin's schema and declares the three fields the settings page shows.
const descriptor = descriptors.validate(descriptorModule.create());
const plain = (value) => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(descriptor.fields.map((field) => field.key)), ["executable", "config", "terminal"]);
assert.equal(descriptor.launchable, true);
assert.equal(descriptor.scansFolders, false);

// A state folder must be absolute or start with ~/, and must not contain NUL.
assert.throws(
    () => propertiesModule.create(Object.assign({}, defaults, { config: "relative/nvim" })),
    (error) => error.field === "config"
);
assert.throws(
    () => propertiesModule.create(Object.assign({}, defaults, { config: "" })),
    (error) => error.field === "config"
);

// Only supported terminal emulators are accepted, and each one maps to its own switches.
assert.throws(
    () => propertiesModule.create(Object.assign({}, defaults, { terminal: "/usr/bin/rm" })),
    (error) => error.field === "terminal"
);
assert.throws(
    () => propertiesModule.create(Object.assign({}, defaults, { terminal: "gnome-terminal" })),
    (error) => error.field === "terminal"
);
assert.deepEqual(Array.from(terminal.switchesFor("/usr/bin/gnome-terminal")), ["--"]);
assert.deepEqual(Array.from(terminal.switchesFor("/usr/bin/kitty")), []);
assert.deepEqual(Array.from(terminal.switchesFor("/usr/bin/ghostty")), ["-e"]);
assert.equal(terminal.switchesFor("/usr/bin/vim"), null);

// Native, Flatpak, and Snap installations are all declared; an unknown type is refused.
for (const installationType of ["native", "flatpak", "snap"])
    assert.equal(
        propertiesModule.create(Object.assign({}, defaults, { installationType: installationType })).installationType,
        installationType
    );
assert.throws(
    () => propertiesModule.create(Object.assign({}, defaults, { installationType: "appimage" })),
    (error) => error.field === "installationType"
);
console.log("NeoVimProperties tests passed");
