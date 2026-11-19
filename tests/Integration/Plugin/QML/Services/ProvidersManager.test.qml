// ProvidersManager.test.qml - Check that a repeated IDE identifier is refused with a clear message.
// Rules: Runs in the offscreen shell; a repeated identifier must be refused, and the duplicate-check path list must match the facade's list.
import "../../../../../src/Plugin/QML/Services" as Services
import QtQuick

QtObject {
    required property var fixture

    // Two saved entries with one identifier must load only the first; the second is reported as listed more than once.
    function checkDuplicateIdentifierRefused() {
        const configuration = {
            "installationType": "native",
            "id": fixture.firstIdentifier,
            "type": "vscode",
            "name": "Alpha",
            "config": fixture.fixtureRoot + "/Code",
            "executable": "code",
            "shared": "",
            "extraArguments": []
        };
        const duplicate = Object.assign({
        }, configuration, {
            "name": "Beta"
        });
        Services.ProvidersManager.reload([configuration, duplicate]);
        const failures = Services.ProvidersManager.loadErrors;
        return fixture.expect(failures.length === 1 && failures[0].userMessage === "This IDE is listed more than once. Remove the duplicate entry." && Services.ProvidersManager.handlerFor(fixture.firstIdentifier) !== null, "duplicate identifier was not refused with the listed-more-than-once message: " + failures.length);
    }

    // The facade-free path list used by duplicate checks must equal the facade's own list for the same declaration.
    function checkValidationPathsMatchFacade() {
        const configuration = {
            "installationType": "native",
            "id": fixture.secondIdentifier,
            "type": "vscode",
            "name": "Gamma",
            "config": fixture.fixtureRoot + "/Code",
            "executable": "code",
            "shared": "",
            "extraArguments": []
        };
        const declared = Services.ProvidersManager.validationPaths(configuration);
        const handler = Services.ProvidersManager.candidate(configuration);
        const facade = handler.validationPaths();
        handler.properties.destroy();
        handler.destroy();
        return fixture.expect(declared.length > 0 && JSON.stringify(declared) === JSON.stringify(facade), "declared validation paths differ from the facade: " + JSON.stringify(declared) + " vs " + JSON.stringify(facade));
    }

    // Only an IDE whose descriptor declares defaultEnabled is seeded into a new settings list; here that is VS Code alone.
    function checkDefaultsSeedDeclaredIdeOnly() {
        const types = Services.ProvidersManager.defaultConfigurations().map(function(configuration) {
            return configuration.type;
        });
        return fixture.expect(JSON.stringify(types) === JSON.stringify(["vscode"]), "defaults were seeded from the wrong IDEs: " + JSON.stringify(types));
    }

}
