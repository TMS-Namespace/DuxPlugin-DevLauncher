// DataStorage.test.qml - Exercise damaged settings backup and storage write failures.
// Rules: Runs in the offscreen shell; a damaged list must be backed up before a corrected list replaces it, and a failed backup must keep the original list.
import QtQuick
import qs.Common as HostCommon
import qs.Services as HostServices
import "../../../../src/QML/Services" as Services

QtObject {
    required property var fixture

    // Preserve malformed lists before allowing a corrected list to replace them.
    function checkDamagedSettings() {
        const original = ["/tmp/root", "/tmp/root/nested"];
        fixture.settings.folders = original;
        Services.DataStorage.configure(fixture.testPluginService);
        const previousMessages = HostServices.ToastService.messages.length;
        Services.DataStorage.load("folders", []);
        if (!fixture.expect(HostServices.ToastService.messages.length === previousMessages + 1, "damaged settings were not reported")) return false;
        const diagnostics = [];
        Services.Logger.configure({ isDevMode: true, sink: function(level, scope, message) { diagnostics.push(message); } });
        HostCommon.SettingsData.failingKey = "damagedSettingsBackup";
        if (!fixture.expect(!Services.DataStorage.save("folders", ["/tmp/root"]), "save succeeded without a backup")) return false;
        Services.Logger.configure({ isDevMode: false });
        if (!fixture.expect(diagnostics.some(function(message) { return message.includes("simulated settings write failure"); }), "storage exception lost its diagnostic detail")) return false;
        if (!fixture.expect(fixture.settings.folders.length === 2, "backup failure discarded the original list")) return false;
        HostCommon.SettingsData.failingKey = "";
        if (!fixture.expect(Services.DataStorage.save("folders", ["/tmp/root"]), "corrected list could not be saved")) return false;
        if (!fixture.expect(JSON.stringify(fixture.settings.damagedSettingsBackup.folders[0]) === JSON.stringify(original), "saved backup does not match the original")) return false;
        if (!fixture.expect(fixture.settings.folders.length === 1, "corrected list was not saved")) return false;
        fixture.settings.resultsLimit = 999;
        if (!fixture.expect(Services.DataStorage.save("resultsLimit", 100), "corrected numeric setting could not be saved")) return false;
        const saved = fixture.expect(fixture.settings.damagedSettingsBackup.resultsLimit[0] === 999, "invalid numeric setting was not backed up");
        Services.ErrorHandler.lastNotificationAt = 0;
        return saved;
    }

    // A backup container that cannot be read is kept under "unreadable", and the corrected list still saves.
    function checkCorruptBackupIsKept() {
        fixture.settings.folders = ["/tmp/root", "/tmp/root/nested"];
        fixture.settings.damagedSettingsBackup = "corrupt text";
        Services.DataStorage.configure(fixture.testPluginService);
        if (!fixture.expect(Services.DataStorage.save("folders", ["/tmp/root"]), "a corrupt backup blocked the corrected save")) return false;
        const backup = fixture.settings.damagedSettingsBackup;
        if (!fixture.expect(JSON.stringify(backup.unreadable) === JSON.stringify(["corrupt text"]), "the corrupt backup was overwritten: " + JSON.stringify(backup))) return false;
        return fixture.expect(JSON.stringify(backup.folders) === JSON.stringify([["/tmp/root", "/tmp/root/nested"]]) && fixture.settings.folders.length === 1,
            "the damaged list was not preserved under its key");
    }

    // Entries saved before installation types existed get their provider's default when they are loaded; saved entries keep theirs.
    function checkInstallationDefaultsOnLoad() {
        const previousProviders = fixture.settings.providers;
        Services.DataStorage.configure(fixture.testPluginService);
        fixture.settings.providers = [
            { id: fixture.firstIdentifier, type: "zed", name: "Zed", config: fixture.fixtureRoot + "/Zed", executable: "/usr/bin/flatpak", extraArguments: [] },
            { id: fixture.secondIdentifier, type: "vscode", installationType: "snap", name: "Code", config: fixture.fixtureRoot + "/Code", executable: "code", extraArguments: [] }
        ];
        const loaded = Services.DataStorage.load("providers", []);
        fixture.settings.providers = previousProviders;
        return fixture.expect(loaded.length === 2 && loaded[0].installationType === "flatpak" && loaded[1].installationType === "snap",
            "older provider entries did not get their default installation type: " + JSON.stringify(loaded));
    }
}
