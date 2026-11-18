// LocalGitConstants.js - Names and fixed values of the local Git folder source.
.pragma library
var PROVIDER_TYPE = "localgit";
var DEFAULT_NAME = "Git folder";
// The executable is a formal value: the source runs find, and the plugin never launches it for items.
var EXECUTABLE = "find";
var VERSION_ARGUMENT = "--version";
// The reader abandons a find that has not answered by then; the find itself is already bounded by its timeout.
var READ_WATCHDOG_MILLISECONDS = 20000;
