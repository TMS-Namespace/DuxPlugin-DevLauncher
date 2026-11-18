// RiderConstants.js - Rider installation defaults and bounded history limits.
.pragma library
// Rules: Constants only: no logic, no QML types, no logging.
var PROVIDER_TYPE = "rider";
var DEFAULT_NAME = "Rider";
var DEFAULT_PROVIDER_ID = "3966a8ed-d323-4e6c-8863-8b9522673f59";
var DEFAULT_EXECUTABLE = "rider";
var DEFAULT_CONFIG_DIRECTORY = "~/.config/JetBrains";
var SNAP_EXECUTABLE = "/usr/bin/snap";
var SNAP_NAME = "rider";
var MAX_HISTORY_BYTES = 8388608;
var MAX_HISTORY_FILES = 20;
var CONFIG_SCAN_DEPTH = 3;
var MAX_HISTORY_ENTRIES = 2000;
var READ_TIMEOUT = "5s";
var READ_WATCHDOG_MILLISECONDS = 7000;
