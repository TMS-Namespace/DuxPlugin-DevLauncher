// VSCodeReadCommands.js - Build bounded VS Code history read commands.
.pragma library
.import "VSCodeConstants.js" as Constants

// Read at most one byte past the size limit of one JSON history source, without invoking a shell.
// The extra byte lets the decoder see that the file is larger than the limit and refuse it.
function json(source) {
    return ["timeout", Constants.HISTORY_READ_TIMEOUT, "head", "-c", String(Constants.MAX_HISTORY_BYTES + 1), source];
}

// Use file modification time as the approximate recency anchor.
function modifiedTime(source) {
    return ["timeout", Constants.HISTORY_READ_TIMEOUT, "stat", "-c", "%Y", source];
}
