// VSCodeConstants.js - VS Code storage keys, source names, and history limit.
.pragma library
var PROVIDER_TYPE = "vscode";
var RECENT_KEY = "history.recentlyOpenedPathsList";
var JSON_KEY = "openedPathsList";
var MAX_PER_LIST = 500;
// Largest JSON history file read in one pass; a larger file is refused rather than read whole.
var MAX_HISTORY_BYTES = 8 * 1024 * 1024;
var HISTORY_READ_TIMEOUT = "4s";
// The reader abandons a read whose process never answers, so one stuck process cannot block later reads.
var READ_WATCHDOG_MILLISECONDS = 10000;
var MAX_DIAGNOSTIC_CHARACTERS = 256;
var DEFAULT_NAME = "VS Code";
var DEFAULT_PROVIDER_ID = "6a54e4b5-6173-46bf-8bd1-8f3960905460";
var DEFAULT_CONFIG_DIRECTORY = "~/.config/Code";
var DEFAULT_SHARED_STORAGE_DIRECTORY = "~/.vscode-shared";
var DEFAULT_EXECUTABLE = "code";
var SHARED_NAMES = Object.freeze({ "Code": "vscode", "Code - Insiders": "vscode-insiders" });
