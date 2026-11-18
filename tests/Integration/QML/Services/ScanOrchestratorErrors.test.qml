// ScanOrchestratorErrors.test.qml - Check that IDE scan errors are published for settings and never toasted.
import QtQuick
import qs.Services as DuxServices
import "../../../../src/QML/Services" as Services

QtObject {
    required property var fixture
    readonly property var pluginService: fixture.testPluginService

    // An IDE's scan error is published for its settings row and is never toasted, because the scan repeats.
    function checkProviderErrorsStayOutOfToast() {
        const component = Qt.createComponent("file://" + fixture.pluginRoot + "/src/QML/Services/ScanOrchestrator.qml");
        if (!fixture.expect(component.status === Component.Ready, "orchestrator load " + component.errorString())) return false;
        const orchestrator = component.createObject(null, { pluginService: pluginService });
        const toastsBefore = DuxServices.ToastService.messages.length;
        orchestrator.providerErrors = [{ providerId: fixture.firstIdentifier, message: "IDE history read did not finish." }];
        orchestrator.publish();
        const published = pluginService.getGlobalVar("devLauncher", "providerErrors", []);
        const toastsAfter = DuxServices.ToastService.messages.length;
        orchestrator.destroy();
        const shown = published.some(function(entry) { return entry.providerId === fixture.firstIdentifier && entry.message === "IDE history read did not finish."; });
        return fixture.expect(toastsAfter === toastsBefore, "an IDE scan error was toasted")
            && fixture.expect(shown, "the IDE scan error was not published for settings: " + JSON.stringify(published));
    }

    // A source whose read fails keeps the items it reported before; only a successful read replaces them, even when empty.
    function checkFailedReadKeepsItems() {
        const cache = Services.RecentItemsCache;
        const sourceId = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
        cache.reconcileSource(sourceId, "Failing source", [{ path: "/tmp/kept.js", kind: "file", openedAt: Date.now() }], true, Date.now());
        cache.reconcileSource(sourceId, "Failing source", [], false, Date.now());
        const kept = cache.entries["/tmp/kept.js"] !== undefined;
        cache.reconcileSource(sourceId, "Failing source", [], true, Date.now());
        const dropped = cache.entries["/tmp/kept.js"] === undefined;
        return fixture.expect(kept && dropped, "a failed read changed the cache, or a successful empty read kept items");
    }
}
