// RepositoryRules.js - Interpret bounded NUL-delimited find output as Git roots.
.pragma library
.import "PathRules.js" as PathRules

// Keep one normalized record per root, including Git worktrees with a .git file.
function fromFind(output, limit) {
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
