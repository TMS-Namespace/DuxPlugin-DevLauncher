// RepositoryNotificationRules.js - Select folder scan failures that deserve a user notification.
.pragma library

// Only a newly selected root can trigger a folder error notification.
function newlyAdded(previous, current) {
    return (current || []).filter(function(folder) { return !(previous || []).includes(folder); });
}

// Keep pending additions unique and drop folders removed before their scan begins.
function pending(previousPending, added, current) {
    const combined = (previousPending || []).concat(added || []);
    return combined.filter(function(folder, index) { return (current || []).includes(folder) && combined.indexOf(folder) === index; });
}

// Notification policy for folder scan errors:
// - A folder that was just added gets its scan error as a toast, once, on its first scan.
// - Every other folder error (an existing folder that fails on later scans, or a folder skipped by the repository cap)
//   is never toasted, because a scan runs again and again and would spam the user. Those errors appear only in the
//   settings folder list (see SettingsController.scanErrorFor) and in the development log.
function messages(errors, newlySelected) {
    return (errors || []).filter(function(failure) { return (newlySelected || []).includes(failure.path); }).map(function(failure) { return failure.message; });
}
