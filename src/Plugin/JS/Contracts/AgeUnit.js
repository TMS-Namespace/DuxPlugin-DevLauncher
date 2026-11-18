// AgeUnit.js - Name the supported calendar units for result age filtering.
.pragma library
var Days = "days";
var Weeks = "weeks";
var Months = "months";
var Years = "years";
var values = Object.freeze([Days, Weeks, Months, Years]);

// Accept only units offered by the settings dropdown.
function isValid(value) { return values.indexOf(value) >= 0; }
function label(value) { return isValid(value) ? value.charAt(0).toUpperCase() + value.slice(1) : ""; }
