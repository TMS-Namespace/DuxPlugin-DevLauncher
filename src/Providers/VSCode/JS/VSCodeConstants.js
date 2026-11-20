// VSCodeConstants.js - VS Code storage keys, source names, and history limit.
.pragma library
// Rules: Constants only: no logic, no QML types, no logging.
var PROVIDER_TYPE = "vscode";
var RECENT_KEY = "history.recentlyOpenedPathsList";
var JSON_KEY = "openedPathsList";
var MAX_PER_LIST = 500;
// VS Code keeps no launch dates. Each entry is dated the previous entry's date less (LAUNCH_DECAY_BASE ^ order_index) hours, starting from the most recent entry (order_index 0).
var HOUR_MILLISECONDS = 60 * 60 * 1000;
var LAUNCH_DECAY_BASE = 1.13;
// Each step's deduction never exceeds ten days, so one step moves an entry back by at most that much.
var LAUNCH_MAX_DEDUCTION_HOURS = 24 * 10;
// Largest JSON history file read in one pass; a larger file is refused rather than read whole.
var MAX_HISTORY_BYTES = 8 * 1024 * 1024;
// The reader abandons a read whose process never answers, so one stuck process cannot block later reads.
var READ_WATCHDOG_MILLISECONDS = 10000;
var MAX_DIAGNOSTIC_CHARACTERS = 256;
var DEFAULT_NAME = "VS Code";
var DEFAULT_PROVIDER_ID = "6a54e4b5-6173-46bf-8bd1-8f3960905460";
var DEFAULT_CONFIG_DIRECTORY = "~/.config/Code";
var DEFAULT_SHARED_STORAGE_DIRECTORY = "~/.vscode-shared";
var DEFAULT_EXECUTABLE = "code";
var SHARED_NAMES = Object.freeze({ Code: "vscode", "Code - Insiders": "vscode-insiders" });
var FLATPAK_ID = "com.visualstudio.code";
var FLATPAK_CONFIG_DIRECTORY = "~/.var/app/com.visualstudio.code/config/Code";
var FLATPAK_SHARED_DIRECTORY = "~/.var/app/com.visualstudio.code/.vscode-shared";
var SNAP_NAME = "code";
var SNAP_EXECUTABLE = "/usr/bin/snap";
