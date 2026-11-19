// SettingsController.qml - Own editable folder and IDE lists for one settings page.
// Rules: An IDE is saved only after its draft passes the provider check, and a check that finished after an edit is ignored.
import "../../JS/Helpers/AgeFilterRules.js" as AgeFilterRules
import "../../JS/Helpers/Config.js" as Config
import "../../JS/Helpers/ConfigurationRules.js" as ConfigurationRules
import "../../JS/Helpers/DraftRules.js" as DraftRules
import "../../JS/Helpers/ProviderIdentity.js" as ProviderIdentity
import "../../JS/Helpers/ProviderValidationRules.js" as ValidationRules
import "../../JS/Helpers/ResultRules.js" as ResultRules
import "../../JS/Helpers/ScanErrorRules.js" as ScanErrorRules
import "../../JS/Helpers/TriggerRules.js" as TriggerRules
import "../BackgroundWorkers"
import "../Services"
import QtQuick

// The controller for one settings page: it owns the folder and IDE lists, the draft being edited, and the validation state.
Item {
    id: root

    property var pluginService: null
    // The saved scan folders, each with its own identifier.
    property var folders: []
    // The saved IDE installations shown in the settings list.
    property var providers: []
    property string defaultProvider: ""
    property string trigger: Config.trigger
    property int resultsLimit: Config.defaultResultsLimit
    property bool searchPaths: Config.searchPaths
    property bool showBadges: Config.showBadges
    property int ageFilterValue: Config.defaultAgeFilter.value
    property string ageFilterUnit: Config.defaultAgeFilter.unit
    property int repositoryDepth: Config.defaultRepositoryDepth
    property var draft: ({
    })
    property int editIndex: -1
    property bool editorOpen: false
    // True while a provider check is running.
    property bool validating: validator.running
    property string validationError: ""
    property string validationField: ""
    property string folderError: ""
    // Latest scan errors per folder, published by the scan orchestrator. Shown in the folder list only, never as repeated toasts.
    // Latest error per IDE, published by the scan orchestrator and shown in that IDE's settings row only.
    property var providerErrors: []
    property string triggerError: ""
    // The temporary facade under check, released when the check ends.
    property var candidateHandler: null
    property bool verified: false
    // The fingerprint of the draft that last passed the check.
    property string verifiedKey: ""
    // Counts every edit, so a check started earlier can tell that it is stale.
    property int validationRevision: 0
    // The revision that the running check started with.
    property int activeValidationRevision: -1
    property bool validationRequested: false
    property bool saveRequested: false
    // True only when the draft passed its check and has not changed since.
    readonly property bool canSave: editorOpen && !validating && verified && validationError === "" && verifiedKey === ValidationRules.fingerprint(draft)
    // True when Save may be pressed; a check can still be needed before the save completes.
    readonly property bool canSubmit: editorOpen && !validating && validationError === ""

    // Expose validation feedback only to its owning editor field.
    function errorFor(field) {
        return validationField === field ? validationError : "";
    }

    // Release a temporary facade after a draft or comparison has been checked.
    function releaseHandler(handler) {
        if (!handler)
            return ;

        handler.properties.destroy();
        handler.destroy();
    }

    // Compare the provider-declared paths of this draft with configured installations.
    function duplicateError(candidate, configuration) {
        const current = {
            "type": configuration.type,
            "executable": configuration.executable,
            "paths": candidate.validationPaths()
        };
        for (let index = 0; index < providers.length; index++) {
            if (index === editIndex || providers[index].type !== configuration.type)
                continue;

            try {
                // Ask the provider facade which saved paths must remain unique.
                const reused = ValidationRules.duplicate(current, {
                    "type": providers[index].type,
                    "executable": providers[index].executable,
                    "paths": ProvidersManager.validationPaths(providers[index])
                });
                if (reused)
                    validationField = ValidationRules.duplicateField(reused, current.paths);

                if (reused === "IDE executable path" && current.executable !== providers[index].executable && (current.executable.indexOf("/") < 0 || providers[index].executable.indexOf("/") < 0))
                    return "The executable may match " + providers[index].name + ", which uses a command name. Select that IDE's full executable path first.";

                if (reused)
                    return reused + " is already used by " + providers[index].name + ". Choose a different path.";

            } catch (caughtError) {
                validationField = "type";
                Logger.error("settings", "Could not validate a saved IDE configuration: " + String(caughtError));
                return "Check or remove the invalid settings for " + (providers[index].name || "the existing IDE") + " before adding another installation of this IDE.";
            }
        }
        return "";
    }

    // Typing invalidates a previous check without scheduling a new one.
    function queueValidation() {
        validationTimer.stop();
        validationRequested = false;
        saveRequested = false;
        validationRevision++;
        verified = false;
        verifiedKey = "";
        validationError = "";
        validationField = "";
    }

    // Committed input or Save requests validation after the active edit has finished.
    function requestValidation() {
        if (!editorOpen || canSave)
            return ;

        validationRequested = true;
        if (!validating)
            validationTimer.restart();

    }

    // Picker selections and dropdown choices commit a value in a single action.
    function commitField(field, value) {
        edit(field, value);
        requestValidation();
    }

    // Ask one provider facade to prove its executable, paths, and history are usable.
    function validateDraft() {
        if (!editorOpen || validating)
            return ;

        validationRequested = false;
        const normalized = DraftRules.normalize(draft);
        if (providers.some(function(provider, index) {
            return index !== editIndex && DraftRules.aliasKey(provider.name) === DraftRules.aliasKey(normalized.name);
        })) {
            validationField = "name";
            validationError = "Each IDE needs a unique alias, ignoring spaces, hyphens, underscores and letter case.";
            return ;
        }
        let candidate = null;
        try {
            candidate = ProvidersManager.candidate(normalized);
            const conflict = duplicateError(candidate, normalized);
            if (conflict) {
                validationError = conflict;
                releaseHandler(candidate);
                return ;
            }
            candidateHandler = candidate;
            activeValidationRevision = validationRevision;
            validator.validate(candidate);
        } catch (caughtError) {
            candidateHandler = null;
            activeValidationRevision = -1;
            releaseHandler(candidate);
            Logger.error("settings", String(caughtError));
            validationField = caughtError.field || "";
            validationError = caughtError.userMessage || "Check the IDE settings.";
        }
    }

    // Load current-format lists after the host service is attached.
    function load() {
        if (!pluginService)
            return ;

        DataStorage.configure(pluginService);
        folders = ConfigurationRules.folderEntries(DataStorage.load("folders", Config.folders));
        providers = ConfigurationRules.providers(DataStorage.load("providers", ProvidersManager.defaultConfigurations()));
        defaultProvider = ConfigurationRules.defaultProvider(DataStorage.load("defaultProvider", ProvidersManager.defaultProviderId()), providers);
        trigger = DataStorage.load("trigger", Config.trigger);
        resultsLimit = ResultRules.limit(DataStorage.load("resultsLimit", Config.defaultResultsLimit));
        searchPaths = DataStorage.load("searchPaths", Config.searchPaths) === true;
        showBadges = DataStorage.load("showBadges", Config.showBadges) !== false;
        const ageSetting = AgeFilterRules.normalize(DataStorage.load("ageFilter", Config.defaultAgeFilter));
        ageFilterValue = ageSetting.value;
        ageFilterUnit = ageSetting.unit;
        repositoryDepth = ConfigurationRules.repositoryDepth(DataStorage.load("repositoryDepth", Config.defaultRepositoryDepth));
        refreshScanErrors();
    }

    // Save one key through the shared storage door.
    function saveValue(key, value) {
        const saved = DataStorage.save(key, value);
        if (!saved)
            ErrorHandler.report("settings", "Could not save this setting.");

        return saved;
    }

    // Add one selected folder after checking for duplicates and covered paths. Each folder becomes its own entry with its
    // own identifier, so its scan errors and its toast belong to that entry, not to its path.
    function addFolder(path) {
        const addition = ConfigurationRules.folderAddition(path, folders);
        folderError = addition.error;
        if (!addition.path)
            return false;

        const taken = providers.map(function(provider) {
            return provider.id;
        }).concat(folders.map(function(entry) {
            return entry.id;
        }));
        const entry = {
            "id": ProviderIdentity.create(taken),
            "type": ProvidersManager.folderTypeId(),
            "folder": addition.path
        };
        const next = folders.concat([entry]);
        if (!saveValue("folders", next))
            return false;

        folders = next;
        folderError = "";
        return true;
    }

    // Remove one selected scan folder.
    function removeFolder(index) {
        const next = folders.filter(function(folder, position) {
            return position !== index;
        });
        if (!saveValue("folders", next))
            return false;

        folders = next;
        folderError = "";
        return true;
    }

    // Read the latest scan errors of every source. Each folder and IDE row shows its own error, so a failing source is visible
    // in settings without a toast on every scan.
    function refreshScanErrors() {
        const publishedProviders = ScanState.providerErrors;
        providerErrors = Array.isArray(publishedProviders) ? publishedProviders : [];
    }

    // Return the latest scan error for one IDE, or "" when its last scan succeeded.
    function providerErrorFor(providerId) {
        return ScanErrorRules.forProvider(providerId, providerErrors);
    }

    // Create an IDE draft with provider-owned defaults.
    function beginAdd() {
        if (providers.length >= Config.maxProviders)
            return ;

        editIndex = -1;
        const defaults = ProvidersManager.defaultsFor(ProvidersManager.defaultTypeId());
        let name = defaults.name;
        let suffix = 2;
        while (providers.some(function(provider) {
            return DraftRules.aliasKey(provider.name) === DraftRules.aliasKey(name);
        }))name = defaults.name + " " + suffix++
        draft = Object.assign({
        }, defaults, {
            "id": ProviderIdentity.create(providers.map(function(provider) {
                return provider.id;
            })),
            "name": name
        });
        validationError = "";
        editorOpen = true;
        queueValidation();
    }

    // Copy an existing installation into the editor.
    function beginEdit(index) {
        if (index < 0 || index >= providers.length)
            return ;

        editIndex = index;
        const argumentsList = providers[index].extraArguments;
        draft = Object.assign({
        }, providers[index], {
            "extraArguments": Array.isArray(argumentsList) ? argumentsList.slice() : []
        });
        editorOpen = true;
        queueValidation();
        // Set the warning after queueValidation, which clears any previous message.
        validationField = Array.isArray(argumentsList) ? "" : "extraArguments";
        validationError = Array.isArray(argumentsList) ? "" : "Saved command arguments are invalid. Enter them again before saving.";
    }

    // Replace a draft field so QML bindings see the change.
    // The dependent-field rules come from the provider's declaration, not from this controller.
    function edit(field, value) {
        if (field === "installationType")
            draft = DraftRules.switchInstallation(draft, ProvidersManager.descriptorFor(draft.type).installations, value);
        else if (field === "type")
            draft = DraftRules.switchProvider(draft, ProvidersManager.defaultsFor(draft.type), ProvidersManager.defaultsFor(value), providers, editIndex);
        else
            draft = DraftRules.applyEdit(draft, ProvidersManager.defaultsFor(draft.type), ProvidersManager.descriptorFor(draft.type), field, value);
        queueValidation();
    }

    // The label, description, placeholder, and chooser title one provider declares for a field of the selected IDE type.
    function fieldFor(key) {
        const descriptor = ProvidersManager.descriptorFor(draft.type || "");
        return (descriptor.fields || []).find(function(declared) {
            return declared.key === key;
        }) || {
            "key": key,
            "kind": "",
            "label": "",
            "description": "",
            "placeholder": "",
            "chooserTitle": "",
            "comparison": "exact"
        };
    }

    // Keep each additional CLI argument as its own editable value.
    function addArgument() {
        edit("extraArguments", (draft.extraArguments || []).concat([""]));
    }

    // Replaces one additional argument in the draft and invalidates the previous check.
    function editArgument(index, value) {
        const next = (draft.extraArguments || []).slice();
        next[index] = value;
        edit("extraArguments", next);
    }

    // Removes one additional argument from the draft and asks for a new check.
    function removeArgument(index) {
        edit("extraArguments", (draft.extraArguments || []).filter(function(argument, position) {
            return position !== index;
        }));
        requestValidation();
    }

    // Persist only the exact draft already verified by the provider.
    function submit() {
        if (!canSave) {
            if (editorOpen && validationError === "") {
                saveRequested = true;
                requestValidation();
            }
            return false;
        }
        // Check and save the same trimmed alias that validation checked.
        const normalized = DraftRules.normalize(draft);
        let candidate = null;
        try {
            candidate = ProvidersManager.candidate(normalized);
            const conflict = duplicateError(candidate, normalized);
            if (conflict) {
                validationError = conflict;
                verified = false;
                return false;
            }
        } catch (caughtError) {
            Logger.error("settings", String(caughtError));
            validationField = caughtError.field || "";
            validationError = caughtError.userMessage || "Check the IDE settings.";
            verified = false;
            return false;
        } finally {
            releaseHandler(candidate);
        }
        const next = providers.slice();
        if (editIndex >= 0)
            next[editIndex] = normalized;
        else
            next.push(normalized);
        if (saveValue("providers", next)) {
            cancelEdit();
            providers = next;
            return true;
        }
        return false;
    }

    // Close the IDE editor without saving, forget which row it edited, and invalidate any check still running.
    function cancelEdit() {
        editIndex = -1;
        editorOpen = false;
        queueValidation();
    }

    // Keep a successful check only when no field changed while it was running.
    function acceptValidation(accepted, message, field) {
        const completedHandler = candidateHandler;
        candidateHandler = null;
        releaseHandler(completedHandler);
        if (activeValidationRevision !== validationRevision) {
            if (validationRequested)
                validationTimer.restart();

            return ;
        }
        if (!accepted || validationError) {
            if (!validationError) {
                validationField = field || "";
                validationError = message;
            }
            return ;
        }
        validationError = "";
        validationField = "";
        verifiedKey = ValidationRules.fingerprint(draft);
        verified = true;
        if (saveRequested) {
            saveRequested = false;
            submit();
        }
    }

    // Remove one IDE and choose a remaining default when necessary.
    function removeProvider(index) {
        const next = providers.filter(function(provider, position) {
            return position !== index;
        });
        if (!saveValue("providers", next))
            return false;

        const editedRowRemoved = editorOpen && editIndex === index;
        editIndex = ConfigurationRules.indexAfterRemoval(editIndex, index);
        // The edited IDE no longer exists, so its editor closes and any running check is invalidated.
        if (editedRowRemoved)
            cancelEdit();

        providers = next;
        if (!next.some(function(provider) {
            return provider.id === defaultProvider;
        }))
            setDefault("");

        return true;
    }

    // Persist the IDE used for repository entries.
    function setDefault(providerId) {
        if (!saveValue("defaultProvider", providerId))
            return false;

        defaultProvider = providerId;
        return true;
    }

    // Save a launcher prefix after the field loses focus.
    function setTrigger(value, pluginOwners, builtInOwners) {
        triggerError = TriggerRules.error(value, Config.pluginId, pluginOwners, builtInOwners);
        if (triggerError || !saveValue("trigger", value))
            return false;

        trigger = value;
        return true;
    }

    // Save only one of the counts offered by the settings dropdown.
    function setResultsLimit(value) {
        if (!ResultRules.valid(value))
            return false;

        const next = ResultRules.limit(value);
        if (!saveValue("resultsLimit", next))
            return false;

        resultsLimit = next;
        return true;
    }

    // Include parent folders in launcher matching only when the user enables it.
    function setSearchPaths(enabled) {
        if (typeof enabled !== "boolean" || !saveValue("searchPaths", enabled))
            return false;

        searchPaths = enabled;
        return true;
    }

    // Show or hide both IDE and Git badges on launcher result icons.
    function setShowBadges(enabled) {
        if (typeof enabled !== "boolean" || !saveValue("showBadges", enabled))
            return false;

        showBadges = enabled;
        return true;
    }

    // Save one valid numeric age amount while retaining the selected unit.
    function setAgeFilterValue(value) {
        const next = AgeFilterRules.normalize({
            "value": value,
            "unit": ageFilterUnit
        });
        if (String(next.value) !== String(value).trim())
            return false;

        if (!saveValue("ageFilter", next))
            return false;

        ageFilterValue = next.value;
        return true;
    }

    // Save one offered age unit while retaining the numeric amount.
    function setAgeFilterUnit(value) {
        const next = AgeFilterRules.normalize({
            "value": ageFilterValue,
            "unit": value
        });
        if (next.unit !== value)
            return false;

        if (!saveValue("ageFilter", next))
            return false;

        ageFilterUnit = next.unit;
        return true;
    }

    // Save one depth offered by the repository slider.
    function setRepositoryDepth(value) {
        const next = ConfigurationRules.repositoryDepth(value);
        if (next !== Number(value) || !saveValue("repositoryDepth", next))
            return false;

        repositoryDepth = next;
        return true;
    }

    // Loads the saved lists again when the plugin service is attached.
    onPluginServiceChanged: load()

    // Refreshes the scan errors when the scan publishes them.
    Connections {
        function onProviderErrorsChanged() {
            // A controller that was already destroyed may still receive the signal; it has nothing to refresh then.
            if (!root)
                return ;

            root.refreshScanErrors();
        }

        target: ScanState
    }

    // Waits for typing to pause before starting a check, so one check runs per pause.
    Timer {
        id: validationTimer

        interval: Config.providerValidationDebounceMilliseconds
        repeat: false
        onTriggered: root.validateDraft()
    }

    // The background checker that runs the executable and path tests for the draft.
    ProviderValidator {
        id: validator

        onFinished: function(accepted, message, field) {
            root.acceptValidation(accepted, message, field);
        }
        // Stores the resolved executable path in the draft and checks it for duplicates again.
        onResolvedExecutable: function(path) {
            if (root.activeValidationRevision !== root.validationRevision || !root.candidateHandler)
                return ;

            if (root.draft.executable !== path)
                root.draft = Object.assign({
            }, root.draft, {
                "executable": path
            });

            const conflict = root.duplicateError(root.candidateHandler, root.draft);
            if (conflict)
                root.validationError = conflict;

        }
    }

}
