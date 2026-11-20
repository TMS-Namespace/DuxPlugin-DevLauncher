// NeoVimProperties.test.js - Check the saved terminal command, the state folder, the declared fields, and the installation types.
// Rules: Runs in plain node; an empty terminal command or an invalid folder must throw before any process could start.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const propertiesModule = source("Providers/NeoVim/JS/NeoVimProperties.js");
const descriptorModule = source("Providers/NeoVim/JS/NeoVimDescriptor.js");
const constants = source("Providers/NeoVim/JS/NeoVimConstants.js");
const descriptors = source("Contracts/ProviderDescriptor.js");
const plain = (value) => JSON.parse(JSON.stringify(value));
const commands = source("Providers/NeoVim/JS/NeoVimCommands.js");
// Build the launch for a configuration, which is where an empty terminal command is refused.
function commandFor(configuration) {
    return commands.terminalCommand(propertiesModule.create(configuration), "/home/test");
}

// The defaults leave the terminal command empty: the default configuration is still valid, and launching or saving asks for it.
const defaults = propertiesModule.defaultConfiguration();
assert.equal(defaults.executable, "");
assert.equal(propertiesModule.create(defaults).executable, "");
assert.throws(
    () => commandFor(defaults),
    (error) => error.field === "executable" && error.userMessage.includes(constants.TERMINAL_PLACEHOLDER)
);

// A saved terminal command becomes the executable, and the state folder is kept in the settings.
const properties = propertiesModule.create(Object.assign({}, defaults, { executable: "  ghostty -e  " }));
assert.equal(properties.executable, "ghostty -e");
assert.equal(properties.providerType, "neovim");
assert.equal(properties.settings.stateDirectory, "~/.local/state/nvim");
assert.equal(properties.settings.terminal, undefined);

// The descriptor is valid for the plugin's schema, declares one terminal-command field, and lets the user supply every installation.
const descriptor = descriptors.validate(descriptorModule.create());
assert.deepEqual(plain(descriptor.fields.map((field) => field.key)), ["executable", "config"]);
assert.equal(descriptor.fields[0].label, "Terminal command");
assert.ok(descriptor.fields[0].description.includes("NeoVim is started after it"));
assert.ok(
    descriptor.installations.every(
        (installation) => installation.userExecutable === true && installation.executable === ""
    )
);
assert.equal(descriptor.launchable, true);
assert.equal(descriptor.scansFolders, false);

// A state folder must be absolute or start with ~/.
assert.throws(
    () => propertiesModule.create(Object.assign({}, defaults, { executable: "ghostty -e", config: "relative/nvim" })),
    (error) => error.field === "config"
);

// Native, Flatpak, and Snap installations are all declared; an unknown type is refused.
for (const installationType of ["native", "flatpak", "snap"])
    assert.equal(
        propertiesModule.create(
            Object.assign({}, defaults, { executable: "ghostty -e", installationType: installationType })
        ).installationType,
        installationType
    );
assert.throws(
    () =>
        propertiesModule.create(
            Object.assign({}, defaults, { executable: "ghostty -e", installationType: "appimage" })
        ),
    (error) => error.field === "installationType"
);
console.log("NeoVimProperties tests passed");
