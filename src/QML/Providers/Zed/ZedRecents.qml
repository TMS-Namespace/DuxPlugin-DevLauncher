// ZedRecents.qml - Read Zed's workspace and file history through its own SQLite database.
// Rules: The database file is checked before it is attached, so SQLite never creates an empty file, and only one read runs at a time.
import QtQuick
import QtQuick.LocalStorage
import Quickshell
import Quickshell.Io
import "../../../JS/Helpers/PathRules.js" as PathRules
import "../../../JS/Providers/Zed/ZedConstants.js" as Constants

// The Zed history reader: it checks the database file exists, then reads its workspace and file rows in one query-only pass.
QtObject {
    id: root
    property bool running: false

    property var currentApi: null
    property var currentProperties: null
    // The callback that receives the records once the read finishes.
    property var completed: null
    // The expanded path of the Zed database for the current read.
    property string databasePath: ""

    // Check the database exists before attaching it, because SQLite otherwise creates a missing file.
    function read(api, properties, callback) {
        if (running) return false;
        running = true;
        currentApi = api;
        currentProperties = properties;
        completed = callback;
        databasePath = PathRules.expand(api.sources(properties)[0].path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        checker.command = ["timeout", Constants.CHECK_TIMEOUT, "test", "-f", databasePath];
        checker.running = true;
        return true;
    }

    // A missing or unreadable database is a failed source, so the previous cache remains intact.
    function finish(exitCode) {
        if (exitCode !== 0) {
            running = false;
            completed([], "Could not read Zed history. Check its data folder.", "Zed history database is unavailable", false);
            return;
        }
        let records;
        try {
            records = currentApi.parseHistory({ rows: readDatabase(databasePath) }, currentProperties);
        } catch (caughtError) {
            running = false;
            completed([], "Could not read Zed history. Check its data folder.", String(caughtError), false);
            return;
        }
        running = false;
        completed(records, "", "", true);
    }

    // The one-shot check that the history database exists before the read starts.
    property Process checker: Process {
        onExited: function(exitCode) { root.finish(exitCode); }
    }

    // Attach with SQLite query-only mode for the duration of the query and release it even if the schema is unsupported.
    function readDatabase(path) {
        if (!path.startsWith("/") || path.includes("\u0000")) return [];
        const database = LocalStorage.openDatabaseSync("DevLauncherZedHistory", "1.0", "Read Zed history", 1024);
        let attached = false;
        const records = [];
        try {
            database.transaction(function(transaction) {
                transaction.executeSql("PRAGMA query_only=ON");
                transaction.executeSql("ATTACH DATABASE ? AS zedHistory", [path]);
                attached = true;
                const workspaces = transaction.executeSql("SELECT paths, timestamp FROM zedHistory.workspaces WHERE remote_connection_id IS NULL AND paths IS NOT NULL ORDER BY timestamp DESC LIMIT ?", [Constants.MAX_HISTORY_ROWS]);
                for (let i = 0; i < workspaces.rows.length; i++) {
                    const workspace = workspaces.rows.item(i);
                    for (const entry of String(workspace.paths || "").split("\n")) if (entry) records.push({ path: entry, kind: "folder", timestamp: workspace.timestamp });
                }
                const files = transaction.executeSql("SELECT CAST(editors.path AS TEXT) AS path, workspaces.timestamp AS timestamp FROM zedHistory.editors JOIN zedHistory.workspaces USING(workspace_id) WHERE workspaces.remote_connection_id IS NULL AND editors.path IS NOT NULL ORDER BY workspaces.timestamp DESC LIMIT ?", [Constants.MAX_HISTORY_ROWS]);
                for (let i = 0; i < files.rows.length; i++) {
                    const file = files.rows.item(i);
                    records.push({ path: file.path, kind: "file", timestamp: file.timestamp });
                }
                const navigation = transaction.executeSql("SELECT CAST(recent_navigation_history.path AS TEXT) AS path, workspaces.timestamp AS timestamp FROM zedHistory.recent_navigation_history JOIN zedHistory.workspaces USING(workspace_id) WHERE workspaces.remote_connection_id IS NULL ORDER BY workspaces.timestamp DESC LIMIT ?", [Constants.MAX_HISTORY_ROWS]);
                for (let i = 0; i < navigation.rows.length; i++) {
                    const file = navigation.rows.item(i);
                    records.push({ path: file.path, kind: "file", timestamp: file.timestamp });
                }
            });
        } finally {
            if (attached) database.transaction(function(transaction) { transaction.executeSql("DETACH DATABASE zedHistory"); });
        }
        return records;
    }
}
