// ExecutableIconRules.js - Match a configured IDE command to its desktop entry icon.
.pragma library
// Rules: Pure desktop entry lookups: never runs a command and never throws; no QML types or logging.

// Read the program token from a desktop entry without executing its command.
function commandProgram(command) {
    const match = String(command || "").trim().match(/^(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
    return match ? match[1] || match[2] || match[3] : "";
}

// Prefer an exact path; a matching executable name also covers common CLI symlinks.
function iconName(executable, entries) {
    const configured = String(executable || "");
    if (!configured) return "";
    const basename = configured.split("/").pop();
    let sameName = "";
    for (const entry of entries || []) {
        const program = commandProgram(entry.execString);
        if (!program || !entry.icon) continue;
        if (program === configured) return String(entry.icon);
        if (!sameName && program.split("/").pop() === basename) sameName = String(entry.icon);
    }
    return sameName;
}

// Snap applications can declare their desktop entry ID because their executable is the shared snap launcher.
function desktopIconName(desktopId, entries) {
    const match = (entries || []).find(function(entry) { return entry.id === desktopId || entry.id === desktopId + ".desktop"; });
    return match && match.icon ? String(match.icon) : "";
}
