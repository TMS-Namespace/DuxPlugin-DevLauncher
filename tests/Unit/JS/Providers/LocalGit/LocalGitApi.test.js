// LocalGitApi.test.js - Check repository records from find output, and that a folder source refuses launching and arguments.
// Rules: Runs in plain node; a folder source must never launch items or accept extra arguments, and it probes only find.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const api = source("Providers/LocalGit/LocalGitApi.js").create();
const properties = source("Providers/LocalGit/LocalGitProperties.js").create({ installationType: "native", id: "9f8e7d6c-5b4a-4c3b-8a2d-1e0f9a8b7c6d", type: "localgit", name: "Folder 9f8e7d", folder: "/tmp/projects", depth: 3 });

// Git roots come out of find as their .git paths; each record carries this folder's identity.
const records = api.parseHistory({ output: "/tmp/projects/a/.git\u0000/tmp/projects/b/.git\u0000" }, properties);
assert.equal(records.length, 2);
assert.equal(records[0].path, "/tmp/projects/a");
assert.equal(records[0].kind, "repository");
assert.equal(records[0].provider, properties.providerId);
assert.equal(records[0].providerName, "Folder 9f8e7d");

// A folder source never opens items.
assert.throws(() => api.launchArgs("/tmp/projects/a", properties, "/home/test"), error => error.code === "providerConfig" && error.details === "launchArgs");

// The validator probes find, and the folder itself is the only path that must exist.
assert.deepEqual(Array.from(api.validationArgs(properties, "/home/test")), ["find", "--version"]);
assert.deepEqual(Array.from(api.validationPaths(properties, "/home/test", "")).map(target => target.path), ["/tmp/projects"]);
assert.equal(api.validateExecutable("find (GNU findutils) 4.10.0", properties), true);
assert.throws(() => api.validateExecutable("some other tool 1.0", properties), error => error.code === "providerConfig");

// No additional arguments are accepted, and a folder with no repositories is still valid.
assert.equal(api.validateArguments("", "", properties), true);
assert.throws(() => api.validateArguments("", "", Object.assign({}, properties, { extraArguments: ["--follow"] })), error => error.code === "providerConfig");
assert.equal(api.validateHistory([], properties), true);
