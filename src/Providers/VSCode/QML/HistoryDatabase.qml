// HistoryDatabase.qml - Read one VS Code history value through Qt's SQLite support.
import QtQuick
import QtQuick.LocalStorage

QtObject {
    // Attach an existing database only for a query, then release it.
    function read(path, key) {
        if (!path.startsWith("/") || path.indexOf("\u0000") >= 0)
            return "";

        const database = LocalStorage.openDatabaseSync("DevLauncherHistory", "1.0", "Read IDE history", 1024);
        const escapedPath = path.replace(/'/g, "''");
        let attached = false;
        let value = "";
        try {
            database.transaction(function(transaction) {
                transaction.executeSql("PRAGMA query_only=ON");
                transaction.executeSql("ATTACH DATABASE '" + escapedPath + "' AS ideHistory");
                attached = true;
                const result = transaction.executeSql("SELECT value FROM ideHistory.ItemTable WHERE key=? LIMIT 1", [key]);
                if (result.rows.length)
                    value = result.rows.item(0).value || "";

            });
        } finally {
            if (attached)
                database.transaction(function(transaction) {
                transaction.executeSql("DETACH DATABASE ideHistory");
            });
        }
        return value;
    }

}
