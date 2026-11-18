// InstallationType.js - The supported installation type identifiers and their UI labels.
.pragma library
// Rules: Pure value domain: no QML types, no logging, no throwing; unknown values give false or an empty label.
var Native = "native";
var Flatpak = "flatpak";
var Snap = "snap";
var values = Object.freeze([Native, Flatpak, Snap]);
// Return true when the value is one of the supported installation types.
function isValid(value) { return values.indexOf(value) >= 0; }
// Return the user-facing label for an installation type, or an empty string for an unknown type.
function label(value) { return value === Native ? "Native package" : value === Flatpak ? "Flatpak" : value === Snap ? "Snap" : ""; }
