// Logger.qml - Centralize optional development diagnostics.
import "../../JS/Helpers/Config.js" as Config
import QtQml
pragma Singleton

QtObject {
    property bool isDevMode: Config.isDevMode
    property var sink: function(level, scope, message) {
        (level === "error" ? console.warn : console.info)("[Dev Launcher/" + scope + "]", message);
    }

    // The logger alone decides whether a diagnostic reaches the configured sink.
    function write(level, scope, message) {
        if (!isDevMode || !sink) return;
        try { sink(level, scope, message); }
        catch (failure) { /* A diagnostic must never interrupt plugin work. */ }
    }

    // Allow an integration test to capture output without changing normal logging.
    function configure(settings) {
        const changes = settings || {};
        if (changes.isDevMode !== undefined) isDevMode = !!changes.isDevMode;
        if (changes.sink !== undefined) sink = changes.sink;
    }

    function debug(scope, message) { write("debug", scope, message); }
    function error(scope, message) { write("error", scope, message); }
}
