// NeoVimTerminal.js - Find the switches that make a supported terminal emulator run a command.
.pragma library
.import "NeoVimConstants.js" as Constants
// Rules: Pure lookup by executable name: no process, QML types or logging; an unknown terminal gives null.

// Return the switches placed before the command for this terminal, or null when the terminal is not supported.
function switchesFor(terminalPath) {
    const name = String(terminalPath || "")
        .split("/")
        .pop();
    return Object.prototype.hasOwnProperty.call(Constants.TERMINAL_SWITCHES, name)
        ? Constants.TERMINAL_SWITCHES[name]
        : null;
}
