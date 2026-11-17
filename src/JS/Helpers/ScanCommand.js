// ScanCommand.js - Build bounded local read commands as separate arguments.
.pragma library
.import "Config.js" as Config
.import "ConfigurationRules.js" as ConfigurationRules
var EXCLUDED_DIRECTORIES = Object.freeze(["node_modules", ".venv", "venv", "dist", "build", "target", ".cache"]);

// Ask find for Git markers while pruning dependency and build folders.
function repositories(folder, depth) {
    const command = ["timeout", Config.repositoryScanTimeout, "find", folder, "-maxdepth", String(ConfigurationRules.repositoryDepth(depth)), "("];
    EXCLUDED_DIRECTORIES.forEach(function (name, index) {
        if (index) command.push("-o");
        command.push("-name", name);
    });
    command.push(")", "-prune", "-o", "-name", ".git", "-print0", "-prune");
    return command;
}
