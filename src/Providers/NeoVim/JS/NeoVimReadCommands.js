// NeoVimReadCommands.js - Build the bounded, read-only command that checks which NeoVim-marked paths are folders.
.pragma library
.import "NeoVimConstants.js" as Constants
// Rules: Pure command building: no process is started here and no shell is used; every path is a separate argument.

// Report which of the given paths are folders. A broken or missing path only makes find exit non-zero, and its output is still used.
function directories(paths) {
    return ["timeout", Constants.READ_TIMEOUT, "find", "-L"].concat(paths, ["-maxdepth", "0", "-type", "d", "-print0"]);
}
