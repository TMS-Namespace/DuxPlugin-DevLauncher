// DraftRules.js - Apply one edit to an IDE draft using only the provider's declared field rules.
.pragma library

// Return the draft with its alias trimmed. Validation, duplicate checks, and saving all use this one form.
function normalize(draft) {
    return Object.assign({}, draft, { name: String(draft.name || "").trim() });
}

// Compare two values the way a field declares: the whole value, or only the file name for an executable.
function same(field, left, right) {
    if (field.comparison === "basename") return String(left).split("/").pop() === String(right).split("/").pop();
    return left === right;
}

// Return the next draft. Moving a field away from its default clears each declared dependent that still holds its default.
// Moving it back to its default restores each dependent that was cleared, so the draft can become valid again.
function applyEdit(draft, defaults, descriptor, field, value) {
    const next = Object.assign({}, draft, { [field]: value });
    const declared = (descriptor.fields || []).find(function(candidate) { return candidate.key === field; });
    if (!declared || defaults[field] === undefined) return next;
    const dependents = (descriptor.dependents || {})[field] || [];
    if (!same(declared, value, defaults[field])) {
        for (const dependent of dependents) {
            if (draft[dependent] === defaults[dependent]) next[dependent] = "";
        }
    } else {
        for (const dependent of dependents) {
            if (draft[dependent] === "" && defaults[dependent] !== undefined) next[dependent] = defaults[dependent];
        }
    }
    return next;
}
