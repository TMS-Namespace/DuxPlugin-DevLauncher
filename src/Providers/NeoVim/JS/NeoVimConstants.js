// NeoVimConstants.js - NeoVim provider defaults, ShaDa file layout, read limits, and supported terminal emulators.
.pragma library
// Rules: Constants only: no logic, no QML types, no logging.
var PROVIDER_TYPE = "neovim";
var DEFAULT_NAME = "NeoVim";
var DEFAULT_PROVIDER_ID = "2ec31f6d-69ef-426e-b640-44cef0b5a640";
var DEFAULT_EXECUTABLE = "nvim";
var DEFAULT_STATE_DIRECTORY = "~/.local/state/nvim";
// Flatpak runs NeoVim inside its own sandbox, so its state folder lives under the application's data folder.
var FLATPAK_ID = "io.neovim.nvim";
var FLATPAK_EXECUTABLE = "/usr/bin/flatpak";
var FLATPAK_STATE_DIRECTORY = "~/.var/app/io.neovim.nvim/.local/state/nvim";
var FLATPAK_DESKTOP_ID = "io.neovim.nvim";
// The Snap package is classic, so NeoVim keeps the normal home folder and its state folder.
var SNAP_NAME = "nvim";
var SNAP_EXECUTABLE = "/usr/bin/snap";
var SNAP_DESKTOP_ID = "nvim_nvim";
var DEFAULT_TERMINAL = "/usr/bin/ghostty";
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
// Each terminal emulator takes its command after a different switch; the list gives the switches placed before the command.
var TERMINAL_SWITCHES = Object.freeze({
    ghostty: Object.freeze(["-e"]),
    "gnome-terminal": Object.freeze(["--"]),
    "xfce4-terminal": Object.freeze(["-x"]),
    wezterm: Object.freeze(["start", "--"]),
    alacritty: Object.freeze(["-e"]),
    konsole: Object.freeze(["-e"]),
    xterm: Object.freeze(["-e"]),
    "x-terminal-emulator": Object.freeze(["-e"]),
    kitty: Object.freeze([]),
    foot: Object.freeze([])
});
