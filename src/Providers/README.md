# Provider guidance

Each provider owns its `JS/` and `QML/` implementation and exposes its integration through the shared provider contracts. Follow [Code Requirements](../../docs/code_requirements.md) and mirror the provider's structure in the tests.

- Report recent files, folders, and workspaces with their path or URI, kind, provider identity, and opening date when available. The plugin combines and deduplicates results from all providers.
- For remote history, construct a path or URI that the reporting IDE can open. Omit a remote entry if its connection details cannot be reconstructed into a launchable target. For example, Zed SSH history uses `ssh://` URIs; an unsupported connection must not be represented by a made-up launch URI.
- Implement launching and installation-specific commands inside the provider, including user-supplied arguments. Pass paths and switches as separate arguments.
- The plugin classifies entries as local, mounted share, or remote. It checks local and mounted-share paths for existence and modification dates. If a share has no usable modification date, it uses the provider's date. It does not probe remote hosts or their modification dates.
- A remote result may be launched only by an IDE configuration that reported it. The plugin applies this rule to the default launch, search overrides, and result actions. Local and mounted-share results can be opened with any configured IDE.
- Keep history reads non-mutating. SQLite readers must enable query-only mode before attaching and querying an IDE database. Qt LocalStorage's query-only mode prevents writes but does not guarantee that the underlying attachment was opened read-only.
- Add tests for history parsing, launch arguments, installation types, remote target reconstruction, and unsupported remote entries.
- VS Code keeps no launch dates, but it reorders its recent list when an item is opened again, so the list order is its recency signal. The provider estimates dates from that order: the most recent entry takes the history file's time, and each later entry is dated earlier by `min(10 days, 1.13^order_index)` hours from the entry before it. These estimates only keep the order. They are not real opening times, so age filters can hide an item that was opened recently. This is accepted; do not change the estimate without a new decision.
- Zed and NeoVim: the NeoVim terminal command must include the terminal's switch that runs a command (for example `-e`). The plugin cannot confirm it without opening a window, so it is the user's responsibility; the field description says so.
