// ScanErrorRules.test.js - Check the scan error text, the limit message, and the error an IDE row shows.
const assert = require("node:assert/strict");
const source = require("../../../Helpers/LoadSource.cjs");
const scanErrors = source("Helpers/ScanErrorRules.js");
assert.match(scanErrors.repository(124, ""), /timed out/);
assert.match(scanErrors.repository(1, "find: Permission denied"), /permission denied/);
assert.match(scanErrors.repository(1, "No such file or directory"), /no longer exists/);
assert.match(scanErrors.forFolder("/home/test/projects", 1, "Permission denied"), /Repository folder \/home\/test\/projects:.*permission denied/);
assert.match(scanErrors.limitReached("/home/test/later", 500), /Repository folder \/home\/test\/later has more than 500 repositories.*only the first 500/);
// An IDE's row shows only the error recorded for that IDE.
assert.equal(scanErrors.forProvider("id-one", [{ providerId: "id-one", message: "History read failed." }]), "History read failed.");
assert.equal(scanErrors.forProvider("id-two", [{ providerId: "id-one", message: "History read failed." }]), "");
