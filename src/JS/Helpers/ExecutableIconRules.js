// ExecutableIconRules.js - Match a configured IDE command to its desktop entry icon.
.pragma library

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
