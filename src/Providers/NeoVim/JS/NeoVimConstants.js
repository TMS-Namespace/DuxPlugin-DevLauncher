// NeoVimConstants.js - NeoVim provider defaults, the ShaDa file layout, the program each installation starts, and read limits.
.pragma library
// Rules: Constants only: no logic, no QML types, no logging.
var PROVIDER_TYPE = "neovim";
var DEFAULT_NAME = "NeoVim";
var DEFAULT_PROVIDER_ID = "2ec31f6d-69ef-426e-b640-44cef0b5a640";
var DEFAULT_STATE_DIRECTORY = "~/.local/state/nvim";
// The terminal command has no default: the user enters the terminal they want, with the switch that runs a command in it.
var TERMINAL_PLACEHOLDER = "ghostty -e";
// NeoVim writes its ShaDa history to this file under the state folder.
var SHADA_PATH = "/shada/main.shada";
// ShaDa item types 7 (global file mark) and 10 (local file mark). NeoVim builds v:oldfiles from these entries.
var FILE_MARK_TYPES = Object.freeze([7, 10]);
// Largest ShaDa file read in one pass; a larger file is refused rather than read whole.
var MAX_SHADA_BYTES = 4 * 1024 * 1024;
var MAX_PER_LIST = 500;
var READ_TIMEOUT = "4s";
// The reader abandons a read whose process never answers, so one stuck process cannot block later reads.
var READ_WATCHDOG_MILLISECONDS = 10000;
var MAX_DIAGNOSTIC_CHARACTERS = 256;
// The program started inside the terminal for each installation type: native NeoVim, or the Flatpak and Snap launchers.
var NATIVE_PROGRAM = "nvim";
var FLATPAK_PROGRAM = "flatpak";
var FLATPAK_ID = "io.neovim.nvim";
var FLATPAK_DESKTOP_ID = "io.neovim.nvim";
var FLATPAK_STATE_DIRECTORY = "~/.var/app/io.neovim.nvim/.local/state/nvim";
var SNAP_PROGRAM = "snap";
var SNAP_NAME = "nvim";
var SNAP_DESKTOP_ID = "nvim_nvim";
