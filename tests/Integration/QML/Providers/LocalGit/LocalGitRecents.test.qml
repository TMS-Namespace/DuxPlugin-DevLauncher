// LocalGitRecents.test.qml - Check the folder source's reader through its entry point: repository records, the per-folder limit, and an unreadable folder.
import QtQuick
import "../../../../../src/QML/Providers/LocalGit/Integration" as Entry
import "../../../../../src/JS/Providers/LocalGit/LocalGitApi.js" as LocalGitApi
import "../../../../../src/JS/Providers/LocalGit/LocalGitProperties.js" as LocalGitProperties

QtObject {
    required property var fixture
    readonly property var entry: Entry.LocalGitProvider {}

    // Scan the many-repository folder, then an unreadable folder; each step continues only when its callback runs.
    // The pass marker is printed last, after both answers matched.
    function startReaderCheck() {
        const reader = entry.readerType.createObject(null);
        const manyProperties = LocalGitProperties.create({ id: fixture.secondIdentifier, name: "Folder 7b65f5", folder: fixture.fixtureRoot + "/many-root", depth: 3 });
        reader.read(LocalGitApi.create(), manyProperties, function(records, message) {
            if (!fixture.expect(records.length === 500 && message.includes("only the first 500"), "the per-folder limit did not apply: " + records.length + " " + message)) return;
            const blockedProperties = LocalGitProperties.create({ id: fixture.thirdIdentifier, name: "Folder 8c76a6", folder: fixture.fixtureRoot + "/blocked-root", depth: 3 });
            reader.read(LocalGitApi.create(), blockedProperties, function(blockedRecords, blockedMessage) {
                if (!fixture.expect(blockedRecords.length === 0 && blockedMessage.includes("permission denied"), "an unreadable folder was not reported: " + blockedMessage)) return;
                console.warn("T:PASS regression fixes");
                Qt.quit();
            });
        });
    }
}
