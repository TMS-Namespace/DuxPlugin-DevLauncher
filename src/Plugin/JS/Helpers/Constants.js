// Constants.js - Fixed plugin values: defaults that settings start from, resource limits, timeouts, and sizes.
.pragma library
// Rules: Constants only: no logic, no QML types, no logging; defaults and limits are declared here.
var pluginId = "devLauncher";
var trigger = "`";
var folders = [];
var defaultResultsLimit = 100;
// The cache keeps this many times the number of results the user chose to see, so searches have room to filter.
var cachedResultsMultiplier = 10;
var searchPaths = false;
var showBadges = true;
var defaultAgeFilter = Object.freeze({ value: 3, unit: "months" });
var minAgeFilterValue = 1;
var maxAgeFilterValue = 9999;
var resultLimitOptions = [25, 50, 100, 150, 200];
var maxResults = 200;
var maxUsageEntries = 2000;
var maxScanFolders = 20;
var maxProviders = 12;
var maxRepositories = 500;
var defaultRepositoryDepth = 3;
var minRepositoryDepth = 1;
var maxRepositoryDepth = 20;
var repositoryScanTimeout = "15s";
// Modification times are read in batches of this many paths, each batch with its own timeout.
var statBatchSize = 200;
var statBatchTimeout = "10s";
// The environment of the scan and stat processes: LC_ALL=C keeps their diagnostics in English, so missing paths can be recognised.
var commandEnvironment = { LC_ALL: "C" };
// The refresher abandons a stat batch that has not answered by then; the batch itself is already bounded by its timeout.
var statBatchWatchdogMilliseconds = 12000;
// An item's approximate date is recomputed after this much time, so a scan does not repeat the date work for every item.
var redateMilliseconds = 60000;
var providerValidationTimeout = "4s";
var providerValidationDebounceMilliseconds = 350;
var maxProviderValidationPaths = 32;
var maxAdditionalArguments = 32;
var maxAdditionalArgumentLength = 256;
var launcherInitialScore = 2000;
var settingsControlWidthFraction = 0.55;
var maxIconLookups = 4;
var maxIconQueue = maxResults;
var maxIconEntries = 500;
var maxMetadataEntries = 20000;
var maxSvgEntries = 256;
// The composed icons remembered for the launcher's visible results, each under its own key.
var maxIconMemoEntries = 512;
var maxSvgCharacters = 131072;
var iconCacheMilliseconds = 300000;
var iconLookupTimeoutMilliseconds = 3000;
var iconRefreshDebounceMilliseconds = 50;
var fileServiceReconnectMilliseconds = 500;
var maxFileServiceReconnectAttempts = 5;
var missingPathRetryMilliseconds = 60000;
var refreshMilliseconds = 10000;
var isDevMode = false;
var errorNotificationInterval = 30000;

// Badge sizes in pixels. A badge is bounded by the file and folder icon sizes that Dux provides and by what the launcher
// displays. The sizes are fixed so that up to four badges fit a 2x2 grid in the corners of the icon, with space left
// within the base icon so it stays visible. Every badge is pre-rendered and cached, so a size that changed per result
// would slow drawing and would need every cached badge to be rebuilt.
// Maximum number of IDE sources shown over one result icon.
var maxSourceBadges = 4;
var sourceBadgeSize = 28;
var sourceBadgeInset = 2;
var sourceBadgePadding = 1;
var sourceBadgeOpacity = 0.6;

// Bounds for user-visible IDE installation aliases.
var minIdeAliasLength = 3;
var maxIdeAliasLength = 20;

// Bound the mount-table read performed as part of each requested scan.
var mountScanMilliseconds = 3000;
