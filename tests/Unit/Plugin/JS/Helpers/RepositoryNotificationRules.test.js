// RepositoryNotificationRules.test.js - Check which new folders get a toast, and that errors are matched by source identifier.
const assert = require("node:assert/strict");
const source = require("../../../../Helpers/LoadSource.cjs");
const repositoryNotifications = source("Helpers/RepositoryNotificationRules.js");
assert.deepEqual(Array.from(repositoryNotifications.newlyAdded(["/old"], ["/old"])), []);
assert.deepEqual(Array.from(repositoryNotifications.newlyAdded(["/old"], ["/old", "/new"])), ["/new"]);
assert.deepEqual(Array.from(repositoryNotifications.pending(["/new"], ["/new", "/later"], ["/later"])), ["/later"]);
assert.deepEqual(Array.from(repositoryNotifications.messages([{ providerId: "old-id", message: "old error" }, { providerId: "new-id", message: "new error" }], ["new-id"])), ["new error"]);
