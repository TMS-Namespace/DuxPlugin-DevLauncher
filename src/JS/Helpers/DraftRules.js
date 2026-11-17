// DraftRules.js - Apply one edit to an IDE draft using only the provider's declared field rules.
.pragma library

// Compare two values the way a field declares: the whole value, or only the file name for an executable.
function same(field, left, right) {
    if (field.comparison === "basename") return String(left).split("/").pop() === String(right).split("/").pop();
    return left === right;
}

// Return the next draft. When a field moves away from its default, each declared dependent that still holds its default is cleared.
function applyEdit(draft, defaults, descriptor, field, value) {
    const next = Object.assign({}, draft, { [field]: value });
    const declared = (descriptor.fields || []).find(function(candidate) { return candidate.key === field; });
    const movedAwayFromDefault = !!declared && defaults[field] !== undefined && !same(declared, value, defaults[field]);
    const dependents = (descriptor.dependents || {})[field] || [];
    if (movedAwayFromDefault) {
        for (const dependent of dependents) {
            if (draft[dependent] === defaults[dependent]) next[dependent] = "";
        }
    }
    return next;
}
