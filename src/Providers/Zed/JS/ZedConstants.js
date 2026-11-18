// ZedConstants.js - Zed provider defaults and history limits.
.pragma library
// Rules: Constants only: no logic, no QML types, no logging.
var PROVIDER_TYPE = "zed";
var DEFAULT_NAME = "Zed";
var DEFAULT_PROVIDER_ID = "48ff4331-c992-41fd-b8bd-d9121cb9fa01";
var DEFAULT_EXECUTABLE = "/usr/bin/flatpak";
var DEFAULT_DATA_DIRECTORY = "~/.var/app/dev.zed.Zed/data/zed";
var FLATPAK_ID = "dev.zed.Zed";
var HISTORY_PATH = "/db/0-stable/db.sqlite";
var MAX_HISTORY_ROWS = 500;
var CHECK_TIMEOUT = "4s";
var NATIVE_EXECUTABLE = "zed";
var NATIVE_DATA_DIRECTORY = "~/.local/share/zed";
var SNAP_NAME = "zed";
var SNAP_EXECUTABLE = "/usr/bin/snap";
