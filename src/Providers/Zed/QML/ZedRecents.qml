// ZedRecents.qml - Read Zed's workspace and file history through its own SQLite database.
// Rules: The database file is checked with a Dux stat before it is attached, so SQLite never creates an empty file, and only one read runs at a time.
import "../../../Plugin/JS/Helpers/PathRules.js" as PathRules
import "../JS/ZedConstants.js" as Constants
import QtQuick
import QtQuick.LocalStorage
import Quickshell

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
    // The plugin's file service stat, which checks the database is a file before the read starts.
    property var statPath: null

    // Check the database exists before attaching it, because SQLite otherwise creates a missing file.
    function read(api, properties, callback, statFunction) {
        if (running)
            return false;

        running = true;
        currentApi = api;
        currentProperties = properties;
        completed = callback;
        statPath = statFunction;
        databasePath = PathRules.expand(api.sources(properties)[0].path, Quickshell.env("HOME"), Quickshell.env("XDG_CONFIG_HOME"));
        if (!statPath) {
            finish(null);
            return true;
        }
        statPath(databasePath, function(result) {
            root.finish(result);
        });
        return true;
    }

    // A file answer is the only one that opens the database; a missing, unreadable, or directory path is a failed source,
    // so the previous cache remains intact.
    function finish(result) {
        const entry = result && !result.error ? (result.entry || result) : null;
        if (!entry || entry.isDir) {
            running = false;
            completed([], "Could not read Zed history. Check its data folder.", "Zed history database is unavailable", false);
            return ;
        }
        let records;
        try {
            records = currentApi.parseHistory({
                "rows": readDatabase(databasePath)
            }, currentProperties);
        } catch (caughtError) {
            running = false;
            completed([], "Could not read Zed history. Check its data folder.", String(caughtError), false);
            return ;
        }
        running = false;
        completed(records, "", "", true);
    }

    // Attach with SQLite query-only mode for the duration of the query and release it even if the schema is unsupported.
    function readDatabase(path) {
        if (!path.startsWith("/") || path.includes("\u0000"))
            return [];

        const database = LocalStorage.openDatabaseSync("DevLauncherZedHistory", "1.0", "Read Zed history", 1024);
        let attached = false;
        const records = [];
        try {
            database.transaction(function(transaction) {
                transaction.executeSql("PRAGMA query_only=ON");
                transaction.executeSql("ATTACH DATABASE ? AS zedHistory", [path]);
                attached = true;
                const connections = {
                };
                const tables = transaction.executeSql("SELECT name FROM zedHistory.sqlite_master WHERE type='table' AND name='remote_connections'");
                if (tables.rows.length) {
                    const rows = transaction.executeSql("SELECT id, kind, host, port, user FROM zedHistory.remote_connections");
                    for (let i = 0; i < rows.rows.length; i++) {
                        const connection = rows.rows.item(i);
                        connections[connection.id] = connection;
                    }
                }
                const workspaces = transaction.executeSql("SELECT paths, timestamp, remote_connection_id AS remoteId FROM zedHistory.workspaces WHERE paths IS NOT NULL ORDER BY timestamp DESC LIMIT ?", [Constants.MAX_HISTORY_ROWS]);
                for (let i = 0; i < workspaces.rows.length; i++) {
                    const workspace = workspaces.rows.item(i);
                    for (const entry of String(workspace.paths || "").split("\n")) if (entry) {
                        records.push({
                            "path": entry,
                            "kind": "folder",
                            "timestamp": workspace.timestamp,
                            "remoteId": workspace.remoteId,
                            "connection": connections[workspace.remoteId]
                        });
                    }
                }
                const files = transaction.executeSql("SELECT CAST(editors.path AS TEXT) AS path, workspaces.timestamp AS timestamp, workspaces.remote_connection_id AS remoteId FROM zedHistory.editors JOIN zedHistory.workspaces USING(workspace_id) WHERE editors.path IS NOT NULL ORDER BY workspaces.timestamp DESC LIMIT ?", [Constants.MAX_HISTORY_ROWS]);
                for (let i = 0; i < files.rows.length; i++) {
                    const file = files.rows.item(i);
                    records.push({
                        "path": file.path,
                        "kind": "file",
                        "timestamp": file.timestamp,
                        "remoteId": file.remoteId,
                        "connection": connections[file.remoteId]
                    });
                }
                const navigation = transaction.executeSql("SELECT CAST(recent_navigation_history.path AS TEXT) AS path, workspaces.timestamp AS timestamp, workspaces.remote_connection_id AS remoteId FROM zedHistory.recent_navigation_history JOIN zedHistory.workspaces USING(workspace_id) WHERE recent_navigation_history.path IS NOT NULL ORDER BY workspaces.timestamp DESC LIMIT ?", [Constants.MAX_HISTORY_ROWS]);
                for (let i = 0; i < navigation.rows.length; i++) {
                    const file = navigation.rows.item(i);
                    records.push({
                        "path": file.path,
                        "kind": "file",
                        "timestamp": file.timestamp,
                        "remoteId": file.remoteId,
                        "connection": connections[file.remoteId]
                    });
                }
            });
        } finally {
            if (attached)
                database.transaction(function(transaction) {
                transaction.executeSql("DETACH DATABASE zedHistory");
            });
        }
        return records;
    }

}
