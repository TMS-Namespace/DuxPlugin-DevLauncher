// FileStatusRules.js - Recognize definite missing-path errors from Dux file metadata.
.pragma library

// A temporary metadata error must not hide an existing launcher result.
function missing(result) {
    const code = String((result && result.code) || "").toLowerCase();
    const message = String((result && result.error) || "").toLowerCase();
    return code === "enoent" || code === "not_found" || /no such file|does not exist|not found/.test(message);
}
