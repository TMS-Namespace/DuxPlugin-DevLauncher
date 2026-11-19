// DraftRules.js - Apply one edit to an IDE draft using only the provider's declared field rules.
.pragma library
// Rules: Pure draft edits: returns new objects and never changes the draft it receives; no QML types or logging.

// Return the draft with its alias trimmed. Validation, duplicate checks, and saving all use this one form.
function normalize(draft) {
    return Object.assign({}, draft, { name: String(draft.name || "").trim() });
}

// Match aliases the same way the launcher's @IDE selector does.
function aliasKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
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
    const declared = (descriptor.fields || []).find(function (candidate) {
        return candidate.key === field;
    });
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

// Switch providers with their own defaults while preserving the installation identity, any custom alias, and any custom icon.
function switchProvider(draft, previousDefaults, nextDefaults, providers, editIndex) {
    if (!nextDefaults.type || nextDefaults.type === draft.type) return draft;
    const previousName = String(previousDefaults.name || "");
    const currentName = String(draft.name || "");
    const generatedName =
        currentName === previousName ||
        (currentName.startsWith(previousName + " ") && /^\d+$/.test(currentName.slice(previousName.length + 1)));
    let name = generatedName || !currentName ? nextDefaults.name : currentName;
    const baseName = name;
    let suffix = 2;
    while (
        (providers || []).some(function (provider, index) {
            return index !== editIndex && aliasKey(provider.name) === aliasKey(name);
        })
    )
        name = baseName + " " + suffix++;
    // A custom icon is the user's own choice, so it survives the change; every other provider-specific field takes the new defaults.
    return Object.assign(
        {},
        nextDefaults,
        { id: draft.id, name: name },
        draft.iconPath ? { iconPath: draft.iconPath } : {}
    );
}

// Apply the selected provider-declared installation defaults without changing the installation ID or alias.
function switchInstallation(draft, installations, selected) {
    const choice = (installations || []).find(function (installation) {
        return installation.type === selected;
    });
    if (!choice || draft.installationType === selected) return draft;
    const next = Object.assign({}, draft, { installationType: selected, executable: choice.executable });
    if (choice.config !== undefined) next.config = choice.config;
    if (choice.shared !== undefined) next.shared = choice.shared;
    return next;
}
