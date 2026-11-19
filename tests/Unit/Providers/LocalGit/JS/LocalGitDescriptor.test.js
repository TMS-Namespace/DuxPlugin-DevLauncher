// LocalGitDescriptor.test.js - Check the folder source declares one folder field and that it can scan but not launch.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const descriptors = source("Contracts/ProviderDescriptor.js");
const descriptor = source("Providers/LocalGit/JS/LocalGitDescriptor.js").create();

assert.equal(descriptors.validate(descriptor).typeId, "localgit");
assert.equal(descriptor.launchable, false);
assert.equal(descriptor.scansFolders, true);
assert.deepEqual(
    Array.from(descriptor.fields, (field) => field.key),
    ["folder"]
);
assert.equal(descriptor.fields[0].kind, "directory");
