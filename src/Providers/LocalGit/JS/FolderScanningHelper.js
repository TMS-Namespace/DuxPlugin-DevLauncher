// FolderScanningHelper.js - Build the find command that lists Git repositories below one folder, and read its output back.
// Only the local Git folder source uses this module; it keeps no state and never runs anything itself.
.pragma library
.import "../../../Plugin/JS/Helpers/Config.js" as Config
.import "../../../Plugin/JS/Helpers/ConfigurationRules.js" as ConfigurationRules
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules

// Dependency and build folders that are never searched for repositories.
var EXCLUDED_DIRECTORIES = Object.freeze(["node_modules", ".venv", "venv", "dist", "build", "target", ".cache"]);

// Ask find for Git markers below one folder, bounded by time and depth. Pruning stops the walk inside excluded folders and
// inside each .git directory. -mindepth 1 keeps the folder itself out of the pruning rules, so a folder whose own name is an
// excluded name is still searched. Results are NUL-separated, so no path can break the output apart.
function findCommand(folder, depth) {
    const command = ["timeout", Config.repositoryScanTimeout, "env", "LC_ALL=C", "find", folder, "-maxdepth", String(ConfigurationRules.repositoryDepth(depth)), "-mindepth", "1", "("];
    EXCLUDED_DIRECTORIES.forEach(function(name, index) {
        if (index) command.push("-o");
        command.push("-name", name);
    });
    command.push(")", "-prune", "-o", "-name", ".git", "-print0", "-prune");
    return command;
}

// Turn NUL-delimited find output into repository roots. Each .git path gives its folder; a folder is listed once,
// and the list stops at the limit so one folder can never flood the cache.
function repositoryRoots(output, limit) {
    const seen = {};
    const records = [];
    for (const gitPath of String(output || "").split("\u0000")) {
        if (!gitPath.endsWith("/.git")) continue;
        const path = PathRules.localPath(gitPath.slice(0, -5));
        if (!path || seen[path]) continue;
        seen[path] = true;
        records.push({ path: path, kind: "repository", provider: "", recent: 0, openedAt: 0 });
        if (records.length >= limit) break;
    }
    return records;
}
