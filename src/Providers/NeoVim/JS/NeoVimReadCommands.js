// NeoVimReadCommands.js - Build the bounded, read-only commands that NeoVim's history reader runs.
.pragma library
.import "NeoVimConstants.js" as Constants
// Rules: Pure command building: no process is started here and no shell is used; every path is a separate argument.

// Report the size of the ShaDa file, so an oversized file is refused before it is read.
function size(path) {
    return ["timeout", Constants.READ_TIMEOUT, "stat", "-c", "%s", "--", path];
}

// Read the whole ShaDa file as base64 text, which keeps its binary bytes intact through the text output.
function history(path) {
    return ["timeout", Constants.READ_TIMEOUT, "base64", "-w0", "--", path];
}

// Report which of the given paths are folders. A broken or missing path only makes find exit non-zero, and its output is still used.
function directories(paths) {
    return ["timeout", Constants.READ_TIMEOUT, "find", "-L"].concat(paths, ["-maxdepth", "0", "-type", "d", "-print0"]);
}
