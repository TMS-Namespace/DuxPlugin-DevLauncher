// NeoVimRecents.test.qml - Read a generated ShaDa file through the NeoVim entry point, with a real file read and a real find process.
import "../../../../../src/Plugin/QML/Services" as Services
import "../../../../../src/Providers/NeoVim/JS/NeoVimApi.js" as Api
import "../../../../../src/Providers/NeoVim/JS/NeoVimProperties.js" as Properties
import "../../../../../src/Providers/NeoVim/QML/Integration" as Entry
// Rules: Runs inside the regression harness; it must report folders and files with their kinds, drop remote marks, and fail cleanly when the state folder is absent.
import QtQuick
import Quickshell

QtObject {
    id: checks

    // The shared fixture of the regression harness; it provides the fixture root and the expectation reporter.
    required property var fixture
    readonly property var entry: Entry.NeoVimProvider {
    }

    property var reader: null

    // Build one NeoVim installation pointing at the given state folder, launched through a terminal command.
    function propertiesFor(stateFolder) {
        return Properties.create({
            "installationType": "native",
            "id": "2ec31f6d-69ef-426e-b640-44cef0b5a640",
            "name": "NeoVim",
            "executable": "/usr/bin/gnome-terminal --",
            "config": stateFolder,
            "extraArguments": []
        });
    }

    // The registry must list NeoVim, and its facade must expose the declared command and the three declared paths.
    function checkRegistry() {
        const configuration = {
            "installationType": "native",
            "id": "2ec31f6d-69ef-426e-b640-44cef0b5a640",
            "type": "neovim",
            "name": "NeoVim",
            "executable": "/usr/bin/gnome-terminal --",
            "config": fixture.fixtureRoot + "/NeoVim/state",
            "extraArguments": []
        };
        const descriptor = Services.ProvidersManager.descriptorFor("neovim");
        const handler = Services.ProvidersManager.candidate(configuration);
        const commandText = JSON.stringify(handler.validationArgs());
        const pathLabels = handler.validationPaths().map(function(target) {
            return target.label;
        });
        handler.properties.destroy();
        handler.destroy();
        return fixture.expect(descriptor.fields.length === 2 && commandText === JSON.stringify(["/usr/bin/gnome-terminal"]) && pathLabels.indexOf("NeoVim state folder") >= 0 && pathLabels.indexOf("NeoVim ShaDa history file") >= 0, "NeoVim is not registered with the declared command and paths: " + commandText + " " + JSON.stringify(pathLabels));
    }

    // Launch one marked file through the facade, so the real detached process receives the terminal command's arguments.
    function launchThroughFacade() {
        const configuration = {
            "installationType": "native",
            "id": "2ec31f6d-69ef-426e-b640-44cef0b5a640",
            "type": "neovim",
            "name": "NeoVim",
            "executable": fixture.fixtureRoot + "/bin/gnome-terminal --",
            "config": fixture.fixtureRoot + "/NeoVim/state",
            "extraArguments": []
        };
        const handler = Services.ProvidersManager.candidate(configuration);
        handler.launch(fixture.fixtureRoot + "/NeoVim/project/main.lua", "file");
        handler.properties.destroy();
        handler.destroy();
    }

    // Start the two reads in turn: a real state folder must yield its marks, and an absent one must fail without changing the cache.
    function start(next) {
        const project = fixture.fixtureRoot + "/NeoVim/project";
        reader = entry.readerType.createObject(null);
        reader.read(Api.create(), propertiesFor(fixture.fixtureRoot + "/NeoVim/state"), function(records, message, details, succeeded) {
            const folder = records.find(function(record) {
                return record.path === project;
            });
            const file = records.find(function(record) {
                return record.path === project + "/main.lua";
            });
            const missing = records.find(function(record) {
                return record.path === project + "/missing.md";
            });
            const remote = records.some(function(record) {
                return record.path.indexOf("scp://") === 0;
            });
            if (!checks.fixture.expect(succeeded === true && message === "", "NeoVim read failed: " + details))
                return ;

            if (!checks.fixture.expect(folder && folder.kind === "folder", "the marked folder was not reported as a folder"))
                return ;

            if (!checks.fixture.expect(file && file.kind === "file" && file.openedAt === Number("1700000100") * 1000, "the marked file kind or time is wrong"))
                return ;

            if (!checks.fixture.expect(missing && missing.kind === "file", "a marked path that no longer exists must stay for the plugin's own existence check"))
                return ;

            if (!checks.fixture.expect(!remote && records.length === 3, "remote marks must not be reported; found " + records.length))
                return ;

            reader.read(Api.create(), propertiesFor(fixture.fixtureRoot + "/NeoVim/absent"), function(ignored, failureMessage, failureDetails, failureSucceeded) {
                if (!checks.fixture.expect(failureSucceeded === false && failureMessage !== "", "an absent NeoVim state folder looked like a successful read"))
                    return ;

                if (!checkRegistry())
                    return ;

                launchThroughFacade();
                reader.destroy();
                reader = null;
                next();
            });
        });
    }

}
