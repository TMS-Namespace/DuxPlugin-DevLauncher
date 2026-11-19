// RepositoryNotificationRules.js - Select folder scan failures that deserve a user notification.
.pragma library

// Only a newly selected root can trigger a folder error notification.
function newlyAdded(previous, current) {
    return (current || []).filter(function (folder) {
        return !(previous || []).includes(folder);
    });
}

// Keep pending additions unique and drop folders removed before their scan begins.
function pending(previousPending, added, current) {
    const combined = (previousPending || []).concat(added || []);
    return combined.filter(function (folder, index) {
        return (current || []).includes(folder) && combined.indexOf(folder) === index;
    });
}

// Notification policy for scan errors of folder sources:
// - A folder that was just added gets its scan error as a toast, once, on its first scan.
// - Every other scan error (an existing folder that fails on later scans, a folder over the repository limit,
//   or an IDE that fails to read) is never toasted, because a scan runs again and again and would spam the user.
//   Those errors appear only in the settings page, next to the folder or IDE, and in the development log.
// Errors are matched by source identifier, so two folders with the same path are still told apart.
function messages(errors, newlySelectedIds) {
    return (errors || [])
        .filter(function (failure) {
            return (newlySelectedIds || []).includes(failure.providerId);
        })
        .map(function (failure) {
            return failure.message;
        });
}
