# Dev Launcher Plugin for Dux Shell

A [Dux Shell](https://github.com/duxlabs-dev/dux-shell) launcher plugin that finds local Git repositories and recently opened IDE files, folders, and workspaces, and lets you quickly locate them or open them in the IDE you choose.

## Main Features

- **Repository discovery** - scan one or more configured folders for cloned Git repositories and worktrees.
- **Recent IDE items** - show recent files, folders, and workspaces from configured IDE installations.
- **Multiple IDE installations** - add or remove each IDE in settings, select a supported Native, Flatpak, or Snap installation, and choose its executable and data folder with Dux's file browser.
- **Multiple IDE badges** - a shared result shows up to four reporting IDE icons, while keeping one deduplicated result.
- **Open with any IDE** - type `@ProviderName` in the launcher search to choose which configured IDE opens a result.
- **Result actions** - use Tab or the result context menu to open it with any configured IDE alias, use the system default, open the folder itself or a file's containing folder, copy its path, or view its sources and dates.
- **Unified results** - one cached entry per path, kept ordered by date, then launch count. Searching filters that order; it never re-sorts. A launch from this plugin becomes the latest known use and the IDE that opened it is remembered.
- **Configurable result count** - search every discovered item, then show 25, 50, 100, 150, or 200 matches (100 by default).
- **Result age limit** - filter by the earlier of the path modification date and provider history date, using a Dux number stepper and days, weeks, months, or years; the default is 3 months.
- **Themed result icons** - use Dux file metadata for system file and folder icons, share file icons by extension in memory, and add corner markers for Git repositories and IDE history.
- **Result age** - show the path and a compact age, such as `2h ago` or `2w ago`, from the same effective date used for sorting and filtering. Month labels use calendar months.
- **Quick search** - type the default trigger `` ` `` and search item names; an optional Global setting also searches full paths. Custom triggers use 1 to 5 letters or symbols and cannot duplicate another active Dux launcher trigger.

## Requirements

- `Dux Shell (DMS)` ≥ 2.0.0, running on `Qt` ≥ 6.7.
- `find`, `timeout`, `env`, `stat`, `cat`, `head`, `which`, `test`, and `xdg-open` available in `$PATH`, plus Qt Quick LocalStorage. The plugin has no Python, Node.js, or `sqlite3` command runtime dependency.
- A configured IDE executable to open results in an IDE. Without one, results open through the desktop's default file association.
- Optional: one or more local folders containing Git repositories.

## Data Providers

Currently supported provider types:

- **Rider** - reads recent solutions and projects from `Rider*/options/recentSolutions.xml` under the configured JetBrains folder (normally `~/.config/JetBrains`). Native and Snap installations are supported.
- **Zed** - reads workspace and editor history from `db/0-stable/db.sqlite` under the configured data folder. The default folder is `~/.var/app/dev.zed.Zed/data/zed` for Flatpak; the native default is `~/.local/share/zed`.
- **VS Code compatible** - reads recent files, folders, and workspaces from the first usable source: `<shared folder>/sharedStorage/state.vscdb`, `<data folder>/User/globalStorage/state.vscdb`, or `<data folder>/User/globalStorage/storage.json`. The conventional folders are `~/.vscode-shared` and `~/.config/Code`.

Each configured installation gets its own `ProviderHandler` facade. Scanned folders are a second, folder-only source: it runs `find` for Git repositories, cannot open items, and uses the same provider contract. The `ProvidersManager` registers the VS Code provider's `Api`, `Properties`, and `Constants` modules in `src/JS/Providers/VSCode/`, plus its `VSCodeRecents` reader in `src/QML/Providers/VSCode/`. The provider owns its history paths, SQLite and JSON reads, parsing, launch arguments, and validation. The rest of the plugin asks the facade for normalized recent items. A failed installation does not stop the others.

The host creates `ScanOrchestrator` as the daemon entry point. When the launcher requests discovery, it asks each configured source for recents, deduplicates their answers, checks stale modification times and missing paths, and publishes one ordered snapshot. Git folder discovery uses the same provider contract as IDE history.

Discovery starts only when `getItems()` receives an initial or changed query and the last completed scan is older than 10 seconds. Requests are throttled to one per 10 seconds, and an in-flight scan is shared. There is no startup scan, periodic scan, or deferred date retry. Settings changes mark discovery stale for the next search. Repeated calls with the same query read the cache and cannot start discovery or refresh expired metadata. A scan already in progress finishes its bounded source and date checks, then updates the open search once; icons can finish loading separately. Newly discovered items appear in the current session.

Settings are grouped into Global settings, Scanning folders with Git repositories, and IDEs, and start collapsed. Global settings contain the backtick trigger, a result count dropdown, an age control, a name-or-path search toggle, and a default IDE dropdown, including **System default**. The trigger field and age unit dropdown match the default IDE dropdown's width. Path matching is off by default. The repository depth slider appears above the folder list, ranges from 1 to 20, and defaults to 3; its current value is shown directly above the slider. Use **Add folder** to select scan roots and the close button on a row to remove one. Duplicate folders and folders already covered by a selected scan root are rejected with an explanation. Use **Add IDE** to choose an IDE type from a dropdown, an alias, and an executable. The IDE list shows each name and executable icon; edit an IDE to see its full paths. Removing an IDE requires confirmation. Each installation keeps a stable internal ID independent of its alias. Additional command arguments are in their own section. Text fields validate when editing finishes or Save is pressed. Errors appear below the related field. Save checks an unverified draft and persists it only after the provider's executable, declared folders, readable history files, and local recent items pass validation. The editor resolves executable names to full paths, and VS Code also probes added switches with its CLI. Configurations of the same IDE type cannot reuse an executable or data path. A name such as **VS Code** can be selected in search with `@VSCode`. Each scanned folder is its own entry with a generated identity and lists up to 500 repositories; a folder with more shows that limit as its error. Scan errors of a folder or IDE appear on its own row, and a toast is shown only for a folder added since the last scan.

The Global settings age control accepts a positive number and a unit on one row. The limit uses the earlier of the file or folder modification time supplied by Dux and the provider's history date. Items with no known date remain visible.

Settings are written through Dux's settings store without triggering a launcher plugin reload for every value change, so expanded groups stay open without collapsing and reopening.

VS Code history stores order rather than an exact timestamp for each item. Its provider returns the history database's modification time as an upper bound on when each recorded item was opened. Dev Launcher shows the earlier of that bound and the path's modification time as its approximate age. **Limitation:** VS Code does not record when each item was opened, so an item's age, its age-filter date, and its date ordering are approximate. Ranking uses the history order and counts launches made through this plugin. The provider checks [shared application storage](https://github.com/microsoft/vscode/blob/main/src/vs/platform/workspaces/electron-main/workspacesHistoryMainService.ts), followed by older SQLite and JSON locations.

Dux displays result actions in its Tab action row and context menu. In the current Dux launcher, Shift+Tab moves backward through actions. The **Details** action opens a stacked Dux modal with the full path, all discovered sources, the actual file modification time when Dux can read it, the provider history date, and the approximate recent-use time.

IDE history items use the actual desktop icon associated with each configured executable as a badge over their file, folder, or workspace icon. The icon is matched through the system's desktop entries and cached by executable. IDE and Git badges sit on translucent rounded squares; their light or dark shade is chosen from the base SVG icon when its color is available. A workspace whose themed icon is unavailable uses a generic document icon beneath the badge. An executable without a matching desktop entry keeps its ordinary icon. A repository found in IDE history shows its IDE badges and the Git branch marker. The Git marker uses the next free corner; when four IDE badges occupy all corners, the Git marker fits along the bottom edge.

`FileMetadataService` verifies paths and caches file metadata. The separate `ResultItemIcon` component owns executable icon lookup, SVG loading, and badge composition, so launcher results need only request an icon descriptor.

## Privacy

- All scans and launches are local. The plugin makes no network requests.
- Dux's local file service verifies displayed paths and supplies their icons. Confirmed missing paths leave the results; file icons are cached by extension for a bounded time.
- IDE history databases are queried through Qt Quick LocalStorage with SQLite query-only mode. Remote URI entries are skipped.
- The configured folders and IDEs, plus bounded launch counts, are stored in Dux plugin settings.
- Paths and executables are passed as separate process arguments, without a shell command string.
- Set `isDevMode` in `src/JS/Helpers/Config.js` to `true` during development to log scan decisions and failures. The default is `false`.
- Repository scan errors are logged in development mode on every scan, and a user notification is shown only when a newly added folder fails.

## Version History

- v1.0.0 :
    - Rider provider with Native and Snap launchers, versioned recent-solution discovery, and provider-specific validation. The launcher’s primary action is labeled Launch.
    - Repository Git badges use a free icon corner at the same size as IDE badges.
    - Provider-declared native, Flatpak, and Snap installation settings, and up to four source IDE badges per result.
    - Audited Unicode and special-character paths: NUL-delimited modification dates, preserved whitespace, locale-independent scan diagnostics, and native process/SQLite regression coverage.
    - Missing history paths containing non-ASCII names are removed correctly, including network-share paths; their database date no longer makes them appear recently used.
    - On-demand discovery and date checks publish one snapshot; idle redraws reuse cached results without starting more scans or metadata retries.
    - Result ages match cached ranking dates, cleared IDE history removes cached items, and unreadable paths survive metadata failures.
    - Initial Dev Launcher with repository discovery and a VS Code compatible provider.
    - Collapsed settings groups with folder and executable pickers, editable IDEs, a default IDE, the backtick trigger, and scanned folders.
    - Deduplicated, recency-ranked launcher results and an `@ProviderName` IDE override.
    - Dux-themed file and folder icons, shared by extension for files, with a branch badge for repositories.
    - A result count dropdown with 25, 50, 100, 150, and 200 choices, defaulting to 100, with searches across the full discovered history.
    - Per-result IDE, system opener, containing-folder, and details actions; a Dux details modal; and inline labels beside provider fields.
    - Open settings groups survive Dux plugin reloads, and configured executable paths display in full.
    - Per-path existence checks that remove confirmed missing results while sharing icons by file type.
    - Executable desktop icons on IDE history items, a longer repository scan deadline, and scan errors that identify the folder path.
    - Cleaner executable badges without a circle, modification age in result descriptions, and settings saves that avoid the launcher reload flicker.
    - Path-only result descriptions and a generic document fallback that preserves IDE badges on workspaces.
    - Discovery begins on a launcher query and updates the active search when the complete snapshot is ready.
    - Ten-second stale-search refresh interval and named scan, validation, icon, and retry limits.
    - A modification age filter in Global settings, defaulting to three months, with days, weeks, months, and years as units.
    - IDE providers return a history date; result ages and age filtering use the earlier of that date and the path modification date.
    - Dux age stepper and unit dropdown, a configurable repository scan depth, and themed folder and IDE list rows.
    - Right-aligned age controls, a scan-depth value above its slider, one-time notifications for newly added scan folders, and contrasting rounded badge backgrounds.
    - Scan depth value above the slider, a dedicated command arguments section, borderless badge backgrounds, and a name-only search default with an optional full-path toggle.
    - Centered tonal add buttons, group icons, nested folder checks, and stable IDs for separate IDE installations.
    - Provider-agnostic draft validation before Save, duplicate installation path checks, and full executable paths in the IDE editor.
    - Larger icons inside settings headers, a Git-style plugin icon, trigger conflict checks, and provider-tested additional command arguments.

## Install

### Method 1

In Dux Shell:

1. Open `Settings -> Plugins`.
2. Click `Scan for Plugins`.
3. Enable `Dev Launcher`.
4. Open its settings, add repository folders, and add or edit IDE installations.

### Method 2

Or clone this repository and run (this adds a symlink to the plugin folder):

```bash
chmod +x support/setup-symlink.sh
support/setup-symlink.sh
```

Then scan for plugins and enable `Dev Launcher` in Dux Shell.

## Disclaimers

- The developer has no affiliation with any IDE vendor.
- This plugin was developed with AI assistance under the developer's supervision.

## Contributions

Feel free to submit a PR, and please follow [Code Requirements](docs/code_requirements.md).

Run `node audit/Lint.js` and `node tests/RunAll.js` from the repository root. Lint requires Qt 6 `qmllint`; set `QMLLINT` if it is outside the standard Qt 6 installation paths. It checks warnings using temporary Dux stand-ins and Quickshell metadata, including a local declaration for a missing process enum when needed. Node.js and Python's standard-library SQLite module are used only for development checks and test fixtures. `tests/Unit/JS/` mirrors the pure source modules, while `tests/Integration/QML/` groups real QML checks by settings, launcher, provider, service, and worker. The harness entry points supply isolated Dux stand-ins and test data. The suite covers provider parsing, repository discovery, provider-specific launch arguments, Qt's SQLite history reader, and the QML entry points in a headless Quickshell process. The architecture audit checks provider isolation and QML registrations, and the host module audit checks stand-in locations against an installed Dux source tree when available.

Run `node tests/RunAll.js --live` to check the current VS Code shared-history database. Set `DEV_LAUNCHER_LIVE_HISTORY` if it is stored elsewhere.
