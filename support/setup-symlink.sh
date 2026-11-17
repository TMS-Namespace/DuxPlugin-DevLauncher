#!/usr/bin/env bash
# setup-symlink.sh - Link Dev Launcher into the Dux Shell plugin directory.
set -euo pipefail
plugin_directory="${XDG_CONFIG_HOME:-$HOME/.config}/dms/plugins"
source_directory="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$plugin_directory"
ln -sfn "$source_directory" "$plugin_directory/DevLauncherPlugin"
echo "Linked Dev Launcher at $plugin_directory/DevLauncherPlugin"
