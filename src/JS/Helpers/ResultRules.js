// ResultRules.js - Validate the number of launcher results shown after searching.
.pragma library
.import "Config.js" as Config

// Accept only the result counts offered by the settings dropdown.
function valid(value) {
    const text = String(value === undefined || value === null ? "" : value).trim();
    return /^\d+$/.test(text) && Config.resultLimitOptions.includes(Number(text));
}

// Use the configured count, or the default when no valid count was saved.
function limit(value) {
    return valid(value) ? Number(value) : Config.defaultResultsLimit;
}
