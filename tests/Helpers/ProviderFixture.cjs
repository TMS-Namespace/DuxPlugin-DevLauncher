// ProviderFixture.cjs - Supply two stable IDE declarations for pure rule tests.
// Rules: Shared helper module; it builds fixtures from the real provider sources and must add no test assertions.
const source = require("./LoadSource.cjs");
const codeId = "4c8620ac-08b2-4f28-bcd7-cbe29a37b597";
const codiumId = "78dc1b4e-1d72-45da-b49b-45379f0735ec";
const api = source("Providers/VSCode/JS/VSCodeApi.js").create();
const properties = source("Providers/VSCode/JS/VSCodeProperties.js").create({ installationType: "native", id: codeId, name: "Code", config: "~/.config/Code", executable: "code", extraArguments: ["--reuse-window", "--profile", "Work"] });
const records = api.parseHistory({ history: { entries: [{ folderUri: "file:///tmp/project" }, { folderUri: "vscode-remote://host/project" }], files2: [{ fileUri: "file:///tmp/file.js" }] }, modifiedAt: 100 }, properties);
const configured = source("Helpers/ConfigurationRules.js").providers([
    { installationType: "native", id: codeId, type: "vscode", name: "Code", config: "~/.config/Code", executable: "code", extraArguments: ["--reuse-window"] },
    { installationType: "native", id: codiumId, type: "vscode", name: "VSCodium", config: "~/.config/VSCodium", executable: "codium", extraArguments: [] }
]);
module.exports = { codeId, codiumId, api, properties, records, configured };
