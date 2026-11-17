// LauncherLaunch.test.qml - Check missing IDE feedback without recording usage.
import QtQuick
import qs.Services as DuxServices
import "../../../src/QML/Services" as Services

QtObject {
    id: checks
    required property var fixture
    readonly property var root: fixture
    readonly property var expect: fixture.expect

    // A result whose IDE facade is gone must report why nothing launched and must not record usage.
    function checkMissingIdeLaunch() {
        root.launcher = root.launcherComponent.createObject(null, { pluginService: root.testPluginService });
        const messagesBefore = DuxServices.ToastService.messages.length;
        root.launcher.executeItem({ id: "/tmp/regression-item", name: "regression-item", path: "/tmp/regression-item", kind: "file", provider: root.unknownIdentifier });
        const messages = DuxServices.ToastService.messages;
        return expect(messages.length === messagesBefore + 1 && messages[messages.length - 1].includes("not available"),
            "launch with a missing IDE gave no feedback: " + messages.length + " " + messagesBefore)
            && expect(Object.keys(root.settings.usage).length === 0, "launch with a missing IDE recorded usage");
    }

    // Each alias must select its own installation ID, even when both installations use one IDE type.
    function checkIdeAliasActions() {
        const previousHandlers = Services.ProvidersManager.handlers;
        const previousProviders = root.settings.providers;
        const previousUsage = root.settings.usage;
        const launched = [];
        try {
            root.settings.providers = [
                { id: root.firstIdentifier, type: "vscode", name: "Office IDE" },
                { id: root.secondIdentifier, type: "vscode", name: "Personal IDE" }
            ];
            const handlers = {};
            handlers[root.firstIdentifier] = { launch: function(path) { launched.push({ id: root.firstIdentifier, path: path }); } };
            handlers[root.secondIdentifier] = { launch: function(path) { launched.push({ id: root.secondIdentifier, path: path }); } };
            Services.ProvidersManager.handlers = handlers;
            const item = { path: "/tmp/alias-action", kind: "folder" };
            const actions = root.launcher.getContextMenuActions(item);
            const office = actions.find(function(action) { return action.text === "Open with Office IDE"; });
            const personal = actions.find(function(action) { return action.text === "Open with Personal IDE"; });
            if (!expect(office && personal, "configured IDE aliases were missing from result actions")) return false;
            office.action();
            personal.action();
            return expect(launched.length === 2 && launched[0].id === root.firstIdentifier && launched[1].id === root.secondIdentifier && launched.every(function(launch) { return launch.path === item.path; }), "IDE alias action selected the wrong installation");
        } finally {
            Services.ProvidersManager.handlers = previousHandlers;
            root.settings.providers = previousProviders;
            root.settings.usage = previousUsage;
        }
    }
}
