// ScanState.qml - Shared scan status and requests: the last scan time, its source errors, refresh requests, and saved setting changes.
// Rules: The one shared place where the launcher, the scan, and the settings page exchange state; it holds values and emits signals, and never reads or writes storage.
pragma Singleton
import QtQml

// The shared scan state. Each value is kept here and each change is announced with a signal, so no surface needs Dux global memory.
QtObject {
    id: root

    // When the last scan finished, in milliseconds since the epoch; zero until a scan finishes or after its time is invalidated.
    property double scannedAt: 0
    // The source errors published by the last scan, read by the settings page.
    property var providerErrors: []
    // When the launcher last asked for a refresh; each request is announced by refreshRequested.
    property double refreshRequestedAt: 0
    // When a setting that changes scan or launcher results was last saved.
    property double settingsRevision: 0

    // Emitted for each refresh request so the scan can start, or queue its work behind a running scan.
    signal refreshRequested()
    // Emitted when a setting that affects scan or launcher results was saved.
    signal settingsChanged()
    // Emitted when a scan has finished and published its results.
    signal scanPublished()

    // Record a refresh request made by the launcher at the given time.
    function requestRefresh(now) {
        refreshRequestedAt = now;
        refreshRequested();
    }

    // Record that a setting affecting results was saved at the given time.
    function announceSettingsChange(now) {
        settingsRevision = now;
        settingsChanged();
    }

    // Publish the time and source errors of a finished scan.
    function publishScan(now, errors) {
        scannedAt = now;
        providerErrors = errors;
        scanPublished();
    }

    // Forget the last scan time, so the next search starts a scan.
    function invalidateScan() {
        scannedAt = 0;
    }

}
