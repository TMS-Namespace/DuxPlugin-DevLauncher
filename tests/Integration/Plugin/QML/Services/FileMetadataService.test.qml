// FileMetadataService.test.qml - Redraws reuse expired metadata; a new search can retry it.
import "../../../../../src/Plugin/QML/Services" as Services
import QtQuick
import qs.DCommon.Common

QtObject {
    id: checks

    required property var fixture
    property int requests: 0
    readonly property QtObject fileService: QtObject {
        property bool connected: true

        // A failed lookup is deliberately expired below to model a later redraw.
        function stat(path, callback) {
            checks.requests++;
            callback({
                "error": "unavailable"
            });
        }

    }

    // Even an expired failed lookup cannot start a retry loop through metadataChanged and getItems.
    function checkRedrawKeepsCachedMetadata() {
        const previousFiles = Host.files;
        const service = Services.FileMetadataService;
        const path = fixture.fixtureRoot + "/metadata-retry.js";
        const items = [{
            "path": path,
            "kind": "file"
        }];
        try {
            Host.files = fileService;
            requests = 0;
            service.request(items, true);
            if (!fixture.expect(requests === 1, "an initial metadata lookup did not start"))
                return false;

            service.pathCache[path].expiresAt = 0;
            service.request(items, false);
            if (!fixture.expect(requests === 1, "a redraw retried expired metadata"))
                return false;

            service.request(items, true);
            if (!fixture.expect(requests === 2, "a new query could not retry expired metadata"))
                return false;

            service.request([{
                "path": "vscode-remote://ssh-remote+host/project",
                "kind": "folder"
            }], true);
            let date = -1;
            service.modifiedAt("vscode-remote://ssh-remote+host/project", function(value) {
                date = value;
            });
            return fixture.expect(requests === 2 && date === 0, "a remote item was sent to the local metadata service");
        } finally {
            Host.files = previousFiles;
            delete service.pathCache[path];
            service.pathCount--;
            service.wanted = ({
            });
        }
    }

}
