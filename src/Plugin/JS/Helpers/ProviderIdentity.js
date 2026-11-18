// ProviderIdentity.js - Create and check stable identifiers for configured IDE installations.
.pragma library
.import "../Contracts/PluginError.js" as PluginError

var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Check the stored UUID format without relying on the installation's display name.
function valid(value) { return typeof value === "string" && UUID_PATTERN.test(value); }

// Give a new installation a unique version 4 UUID.
function create(existingIds) {
    const used = existingIds || [];
    for (let attempt = 0; attempt < 8; attempt++) {
        const digits = [];
        for (let index = 0; index < 32; index++) digits.push(Math.floor(Math.random() * 16).toString(16));
        digits[12] = "4";
        digits[16] = ((parseInt(digits[16], 16) & 3) | 8).toString(16);
        const value = digits.slice(0, 8).join("") + "-" + digits.slice(8, 12).join("") + "-" + digits.slice(12, 16).join("") + "-" + digits.slice(16, 20).join("") + "-" + digits.slice(20).join("");
        if (!used.includes(value)) return value;
    }
    throw new PluginError.PluginError(PluginError.Code.PROVIDER_CONFIG, "Could not create a unique IDE identifier. Try again.", "UUID collision");
}
