// ZedHistoryPath.js - Turn one Zed history row into a launchable path or URI, or refuse a connection that cannot be launched.
.pragma library
.import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
// Rules: Pure path reconstruction: no process, QML types or logging; an unsupported connection gives an empty string.

// Give remote rows a stable identity that cannot be mistaken for a local path.
function historyPath(row) {
    if (row.remoteId === undefined || row.remoteId === null) {
        const path = PathRules.resourcePath(row.path);
        return PathRules.resourceType(path) === "remote" && !path.startsWith("ssh://") ? "" : path;
    }
    const connection = row.connection || {};
    const path = String(row.path || "");
    if (!path.startsWith("/")) return "";
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    if (connection.kind === "ssh" && connection.host) {
        const host = String(connection.host);
        const portNumber = connection.port ? Number(connection.port) : 0;
        if (
            /[\s/?#@]/.test(host) ||
            (connection.port && (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535))
        )
            return "";
        const user = connection.user ? encodeURIComponent(connection.user) + "@" : "";
        const address = host.includes(":") && !host.startsWith("[") ? "[" + host + "]" : host;
        const port = portNumber ? ":" + portNumber : "";
        return "ssh://" + user + address + port + encoded;
    }
    // No documented launch URI can be built for this connection.
    return "";
}
