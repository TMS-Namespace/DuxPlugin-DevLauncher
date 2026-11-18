// Config.js - User-facing defaults and fixed resource limits.
.pragma library
var pluginId = "devLauncher";
var trigger = "`";
var folders = [];
var defaultResultsLimit = 100;
var searchPaths = false;
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
