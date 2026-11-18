// TriggerRules.js - Check launcher prefix characters and active Dux trigger ownership.
.pragma library

// Return a friendly reason when a trigger cannot be used by this plugin.
function error(value, pluginId, pluginOwners, builtInOwners) {
    const trigger = typeof value === "string" ? value : "";
    const characters = Array.from(trigger);
    // QML's JavaScript engine does not recognize Unicode numeric property escapes.
    if (characters.length < 1 || characters.length > 5 || characters.some(function(character) {
        const first = character.charCodeAt(0);
        const second = character.length > 1 ? character.charCodeAt(1) : 0;
        const code = first >= 0xd800 && first <= 0xdbff && second >= 0xdc00 && second <= 0xdfff
            ? 0x10000 + (first - 0xd800) * 0x400 + second - 0xdc00 : first;
        return code <= 32 || code >= 0x7f && code <= 0xa0 || code === 0x1680
            || code >= 0x2000 && code <= 0x200f || code >= 0x2028 && code <= 0x202f
            || code >= 0x205f && code <= 0x206f || code === 0x3000 || code === 0xfeff
            || code >= 48 && code <= 57 || code >= 0x660 && code <= 0x669
            || code >= 0x6f0 && code <= 0x6f9 || code >= 0x966 && code <= 0x96f
            || code === 0xb2 || code === 0xb3 || code === 0xb9 || code >= 0xbc && code <= 0xbe
            || code >= 0x2150 && code <= 0x2189 || code >= 0x2460 && code <= 0x24ff
            || code >= 0xff10 && code <= 0xff19 || code >= 0x1d7ce && code <= 0x1d7ff;
    })) return "Use 1 to 5 letters or symbols, with no numbers or spaces.";
    const pluginOwner = (pluginOwners || {})[trigger];
    if (pluginOwner && pluginOwner !== pluginId) return "This trigger is already used by another launcher plugin.";
    if ((builtInOwners || {})[trigger]) return "This trigger is already used by a built-in launcher plugin.";
    return "";
}
